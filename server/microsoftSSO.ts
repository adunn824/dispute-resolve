// Microsoft Azure AD SSO Authentication
// Implements OAuth 2.0 flow with Azure Active Directory

import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";
import passport from "passport";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import { storage } from "./storage";

// Extend Express session to include SSO-specific fields
declare module "express-session" {
  interface SessionData {
    ssoUsername?: string;
  }
}

// Azure AD endpoint configuration
const MICROSOFT_ISSUER = "https://login.microsoftonline.com";

// Memoized config to avoid repeated discovery calls
const getMicrosoftOidcConfig = memoize(
  async () => {
    const tenantId = process.env.MICROSOFT_TENANT_ID || "common";
    return await client.discovery(
      new URL(`${MICROSOFT_ISSUER}/${tenantId}/v2.0`),
      process.env.MICROSOFT_CLIENT_ID!
    );
  },
  { maxAge: 3600 * 1000 } // Cache for 1 hour
);

function updateMicrosoftSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
  user.provider = "microsoft";
}

async function linkOrCreateSsoUser(claims: any) {
  try {
    console.log("Processing Microsoft SSO user with claims:", JSON.stringify(claims, null, 2));
    
    const ssoEmail = claims["email"] || claims["preferred_username"];
    const ssoIdentifier = claims["sub"]; // Microsoft subject identifier
    
    if (!ssoEmail || !ssoIdentifier) {
      throw new Error("Missing required SSO claims: email or subject");
    }

    // First, try to find user by SSO identifier (existing linked account)
    let user = await storage.getUserBySsoIdentifier(ssoIdentifier, "microsoft");
    
    if (user) {
      console.log("Found existing SSO-linked user:", user.id);
      return user;
    }

    // Second, try to find user by email (for account linking)
    user = await storage.getUserByEmail(ssoEmail);
    
    if (user) {
      // Link existing account to SSO
      console.log("Linking existing user to Microsoft SSO:", user.id);
      await storage.linkUserToSso(user.id, {
        ssoProvider: "microsoft",
        ssoIdentifier,
        ssoEmail
      });
      return user;
    }

    // No existing user - check if we should auto-create
    // For now, we'll require manual user creation by admin
    throw new Error(`No user account found for SSO email: ${ssoEmail}. Please contact administrator.`);
    
  } catch (error) {
    console.error("Error processing Microsoft SSO user:", error);
    throw error;
  }
}

export function setupMicrosoftSSO(app: Express) {
  // Only set up if Microsoft credentials are configured
  if (!process.env.MICROSOFT_CLIENT_ID || !process.env.MICROSOFT_CLIENT_SECRET) {
    console.log("Microsoft SSO not configured - skipping setup");
    return;
  }

  console.log("Setting up Microsoft SSO authentication...");

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    try {
      const user: any = {};
      updateMicrosoftSession(user, tokens);
      
      // Link or find existing user
      const dbUser = await linkOrCreateSsoUser(tokens.claims());
      
      // Merge SSO session with DB user - passport expects this structure
      Object.assign(user, dbUser);
      
      verified(null, user);
    } catch (error) {
      console.error("Microsoft SSO verification error:", error);
      verified(error as Error);
    }
  };

  // Set up strategy for each configured domain
  if (process.env.REPLIT_DOMAINS) {
    for (const domain of process.env.REPLIT_DOMAINS.split(",")) {
      getMicrosoftOidcConfig().then(config => {
        const strategy = new Strategy(
          {
            name: `microsoft-sso:${domain}`,
            config,
            scope: "openid email profile offline_access",
            callbackURL: `https://${domain}/api/auth/microsoft/callback`,
          },
          verify
        );
        passport.use(strategy);
        console.log(`Microsoft SSO strategy registered for domain: ${domain}`);
      }).catch(err => {
        console.error(`Failed to set up Microsoft SSO for ${domain}:`, err);
      });
    }
  }

  // Microsoft SSO login route
  app.get("/api/auth/microsoft", (req, res, next) => {
    const username = req.query.username as string;
    
    if (!username) {
      return res.status(400).json({ 
        error: "Username required for SSO authentication" 
      });
    }

    // Store username in session for account linking after callback
    req.session.ssoUsername = username;

    // Development fallback for non-Replit domains
    if (!process.env.REPLIT_DOMAINS || !process.env.REPLIT_DOMAINS.includes(req.hostname)) {
      return res.status(400).json({ 
        message: "Microsoft SSO only available on Replit platform",
        dev_note: "This requires deployment on Replit for proper OIDC integration"
      });
    }
    
    passport.authenticate(`microsoft-sso:${req.hostname}`, {
      prompt: "select_account",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  // Microsoft SSO callback route
  app.get(
    "/api/auth/microsoft/callback",
    passport.authenticate(`microsoft-sso:${process.env.REPLIT_DOMAINS?.split(",")[0]}`, { 
      failureRedirect: "/login?error=sso_failed" 
    }),
    (req, res) => {
      // Clear SSO username from session
      delete req.session.ssoUsername;
      
      // Successful authentication - redirect to dashboard
      res.redirect("/");
    }
  );
}

// Middleware to check if user requires SSO
export const checkSsoRequired: RequestHandler = async (req, res, next) => {
  const { username } = req.body;
  
  if (!username) {
    return next();
  }

  try {
    const user = await storage.getUserByUsername(username);
    
    if (!user) {
      return next(); // User doesn't exist, let normal auth handle it
    }

    if (user.ssoRequired && user.ssoProvider === "microsoft") {
      // User requires Microsoft SSO
      return res.status(403).json({
        error: "SSO_REQUIRED",
        message: "This account requires Microsoft SSO authentication",
        ssoProvider: "microsoft",
        redirectUrl: `/api/auth/microsoft?username=${encodeURIComponent(username)}`
      });
    }

    next();
  } catch (error) {
    console.error("Error checking SSO requirement:", error);
    next();
  }
};
