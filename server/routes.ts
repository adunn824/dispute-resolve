import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage, DatabaseStorage } from "./storage";
import { setupAuth } from "./auth";
import { 
  insertCaseSchema, 
  insertCustomerSchema,
  insertCaseNoteSchema,
  insertCaseOriginationSchema,
  insertLenderSchema,
  insertStatusSchema,
  insertDispositionSchema,
  insertSubDispositionSchema,
  insertPolicyViolationOptionSchema,
  insertKbCategorySchema,
  insertKbArticleSchema,
  insertKbChangeEventSchema,
  insertKbArticleLinkSchema,
  insertEmailTemplateSchema,
  type Case,
  type Customer 
} from "@shared/schema";
import { z } from "zod";
import multer from "multer";

// Simple authentication middleware that also populates req.dbUser
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  // Populate req.dbUser for backward compatibility with existing route handlers
  req.dbUser = req.user;
  next();
};

// Custom error for authorization failures
class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

// Role hierarchy: admin > compliance > agent
const roleHierarchy = {
  'admin': 3,
  'compliance': 2,
  'agent': 1
};

// Role-based authorization middleware with proper hierarchy (admin can access agent-level endpoints)
const requireRole = (roles: string | string[]) => (req: any, res: any, next: any) => {
  if (!req.isAuthenticated()) {
    console.error("requireRole: User not authenticated");
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  // Log user object structure for debugging
  if (!req.user || !req.user.role) {
    console.error("requireRole: User object missing or invalid:", {
      hasUser: !!req.user,
      userId: req.user?.id,
      userRole: req.user?.role,
      userKeys: req.user ? Object.keys(req.user) : []
    });
    return res.status(401).json({ message: "Unauthorized - invalid user session" });
  }
  
  const roleArray = Array.isArray(roles) ? roles : [roles];
  const userRoleLevel = roleHierarchy[req.user.role as keyof typeof roleHierarchy] || 0;
  
  // Check if user's role level meets or exceeds any of the required roles
  const hasPermission = roleArray.some(requiredRole => {
    const requiredLevel = roleHierarchy[requiredRole as keyof typeof roleHierarchy] || 0;
    return userRoleLevel >= requiredLevel;
  });
  
  if (!hasPermission) {
    console.error("requireRole: Insufficient permissions:", {
      userRole: req.user.role,
      userRoleLevel,
      requiredRoles: roleArray
    });
    return res.status(403).json({ message: "Forbidden" });
  }
  
  // Populate req.dbUser for backward compatibility with existing route handlers
  req.dbUser = req.user;
  next();
};

// Permission check helpers
const checkUserPermissions = {
  // Check if user can modify cases (not view-only)
  canModify: (user: any) => {
    if (user.isViewOnly) {
      throw new AuthorizationError("You have view-only access and cannot make modifications");
    }
  },
  
  // Check if user can resolve cases
  canResolve: (user: any) => {
    if (!user.canResolve) {
      throw new AuthorizationError("You do not have permission to resolve cases");
    }
  },
  
  // Check if user can delete items
  canDelete: (user: any) => {
    if (!user.canDelete) {
      throw new AuthorizationError("You do not have permission to delete items");
    }
  },
  
  // Check if user can assign cases
  canAssign: (user: any) => {
    if (!user.canAssign) {
      throw new AuthorizationError("You do not have permission to assign cases");
    }
  },
  
  // Check if user has access to a specific lender's case
  hasLenderAccess: (user: any, caseLenderId: string | null) => {
    // If user is restricted to a specific lender, check if case belongs to that lender
    if (user.restrictedLenderId && user.restrictedLenderId !== caseLenderId) {
      throw new AuthorizationError("You do not have access to cases from this lender");
    }
  }
};

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Setup multer for file uploads
  const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
  });
  
  // Setup authentication (sets up /api/register, /api/login, /api/logout, /api/user)
  setupAuth(app);
  
  // Case Management API Endpoints
  
  // GET /api/cases - List cases with filtering and pagination
  app.get("/api/cases", requireAuth, async (req: any, res) => {
    try {
      const querySchema = z.object({
        status: z.string().optional(),
        priorityValue: z.string().optional(),
        priorityRuleId: z.string().optional(), 
        caseTypeId: z.string().optional(),
        categoryId: z.string().optional(),
        caseOriginationId: z.string().optional(),
        customerId: z.string().optional(),
        assignedToUserId: z.string().optional(),
        tag: z.string().optional(),
        slaStatus: z.string().optional(),
        search: z.string().optional(),
        detailed: z.coerce.boolean().default(false),
        sortField: z.enum(["createdAt", "customerName", "status", "priorityValue", "updatedAt"]).default("createdAt"),
        sortDirection: z.enum(["asc", "desc"]).default("desc"),
        limit: z.coerce.number().min(1).max(100).default(20),
        offset: z.coerce.number().min(0).default(0)
      });

      const filters = querySchema.parse(req.query);
      
      // Apply lender restriction if user has one
      if (req.user.restrictedLenderId) {
        // Override any lenderId filter with user's restricted lender
        (filters as any).lenderId = req.user.restrictedLenderId;
      }
      
      // Use detailed view if requested, otherwise basic view
      const cases = filters.detailed 
        ? await storage.getCasesWithDetails(filters)
        : await storage.getCases(filters);
      
      res.json({
        data: cases,
        pagination: {
          limit: filters.limit,
          offset: filters.offset,
          hasMore: cases.length === filters.limit
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid query parameters", details: error.errors });
      }
      console.error("Failed to fetch cases:", error);
      res.status(500).json({ error: "Failed to fetch cases" });
    }
  });

  // GET /api/cases/email-intake - Get all pending email intake cases (must come before :id route)
  app.get("/api/cases/email-intake", requireAuth, async (req, res) => {
    try {
      const intakeCases = await storage.getEmailIntakeCases();
      res.json({ data: intakeCases });
    } catch (error) {
      console.error("Failed to fetch email intake cases:", error);
      res.status(500).json({ error: "Failed to fetch email intake cases" });
    }
  });

  // GET /api/cases/search - Search cases by case number, customer name, or loan ID (must come before :id route)
  app.get("/api/cases/search", requireAuth, async (req: any, res) => {
    try {
      const { q } = req.query;
      
      if (!q || typeof q !== 'string') {
        return res.status(400).json({ error: "Query parameter 'q' is required" });
      }

      const results = await storage.searchCases(q, 10);
      
      // Filter results based on user's lender access
      const filteredResults = req.user.restrictedLenderId
        ? results.filter(c => c.lenderId === req.user.restrictedLenderId)
        : results;
      
      res.json({ data: filteredResults });
    } catch (error) {
      console.error("Failed to search cases:", error);
      res.status(500).json({ error: "Failed to search cases" });
    }
  });

  // GET /api/cases/:id - Get single case by ID with detailed information
  app.get("/api/cases/:id", requireAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const caseRecord = await storage.getCaseWithDetails(id);
      
      if (!caseRecord) {
        return res.status(404).json({ error: "Case not found" });
      }
      
      // Check lender access permission
      checkUserPermissions.hasLenderAccess(req.user, caseRecord.lenderId);
      
      res.json({ data: caseRecord });
    } catch (error) {
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ error: error.message });
      }
      console.error("Failed to fetch case:", error);
      res.status(500).json({ error: "Failed to fetch case" });
    }
  });

  // PATCH /api/cases/:id/status - Update case status
  app.patch("/api/cases/:id/status", requireAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      if (!status || !["open", "in_progress", "resolved"].includes(status)) {
        return res.status(400).json({ error: "Invalid status. Must be one of: open, in_progress, resolved" });
      }

      // Get the case to check permissions
      const existingCase = await storage.getCase(id);
      if (!existingCase) {
        return res.status(404).json({ error: "Case not found" });
      }

      // Permission checks
      checkUserPermissions.canModify(req.user);
      checkUserPermissions.hasLenderAccess(req.user, existingCase.lenderId);
      
      // If resolving, check resolve permission
      if (status === "resolved") {
        checkUserPermissions.canResolve(req.user);
      }

      const updatedCase = await storage.updateCaseStatus(id, status, userId);
      res.json({ data: updatedCase });
    } catch (error) {
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ error: error.message });
      }
      console.error("Failed to update case status:", error);
      if (error instanceof Error && error.message === "Case not found") {
        return res.status(404).json({ error: "Case not found" });
      }
      res.status(500).json({ error: "Failed to update case status" });
    }
  });

  // PATCH /api/cases/:id/assign - Assign case to user (agents and above)
  app.patch("/api/cases/:id/assign", requireRole(['agent', 'compliance', 'admin']), async (req: any, res) => {
    try {
      const { id } = req.params;
      const { assignedToUserId, secondaryAssignedToUserId } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      // Validate assignedToUserId if provided (can be null to unassign)
      if (assignedToUserId !== undefined && assignedToUserId !== null && typeof assignedToUserId !== 'string') {
        return res.status(400).json({ error: "Invalid assignedToUserId. Must be a string or null." });
      }

      // Validate secondaryAssignedToUserId if provided (can be null to unassign)
      if (secondaryAssignedToUserId !== undefined && secondaryAssignedToUserId !== null && typeof secondaryAssignedToUserId !== 'string') {
        return res.status(400).json({ error: "Invalid secondaryAssignedToUserId. Must be a string or null." });
      }

      // Get the case to check permissions
      const existingCase = await storage.getCase(id);
      if (!existingCase) {
        return res.status(404).json({ error: "Case not found" });
      }

      // Permission checks
      checkUserPermissions.canAssign(req.user);
      checkUserPermissions.hasLenderAccess(req.user, existingCase.lenderId);

      // If fields are undefined, preserve existing values
      const primaryAssignee = assignedToUserId !== undefined ? assignedToUserId : existingCase.assignedToUserId;
      const secondaryAssignee = secondaryAssignedToUserId !== undefined ? secondaryAssignedToUserId : existingCase.secondaryAssignedToUserId;

      const updatedCase = await storage.assignCase(id, primaryAssignee, secondaryAssignee, userId);
      res.json({ data: updatedCase });
    } catch (error) {
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ error: error.message });
      }
      console.error("Failed to assign case:", error);
      if (error instanceof Error && error.message === "Case not found") {
        return res.status(404).json({ error: "Case not found" });
      }
      res.status(500).json({ error: "Failed to assign case" });
    }
  });

  // DELETE /api/cases/:id - Delete a case (admin only)
  app.delete("/api/cases/:id", requireRole("admin"), async (req: any, res) => {
    try {
      const { id } = req.params;

      // Get the case to verify it exists
      const existingCase = await storage.getCase(id);
      if (!existingCase) {
        return res.status(404).json({ error: "Case not found" });
      }

      // Delete the case (cascade deletes related data)
      await storage.deleteCase(id);
      
      res.json({ message: "Case deleted successfully" });
    } catch (error) {
      console.error("Failed to delete case:", error);
      if (error instanceof Error && error.message === "Case not found") {
        return res.status(404).json({ error: "Case not found" });
      }
      res.status(500).json({ error: "Failed to delete case" });
    }
  });

  // POST /api/cases/:id/link - Link a case to another case
  app.post("/api/cases/:id/link", requireRole(['agent', 'compliance', 'admin']), async (req: any, res) => {
    try {
      const { id } = req.params;
      const { linkedCaseId, linkType } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      if (!linkedCaseId) {
        return res.status(400).json({ error: "linkedCaseId is required" });
      }

      // Prevent self-linking (normalize both IDs for comparison)
      const normalizedId = id.trim().toLowerCase();
      const normalizedLinkedId = linkedCaseId.trim().toLowerCase();
      if (normalizedId === normalizedLinkedId) {
        return res.status(400).json({ error: "Cannot link a case to itself" });
      }

      // Verify both cases exist
      const currentCase = await storage.getCase(id);
      const targetCase = await storage.getCase(linkedCaseId);

      if (!currentCase) {
        return res.status(404).json({ error: "Current case not found" });
      }

      if (!targetCase) {
        return res.status(404).json({ error: "Target case not found" });
      }

      // Check permissions for both cases
      checkUserPermissions.hasLenderAccess(req.user, currentCase.lenderId);
      checkUserPermissions.hasLenderAccess(req.user, targetCase.lenderId);

      // Create the relationship
      const relationship = await storage.createCaseRelationship({
        caseId: id,
        linkedCaseId,
        linkType: linkType || 'related',
        createdByUserId: userId
      });

      // Log the action in audit log
      await storage.createAuditLog({
        caseId: id,
        actorUserId: userId,
        action: 'case_linked',
        details: {
          linkedCaseId,
          linkType: linkType || 'related',
          timestamp: new Date().toISOString()
        }
      });

      res.json({ data: relationship });
    } catch (error) {
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ error: error.message });
      }
      console.error("Failed to link cases:", error);
      res.status(500).json({ error: "Failed to link cases" });
    }
  });

  // DELETE /api/cases/:id/link/:linkedCaseId - Unlink two cases
  app.delete("/api/cases/:id/link/:linkedCaseId", requireRole(['agent', 'compliance', 'admin']), async (req: any, res) => {
    try {
      const { id, linkedCaseId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      // Verify both cases exist
      const currentCase = await storage.getCase(id);
      const targetCase = await storage.getCase(linkedCaseId);

      if (!currentCase) {
        return res.status(404).json({ error: "Current case not found" });
      }

      if (!targetCase) {
        return res.status(404).json({ error: "Target case not found" });
      }

      // Check permissions for both cases
      checkUserPermissions.hasLenderAccess(req.user, currentCase.lenderId);
      checkUserPermissions.hasLenderAccess(req.user, targetCase.lenderId);

      // Delete the relationship
      await storage.deleteCaseRelationship(id, linkedCaseId);

      // Log the action in audit log
      await storage.createAuditLog({
        caseId: id,
        actorUserId: userId,
        action: 'case_unlinked',
        details: {
          linkedCaseId,
          timestamp: new Date().toISOString()
        }
      });

      res.json({ message: "Cases unlinked successfully" });
    } catch (error) {
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ error: error.message });
      }
      console.error("Failed to unlink cases:", error);
      res.status(500).json({ error: "Failed to unlink cases" });
    }
  });

  // GET /api/cases/:id/linked-cases - Get all cases linked to this case
  app.get("/api/cases/:id/linked-cases", requireRole(['agent', 'compliance', 'admin']), async (req: any, res) => {
    try {
      const { id } = req.params;

      // Get the case to check lender access permission
      const caseRecord = await storage.getCase(id);
      if (!caseRecord) {
        return res.status(404).json({ error: "Case not found" });
      }

      // Check lender access permission
      checkUserPermissions.hasLenderAccess(req.user, caseRecord.lenderId);

      const linkedCases = await storage.getLinkedCases(id);
      res.json({ data: linkedCases });
    } catch (error) {
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ error: error.message });
      }
      console.error("Failed to get linked cases:", error);
      res.status(500).json({ error: "Failed to get linked cases" });
    }
  });

  // GET /api/cases/:id/potential-matches - Find potential matching cases
  app.get("/api/cases/:id/potential-matches", requireRole(['agent', 'compliance', 'admin']), async (req: any, res) => {
    try {
      const { id } = req.params;

      // Get the case to check lender access permission
      const caseRecord = await storage.getCase(id);
      if (!caseRecord) {
        return res.status(404).json({ error: "Case not found" });
      }

      // Check lender access permission
      checkUserPermissions.hasLenderAccess(req.user, caseRecord.lenderId);

      const potentialMatches = await storage.findPotentialMatches(id);
      res.json({ data: potentialMatches });
    } catch (error) {
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ error: error.message });
      }
      console.error("Failed to find potential matches:", error);
      res.status(500).json({ error: "Failed to find potential matches" });
    }
  });

  // GET /api/assignees - Get available users for case assignment
  app.get("/api/assignees", requireRole(['agent', 'compliance', 'admin']), async (req: any, res) => {
    try {
      const assignees = await storage.getAvailableAssignees();
      res.json({ data: assignees });
    } catch (error) {
      console.error("Failed to get assignees:", error);
      res.status(500).json({ error: "Failed to get assignees" });
    }
  });

  // GET /api/cases/:id/notes - Get all notes for a case (agents and above)
  app.get("/api/cases/:id/notes", requireRole(['agent', 'compliance', 'admin']), async (req: any, res) => {
    try {
      const { id } = req.params;
      const notes = await storage.getCaseNotes(id);
      res.json({ data: notes });
    } catch (error) {
      console.error("Failed to get case notes:", error);
      res.status(500).json({ error: "Failed to get case notes" });
    }
  });

  // GET /api/cases/:id/emails - Get email history for a case (agents and above)
  app.get("/api/cases/:id/emails", requireRole(['agent', 'compliance', 'admin']), async (req: any, res) => {
    try {
      const { id } = req.params;
      
      // Get the case to check lender access permission
      const caseRecord = await storage.getCase(id);
      if (!caseRecord) {
        return res.status(404).json({ error: "Case not found" });
      }
      
      // Check lender access permission
      checkUserPermissions.hasLenderAccess(req.user, caseRecord.lenderId);
      
      const emailHistory = await storage.getEmailHistory(id);
      res.json({ data: emailHistory });
    } catch (error) {
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ error: error.message });
      }
      console.error("Failed to get email history:", error);
      res.status(500).json({ error: "Failed to get email history" });
    }
  });

  // POST /api/cases/:id/notes - Create a new note for a case (agents and above)
  app.post("/api/cases/:id/notes", requireRole(['agent', 'compliance', 'admin']), async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      // Validate request body using Zod schema
      const noteSchema = insertCaseNoteSchema.omit({ caseId: true, authorUserId: true });
      const validatedData = noteSchema.parse(req.body);

      const noteData = {
        caseId: id,
        authorUserId: userId,
        content: validatedData.content,
        isPublic: validatedData.isPublic,
      };

      const newNote = await storage.createCaseNote(noteData);
      
      // Log the note creation in audit log
      await storage.createAuditLog({
        caseId: id,
        actorUserId: userId,
        action: "case_note_added",
        details: {
          noteId: newNote.id,
          isPublic: noteData.isPublic,
          timestamp: new Date().toISOString()
        }
      });

      res.json({ data: newNote });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid note data", details: error.errors });
      }
      console.error("Failed to create case note:", error);
      res.status(500).json({ error: "Failed to create case note" });
    }
  });

  // PUT /api/notes/:id - Update a case note (agents and above)
  app.put("/api/notes/:id", requireRole(['agent', 'compliance', 'admin']), async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      // Validate request body using Zod schema
      const updateSchema = insertCaseNoteSchema.omit({ caseId: true, authorUserId: true }).partial();
      const validatedData = updateSchema.parse(req.body);

      const updatedNote = await storage.updateCaseNote(id, validatedData);

      // Log the note update in audit log
      await storage.createAuditLog({
        caseId: updatedNote.caseId,
        actorUserId: userId,
        action: "case_note_updated",
        details: {
          noteId: id,
          isPublic: updatedNote.isPublic,
          timestamp: new Date().toISOString()
        }
      });

      res.json({ data: updatedNote });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid note data", details: error.errors });
      }
      console.error("Failed to update case note:", error);
      if (error instanceof Error && error.message === "Case note not found") {
        return res.status(404).json({ error: "Case note not found" });
      }
      res.status(500).json({ error: "Failed to update case note" });
    }
  });

  // POST /api/cases/create-intake - Simplified case creation from intake form (agents and above)
  app.post("/api/cases/create-intake", requireRole(['agent', 'admin']), async (req: any, res) => {
    try {
      // Define intake schema
      const intakeSchema = z.object({
        caseOriginationId: z.string().min(1, "Case origination is required"),
        caseTypeId: z.string().min(1, "Case type is required"),
        categoryId: z.string().min(1, "Category is required"),
        customerName: z.string().min(1, "Customer name is required"),
        customerState: z.string().min(2, "State is required"),
        loanId: z.string().optional(),
        lenderName: z.string().optional(),
        details: z.string().min(10, "Details must be at least 10 characters"),
        hasRepresentative: z.boolean().optional().default(false),
        representativeCompanyName: z.string().optional(),
        representativePersonName: z.string().optional(),
        representativeAddress: z.string().optional(),
        representativeEmail: z.string().email().optional().or(z.literal("")),
        representativePhone: z.string().optional(),
      });

      const intakeData = intakeSchema.parse(req.body);
      
      // Step 1: Find or create customer
      let customer;
      const existingCustomers = await storage.findCustomerByName(intakeData.customerName);
      const matchingCustomer = existingCustomers.find(c => 
        c.name === intakeData.customerName && c.state === intakeData.customerState
      );
      
      if (matchingCustomer) {
        customer = matchingCustomer;
      } else {
        customer = await storage.createCustomer({
          name: intakeData.customerName,
          state: intakeData.customerState,
        });
      }
      
      // Step 2: Find appropriate priority rule for the category
      const priorityRules = await storage.getPriorityRules(intakeData.categoryId);
      let selectedPriorityRule = priorityRules.find(rule => {
        const conditions = rule.conditions;
        return conditions && typeof conditions === 'object' && 
          'default' in conditions && (conditions as any).default === true;
      });
      
      // If no default rule found, use the first available rule
      if (!selectedPriorityRule && priorityRules.length > 0) {
        selectedPriorityRule = priorityRules[0];
      }
      
      // If still no rule found, create a default medium priority rule
      if (!selectedPriorityRule) {
        selectedPriorityRule = await storage.createPriorityRule({
          categoryId: intakeData.categoryId,
          name: "Default Priority",
          description: "Auto-generated default priority rule",
          priority: "medium",
          conditions: { conditions: [], default: true },
          priorityValue: "Medium",
          isActive: true,
        });
      }
      
      // Step 3: Auto-assign case to next available user
      const nextUser = await storage.getNextAvailableUser();
      
      // Step 4: Create the case
      const caseData = {
        caseOriginationId: intakeData.caseOriginationId,
        caseTypeId: intakeData.caseTypeId,
        categoryId: intakeData.categoryId,
        priorityRuleId: selectedPriorityRule.id,
        customerId: customer.id,
        loanId: intakeData.loanId || null,
        lenderName: intakeData.lenderName || null,
        state: intakeData.customerState,
        details: intakeData.details,
        status: "open" as const,
        assignedToUserId: nextUser?.id || null,
        hasRepresentative: intakeData.hasRepresentative || false,
        representativeCompanyName: intakeData.representativeCompanyName || null,
        representativePersonName: intakeData.representativePersonName || null,
        representativeAddress: intakeData.representativeAddress || null,
        representativeEmail: intakeData.representativeEmail || null,
        representativePhone: intakeData.representativePhone || null,
        configVersion: 1,
      };
      
      const newCase = await storage.createCase(caseData);
      
      // Update user's lastAssignedAt only after successful case creation
      if (nextUser) {
        await storage.updateUser(nextUser.id, { lastAssignedAt: new Date() });
      }
      
      // Create audit log for case creation
      await storage.createAuditLog({
        caseId: newCase.id,
        actorUserId: req.dbUser.id,
        action: "case_created",
        details: { 
          caseId: newCase.id, 
          initialStatus: newCase.status,
          customerName: intakeData.customerName,
          customerState: intakeData.customerState,
          priority: selectedPriorityRule.priorityValue,
          autoAssigned: !!nextUser,
          assignedToUserId: newCase.assignedToUserId
        }
      });
      
      res.status(201).json({ data: newCase });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid intake data", details: error.errors });
      }
      console.error("Failed to create case from intake:", error);
      res.status(500).json({ error: "Failed to create case from intake" });
    }
  });

  // POST /api/cases - Create new case (agents and above)
  app.post("/api/cases", requireRole(['agent', 'admin']), async (req: any, res) => {
    try {
      const caseData = insertCaseSchema.parse(req.body);
      
      // Auto-assign case if no assignee specified
      let autoAssignedUser = null;
      if (!caseData.assignedToUserId) {
        const nextUser = await storage.getNextAvailableUser();
        if (nextUser) {
          caseData.assignedToUserId = nextUser.id;
          autoAssignedUser = nextUser;
        }
      }
      
      const newCase = await storage.createCase(caseData);
      
      // Update user's lastAssignedAt only after successful case creation
      if (autoAssignedUser) {
        await storage.updateUser(autoAssignedUser.id, { lastAssignedAt: new Date() });
      }
      
      // Create audit log for case creation
      await storage.createAuditLog({
        caseId: newCase.id,
        actorUserId: req.dbUser.id,
        action: "case_created",
        details: { 
          caseId: newCase.id, 
          initialStatus: newCase.status,
          autoAssigned: !!autoAssignedUser,
          assignedToUserId: newCase.assignedToUserId
        }
      });
      
      res.status(201).json({ data: newCase });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid case data", details: error.errors });
      }
      console.error("Failed to create case:", error);
      res.status(500).json({ error: "Failed to create case" });
    }
  });

  // PUT /api/cases/:id - Update existing case (agents and above)
  app.put("/api/cases/:id", requireRole(['agent', 'admin']), async (req: any, res) => {
    try {
      const { id } = req.params;
      
      // Validate user object is properly populated
      if (!req.user || !req.user.id) {
        console.error("PUT /api/cases/:id - User object not properly populated:", { 
          hasUser: !!req.user,
          userId: req.user?.id,
          userRole: req.user?.role 
        });
        return res.status(401).json({ error: "Unauthorized - user session invalid" });
      }

      // Handle customer name separately since it's not a case field
      const { customerName, ...caseUpdates } = req.body;
      const updates = insertCaseSchema.partial().parse(caseUpdates);
      
      // Check if case exists
      const existingCase = await storage.getCase(id);
      if (!existingCase) {
        return res.status(404).json({ error: "Case not found" });
      }
      
      // Permission checks
      checkUserPermissions.canModify(req.user);
      checkUserPermissions.hasLenderAccess(req.user, existingCase.lenderId);
      
      // Handle customer name update if provided
      if (customerName) {
        // Find or create customer with new name
        const existingCustomers = await storage.findCustomerByName(customerName);
        const matchingCustomer = existingCustomers.find(c => 
          c.name === customerName && c.state === (updates.state || existingCase.state)
        );
        
        if (matchingCustomer) {
          updates.customerId = matchingCustomer.id;
        } else {
          const newCustomer = await storage.createCustomer({
            name: customerName,
            state: updates.state || existingCase.state,
          });
          updates.customerId = newCustomer.id;
        }
      }
      
      const updatedCase = await storage.updateCase(id, updates);
      
      // Create audit log for case update
      await storage.createAuditLog({
        caseId: id,
        actorUserId: req.dbUser.id,
        action: "case_updated", 
        details: { 
          updates: { ...updates, customerName }, 
          previousStatus: existingCase.status, 
          newStatus: updatedCase.status
        }
      });
      
      res.json({ data: updatedCase });
    } catch (error) {
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ error: error.message });
      }
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid update data", details: error.errors });
      }
      console.error("Failed to update case:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to update case";
      res.status(500).json({ error: "Failed to update case", details: errorMessage });
    }
  });

  // Email Intake API Endpoints
  
  // POST /api/email-intake - Webhook endpoint to receive emails and create pending intake cases
  app.post("/api/email-intake", async (req, res) => {
    try {
      const emailSchema = z.object({
        from: z.string().min(1, "From address is required"),
        to: z.string().optional(),
        subject: z.string().optional(),
        receivedDate: z.string().optional(),
        messageId: z.string().optional(),
        body: z.string().optional(),
        bodyPreview: z.string().optional(),
        hasAttachments: z.boolean().optional(),
        attachmentCount: z.number().optional(),
      });

      const emailData = emailSchema.parse(req.body);
      const newCase = await storage.createEmailIntakeCase(emailData);
      
      res.status(201).json({ 
        success: true, 
        data: newCase,
        message: "Email intake case created successfully"
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid email data", details: error.errors });
      }
      console.error("Failed to create email intake case:", error);
      res.status(500).json({ error: "Failed to process email intake" });
    }
  });

  // POST /api/cases/:id/complete-intake - Complete intake and activate case
  app.post("/api/cases/:id/complete-intake", requireRole(['agent', 'admin']), async (req: any, res) => {
    try {
      const { id } = req.params;
      
      const intakeSchema = z.object({
        caseOriginationId: z.string().min(1, "Case origination is required"),
        caseTypeId: z.string().min(1, "Case type is required"),
        categoryId: z.string().min(1, "Category is required"),
        lenderId: z.string().optional(),
        loanId: z.string().optional(),
        customerName: z.string().min(1, "Customer name is required"),
        customerState: z.string().min(2, "State is required"),
        details: z.string().optional(),
      });

      const intakeData = intakeSchema.parse(req.body);
      
      // Check if case exists and is in pending_intake status
      const existingCase = await storage.getCase(id);
      if (!existingCase) {
        return res.status(404).json({ error: "Case not found" });
      }
      if (existingCase.status !== 'pending_intake') {
        return res.status(400).json({ error: "Case is not in pending intake status" });
      }

      // Update customer info if needed
      let customerId = existingCase.customerId;
      const existingCustomers = await storage.findCustomerByName(intakeData.customerName);
      const matchingCustomer = existingCustomers.find(c => 
        c.name === intakeData.customerName && c.state === intakeData.customerState
      );
      
      if (matchingCustomer) {
        customerId = matchingCustomer.id;
      } else {
        const newCustomer = await storage.createCustomer({
          name: intakeData.customerName,
          state: intakeData.customerState,
        });
        customerId = newCustomer.id;
      }

      // Auto-assign a priority rule based on the category
      const priorityRules = await storage.getPriorityRules(intakeData.categoryId);
      let priorityRuleId: string;
      
      if (priorityRules.length > 0) {
        // Use the first active priority rule for the category
        priorityRuleId = priorityRules[0].id;
      } else {
        // Create a default priority rule for this category
        const newRule = await storage.createPriorityRule({
          categoryId: intakeData.categoryId,
          name: 'Default Priority',
          description: 'Auto-generated default priority rule',
          priority: 'medium',
          conditions: { conditions: [], default: true },
          priorityValue: 'Medium',
          isActive: true,
        });
        priorityRuleId = newRule.id;
      }

      // Auto-assign case to next available user
      const nextUser = await storage.getNextAvailableUser();
      
      // Complete the intake with updated case data
      const caseData = {
        caseOriginationId: intakeData.caseOriginationId,
        caseTypeId: intakeData.caseTypeId,
        categoryId: intakeData.categoryId,
        priorityRuleId,
        customerId,
        lenderId: intakeData.lenderId || existingCase.lenderId,
        loanId: intakeData.loanId || existingCase.loanId,
        state: intakeData.customerState,
        details: intakeData.details || existingCase.details,
        assignedToUserId: nextUser?.id || existingCase.assignedToUserId,
      };

      const updatedCase = await storage.completeIntake(id, caseData, req.dbUser.id);
      
      // Update user's lastAssignedAt only after successful completion
      if (nextUser) {
        await storage.updateUser(nextUser.id, { lastAssignedAt: new Date() });
      }
      
      // Log auto-assignment if it occurred
      if (nextUser) {
        await storage.createAuditLog({
          caseId: id,
          actorUserId: req.dbUser.id,
          action: "case_auto_assigned",
          details: {
            previousAssignedToUserId: existingCase.assignedToUserId,
            assignedToUserId: nextUser.id,
            assignedToUserName: nextUser.name,
            autoAssigned: true
          }
        });
      }
      
      res.json({ data: updatedCase, message: "Intake completed successfully" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid intake data", details: error.errors });
      }
      console.error("Failed to complete intake:", error);
      res.status(500).json({ error: "Failed to complete intake" });
    }
  });

  // POST /api/cases/:id/mark-viewed - Mark case as first viewed
  app.post("/api/cases/:id/mark-viewed", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const updatedCase = await storage.markCaseViewed(id);
      res.json({ data: updatedCase });
    } catch (error) {
      console.error("Failed to mark case as viewed:", error);
      res.status(500).json({ error: "Failed to mark case as viewed" });
    }
  });

  // Customer Management API Endpoints
  
  // GET /api/customers - List customers
  app.get("/api/customers", requireAuth, async (req, res) => {
    try {
      const querySchema = z.object({
        name: z.string().optional(),
        limit: z.coerce.number().min(1).max(100).default(20),
        offset: z.coerce.number().min(0).default(0)
      });

      const { name, limit, offset } = querySchema.parse(req.query);
      
      let customers: Customer[];
      if (name) {
        customers = await storage.findCustomerByName(name);
        // Apply pagination to search results
        customers = customers.slice(offset, offset + limit);
      } else {
        customers = await storage.getCustomers({ limit, offset });
      }
      
      res.json({
        data: customers,
        pagination: {
          limit,
          offset,
          hasMore: customers.length === limit
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid query parameters", details: error.errors });
      }
      console.error("Failed to fetch customers:", error);
      res.status(500).json({ error: "Failed to fetch customers" });
    }
  });

  // GET /api/customers/:id - Get single customer by ID
  app.get("/api/customers/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const customer = await storage.getCustomer(id);
      
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }
      
      res.json({ data: customer });
    } catch (error) {
      console.error("Failed to fetch customer:", error);
      res.status(500).json({ error: "Failed to fetch customer" });
    }
  });

  // POST /api/customers - Create new customer (agents and above)
  app.post("/api/customers", requireRole(['agent', 'admin']), async (req, res) => {
    try {
      const customerData = insertCustomerSchema.parse(req.body);
      const newCustomer = await storage.createCustomer(customerData);
      
      res.status(201).json({ data: newCustomer });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid customer data", details: error.errors });
      }
      console.error("Failed to create customer:", error);
      res.status(500).json({ error: "Failed to create customer" });
    }
  });

  // Configuration API Endpoints (Read-only for now)
  
  // GET /api/dashboard - Dashboard statistics
  app.get("/api/dashboard", requireAuth, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json({ data: stats });
    } catch (error) {
      console.error("Failed to fetch dashboard stats:", error);
      res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
  });

  // Reporting API Endpoints
  
  // GET /api/reports/case-volume - Case volume analytics
  app.get("/api/reports/case-volume", requireRole(['compliance', 'admin']), async (req, res) => {
    try {
      const querySchema = z.object({
        startDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
        endDate: z.string().optional().transform(val => {
          if (!val) return undefined;
          const date = new Date(val);
          date.setHours(23, 59, 59, 999); // Set to end of day
          return date;
        })
      });

      const filters = querySchema.parse(req.query);
      const report = await storage.getCaseVolumeReport(filters);
      res.json({ data: report });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid query parameters", details: error.errors });
      }
      console.error("Failed to fetch case volume report:", error);
      res.status(500).json({ error: "Failed to fetch case volume report" });
    }
  });

  // GET /api/reports/agent-performance - Agent performance metrics
  app.get("/api/reports/agent-performance", requireRole(['compliance', 'admin']), async (req, res) => {
    try {
      const querySchema = z.object({
        startDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
        endDate: z.string().optional().transform(val => {
          if (!val) return undefined;
          const date = new Date(val);
          date.setHours(23, 59, 59, 999); // Set to end of day
          return date;
        })
      });

      const filters = querySchema.parse(req.query);
      const report = await storage.getAgentPerformanceReport(filters);
      res.json({ data: report });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid query parameters", details: error.errors });
      }
      console.error("Failed to fetch agent performance report:", error);
      res.status(500).json({ error: "Failed to fetch agent performance report" });
    }
  });

  // GET /api/reports/sla-compliance - SLA compliance analysis
  app.get("/api/reports/sla-compliance", requireRole(['compliance', 'admin']), async (req, res) => {
    try {
      const querySchema = z.object({
        startDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
        endDate: z.string().optional().transform(val => {
          if (!val) return undefined;
          const date = new Date(val);
          date.setHours(23, 59, 59, 999); // Set to end of day
          return date;
        })
      });

      const filters = querySchema.parse(req.query);
      const report = await storage.getSlaComplianceReport(filters);
      res.json({ data: report });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid query parameters", details: error.errors });
      }
      console.error("Failed to fetch SLA compliance report:", error);
      res.status(500).json({ error: "Failed to fetch SLA compliance report" });
    }
  });

  // GET /api/reports/resolution-patterns - Resolution pattern analysis
  app.get("/api/reports/resolution-patterns", requireRole(['compliance', 'admin']), async (req, res) => {
    try {
      const querySchema = z.object({
        startDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
        endDate: z.string().optional().transform(val => {
          if (!val) return undefined;
          const date = new Date(val);
          date.setHours(23, 59, 59, 999); // Set to end of day
          return date;
        })
      });

      const filters = querySchema.parse(req.query);
      const report = await storage.getResolutionPatternsReport(filters);
      res.json({ data: report });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid query parameters", details: error.errors });
      }
      console.error("Failed to fetch resolution patterns report:", error);
      res.status(500).json({ error: "Failed to fetch resolution patterns report" });
    }
  });

  // GET /api/reports/lender-analytics - Lender performance analytics
  app.get("/api/reports/lender-analytics", requireRole(['compliance', 'admin']), async (req, res) => {
    try {
      const querySchema = z.object({
        startDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
        endDate: z.string().optional().transform(val => {
          if (!val) return undefined;
          const date = new Date(val);
          date.setHours(23, 59, 59, 999); // Set to end of day
          return date;
        })
      });

      const filters = querySchema.parse(req.query);
      const report = await storage.getLenderAnalyticsReport(filters);
      res.json({ data: report });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid query parameters", details: error.errors });
      }
      console.error("Failed to fetch lender analytics report:", error);
      res.status(500).json({ error: "Failed to fetch lender analytics report" });
    }
  });

  // GET /api/case-originations - List case originations
  app.get("/api/case-originations", requireAuth, async (req, res) => {
    try {
      const caseOriginations = await storage.getCaseOriginations();
      res.json({ data: caseOriginations });
    } catch (error) {
      console.error("Failed to fetch case originations:", error);
      res.status(500).json({ error: "Failed to fetch case originations" });
    }
  });

  // GET /api/tags - Get all unique tags across all cases
  app.get("/api/tags", requireAuth, async (req, res) => {
    try {
      const tags = await storage.getAllTags();
      res.json({ data: tags });
    } catch (error) {
      console.error("Failed to fetch tags:", error);
      res.status(500).json({ error: "Failed to fetch tags" });
    }
  });

  // GET /api/case-types - List case types (optionally filtered by case origination)
  app.get("/api/case-types", requireAuth, async (req, res) => {
    try {
      const querySchema = z.object({
        caseOriginationId: z.string().optional()
      });
      
      const { caseOriginationId } = querySchema.parse(req.query);
      const caseTypes = await storage.getCaseTypes(caseOriginationId);
      res.json({ data: caseTypes });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid query parameters", details: error.errors });
      }
      console.error("Failed to fetch case types:", error);
      res.status(500).json({ error: "Failed to fetch case types" });
    }
  });

  // GET /api/categories - List categories (optionally filtered by case type)
  app.get("/api/categories", requireAuth, async (req, res) => {
    try {
      const querySchema = z.object({
        caseTypeId: z.string().optional()
      });
      
      const { caseTypeId } = querySchema.parse(req.query);
      const categories = await storage.getCategories(caseTypeId);
      res.json({ data: categories });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid query parameters", details: error.errors });
      }
      console.error("Failed to fetch categories:", error);
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  // GET /api/categories/:categoryId/priority-rules - Get priority rules for category  
  app.get("/api/categories/:categoryId/priority-rules", requireRole('compliance'), async (req, res) => {
    try {
      const { categoryId } = req.params;
      const priorityRules = await storage.getPriorityRules(categoryId);
      res.json({ data: priorityRules });
    } catch (error) {
      console.error("Failed to fetch priority rules:", error);
      res.status(500).json({ error: "Failed to fetch priority rules" });
    }
  });

  // Admin Configuration APIs (Create, Update, Delete)
  
  // Case Originations Admin Management  
  app.post("/api/case-originations", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const validatedData = insertCaseOriginationSchema.parse(req.body);
      const caseOrigination = await storage.createCaseOrigination(validatedData);
      res.status(201).json(caseOrigination);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Error creating case origination:", error);
      res.status(500).json({ message: "Failed to create case origination" });
    }
  });

  app.put("/api/case-originations/:id", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertCaseOriginationSchema.parse(req.body);
      const caseOrigination = await storage.updateCaseOrigination(id, validatedData);
      res.json(caseOrigination);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Error updating case origination:", error);
      res.status(500).json({ message: "Failed to update case origination" });
    }
  });

  app.delete("/api/case-originations/:id", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { id } = req.params;
      
      // TODO: Add dependency checking methods to storage
      // For now, just attempt deletion and catch foreign key errors
      await storage.deleteCaseOrigination(id);
      res.json({ message: "Case origination deleted successfully" });
    } catch (error) {
      console.error("Error deleting case origination:", error);
      
      // Check if it's a foreign key constraint error
      if ((error as any).code === '23503' || (error as any).message?.includes('foreign key')) {
        return res.status(400).json({ 
          message: "Cannot delete case origination because it is being referenced by existing data. Please remove all references first.",
          code: 'FOREIGN_KEY_CONSTRAINT'
        });
      }
      
      res.status(500).json({ message: "Failed to delete case origination" });
    }
  });

  // Lenders Admin Management  
  app.get("/api/lenders", requireAuth, async (req, res) => {
    try {
      const lenders = await storage.getLenders();
      // Mask client secret for security - never expose secrets to the client
      const sanitizedLenders = lenders.map(lender => ({
        ...lender,
        outlookClientSecret: lender.outlookClientSecret ? "***REDACTED***" : null
      }));
      res.json({ data: sanitizedLenders });
    } catch (error) {
      console.error("Failed to fetch lenders:", error);
      res.status(500).json({ error: "Failed to fetch lenders" });
    }
  });

  app.post("/api/lenders", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const validatedData = insertLenderSchema.parse(req.body);
      const lender = await storage.createLender(validatedData);
      // Mask the secret in response
      const sanitizedLender = {
        ...lender,
        outlookClientSecret: lender.outlookClientSecret ? "***REDACTED***" : null
      };
      res.status(201).json(sanitizedLender);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Error creating lender:", error);
      res.status(500).json({ message: "Failed to create lender" });
    }
  });

  app.put("/api/lenders/:id", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertLenderSchema.parse(req.body);
      
      // If outlookClientSecret is empty, preserve the existing one
      if (validatedData.outlookClientSecret === "" || !validatedData.outlookClientSecret) {
        const existingLender = await storage.getLenders();
        const lender = existingLender.find(l => l.id === id);
        if (lender && lender.outlookClientSecret) {
          validatedData.outlookClientSecret = lender.outlookClientSecret;
        }
      }
      
      const lender = await storage.updateLender(id, validatedData);
      // Mask the secret in response
      const sanitizedLender = {
        ...lender,
        outlookClientSecret: lender.outlookClientSecret ? "***REDACTED***" : null
      };
      res.json(sanitizedLender);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Error updating lender:", error);
      res.status(500).json({ message: "Failed to update lender" });
    }
  });

  app.delete("/api/lenders/:id", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteLender(id);
      res.json({ message: "Lender deleted successfully" });
    } catch (error) {
      console.error("Error deleting lender:", error);
      
      // Check if it's a foreign key constraint error
      if ((error as any).code === '23503' || (error as any).message?.includes('foreign key')) {
        return res.status(400).json({ 
          message: "Cannot delete lender because it is being referenced by existing cases. Please reassign these cases first.",
          code: 'FOREIGN_KEY_CONSTRAINT'
        });
      }
      
      res.status(500).json({ message: "Failed to delete lender" });
    }
  });

  // Disposition Options Management
  app.get("/api/dispositions", requireAuth, async (req, res) => {
    try {
      const dispositions = await storage.getDispositions();
      res.json({ data: dispositions });
    } catch (error) {
      console.error("Failed to fetch dispositions:", error);
      res.status(500).json({ error: "Failed to fetch dispositions" });
    }
  });

  app.post("/api/dispositions", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const validatedData = insertDispositionSchema.parse(req.body);
      const disposition = await storage.createDisposition(validatedData);
      res.status(201).json(disposition);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Error creating disposition:", error);
      res.status(500).json({ message: "Failed to create disposition" });
    }
  });

  app.put("/api/dispositions/:id", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertDispositionSchema.parse(req.body);
      const disposition = await storage.updateDisposition(id, validatedData);
      res.json(disposition);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Error updating disposition:", error);
      res.status(500).json({ message: "Failed to update disposition" });
    }
  });

  app.delete("/api/dispositions/:id", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteDisposition(id);
      res.json({ message: "Disposition deleted successfully" });
    } catch (error) {
      console.error("Error deleting disposition:", error);
      if ((error as any).code === '23503' || (error as any).message?.includes('foreign key')) {
        return res.status(400).json({ 
          message: "Cannot delete disposition because it has sub-dispositions or is referenced by existing resolutions.",
          code: 'FOREIGN_KEY_CONSTRAINT'
        });
      }
      res.status(500).json({ message: "Failed to delete disposition" });
    }
  });

  // Sub-Disposition Options Management  
  app.get("/api/sub-dispositions", requireAuth, async (req, res) => {
    try {
      const { dispositionId } = req.query;
      const subDispositions = await storage.getSubDispositions(dispositionId as string);
      res.json({ data: subDispositions });
    } catch (error) {
      console.error("Failed to fetch sub-dispositions:", error);
      res.status(500).json({ error: "Failed to fetch sub-dispositions" });
    }
  });

  app.post("/api/sub-dispositions", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const validatedData = insertSubDispositionSchema.parse(req.body);
      const subDisposition = await storage.createSubDisposition(validatedData);
      res.status(201).json(subDisposition);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Error creating sub-disposition:", error);
      res.status(500).json({ message: "Failed to create sub-disposition" });
    }
  });

  app.put("/api/sub-dispositions/:id", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertSubDispositionSchema.parse(req.body);
      const subDisposition = await storage.updateSubDisposition(id, validatedData);
      res.json(subDisposition);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Error updating sub-disposition:", error);
      res.status(500).json({ message: "Failed to update sub-disposition" });
    }
  });

  app.delete("/api/sub-dispositions/:id", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteSubDisposition(id);
      res.json({ message: "Sub-disposition deleted successfully" });
    } catch (error) {
      console.error("Error deleting sub-disposition:", error);
      res.status(500).json({ message: "Failed to delete sub-disposition" });
    }
  });

  // Policy Violation Options Management
  app.get("/api/policy-violation-options", requireAuth, async (req, res) => {
    try {
      const options = await storage.getPolicyViolationOptions();
      res.json({ data: options });
    } catch (error) {
      console.error("Failed to fetch policy violation options:", error);
      res.status(500).json({ error: "Failed to fetch policy violation options" });
    }
  });

  app.post("/api/policy-violation-options", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const validatedData = insertPolicyViolationOptionSchema.parse(req.body);
      const option = await storage.createPolicyViolationOption(validatedData);
      res.status(201).json(option);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Error creating policy violation option:", error);
      res.status(500).json({ message: "Failed to create policy violation option" });
    }
  });

  app.put("/api/policy-violation-options/:id", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertPolicyViolationOptionSchema.parse(req.body);
      const option = await storage.updatePolicyViolationOption(id, validatedData);
      res.json(option);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Error updating policy violation option:", error);
      res.status(500).json({ message: "Failed to update policy violation option" });
    }
  });

  app.delete("/api/policy-violation-options/:id", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deletePolicyViolationOption(id);
      res.json({ message: "Policy violation option deleted successfully" });
    } catch (error) {
      console.error("Error deleting policy violation option:", error);
      res.status(500).json({ message: "Failed to delete policy violation option" });
    }
  });

  // Statuses Admin Management
  app.get("/api/statuses", requireAuth, async (req, res) => {
    try {
      const statuses = await storage.getStatuses();
      res.json({ data: statuses });
    } catch (error) {
      console.error("Error fetching statuses:", error);
      res.status(500).json({ message: "Failed to fetch statuses" });
    }
  });

  app.post("/api/statuses", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const validatedData = insertStatusSchema.parse(req.body);
      const status = await storage.createStatus(validatedData);
      res.status(201).json(status);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Error creating status:", error);
      res.status(500).json({ message: "Failed to create status" });
    }
  });

  app.get("/api/statuses/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const status = await storage.getStatus(id);
      if (!status) {
        return res.status(404).json({ message: "Status not found" });
      }
      res.json(status);
    } catch (error) {
      console.error("Error fetching status:", error);
      res.status(404).json({ message: "Status not found" });
    }
  });

  app.patch("/api/statuses/:id", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertStatusSchema.partial().parse(req.body);
      const status = await storage.updateStatus(id, validatedData);
      res.json(status);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Error updating status:", error);
      res.status(500).json({ message: "Failed to update status" });
    }
  });

  app.delete("/api/statuses/:id", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteStatus(id);
      res.json({ message: "Status deleted successfully" });
    } catch (error) {
      console.error("Error deleting status:", error);
      
      // Check if it's a foreign key constraint error
      if ((error as any).code === '23503' || (error as any).message?.includes('foreign key')) {
        return res.status(400).json({ 
          message: "Cannot delete status because it is being referenced by existing cases. Please update or remove all references first.",
          code: 'FOREIGN_KEY_CONSTRAINT'
        });
      }
      
      res.status(500).json({ message: "Failed to delete status" });
    }
  });

  // Case Types Admin Management  
  app.post("/api/case-types", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { name, description, color, originationIds } = req.body;
      const caseType = await storage.createCaseType({
        name,
        description,
        color,
      }, originationIds);
      res.status(201).json(caseType);
    } catch (error) {
      console.error("Error creating case type:", error);
      res.status(500).json({ message: "Failed to create case type" });
    }
  });

  app.get("/api/case-types/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const caseTypeWithOriginations = await storage.getCaseTypeWithOriginations(id);
      res.json(caseTypeWithOriginations);
    } catch (error) {
      console.error("Error fetching case type:", error);
      res.status(404).json({ message: "Case type not found" });
    }
  });

  app.put("/api/case-types/:id", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, color, originationIds } = req.body;
      const caseType = await storage.updateCaseType(id, {
        name,
        description,
        color,
      }, originationIds);
      res.json(caseType);
    } catch (error) {
      console.error("Error updating case type:", error);
      res.status(500).json({ message: "Failed to update case type" });
    }
  });

  app.delete("/api/case-types/:id", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { id } = req.params;
      
      // Check if there are existing dependencies (cases and categories) using this case type
      const { casesCount, categoriesCount } = await storage.getCaseTypeDependencies(id);
      
      if (casesCount > 0 || categoriesCount > 0) {
        const dependencies = [];
        if (casesCount > 0) dependencies.push(`${casesCount} existing cases`);
        if (categoriesCount > 0) dependencies.push(`${categoriesCount} categories`);
        
        const dependenciesText = dependencies.join(' and ');
        const actionText = casesCount > 0 ? 'resolve or reassign these cases' : 'remove these categories';
        
        return res.status(400).json({ 
          message: `Cannot delete case type. There are ${dependenciesText} using this case type. Please ${actionText} before deleting.`,
          code: 'FOREIGN_KEY_CONSTRAINT'
        });
      }
      
      await storage.deleteCaseType(id);
      res.json({ message: "Case type deleted successfully" });
    } catch (error) {
      console.error("Error deleting case type:", error);
      
      // Check if it's a foreign key constraint error
      if ((error as any).code === '23503' || (error as any).message?.includes('foreign key')) {
        return res.status(400).json({ 
          message: "Cannot delete case type because it is being referenced by existing data. Please remove all references first.",
          code: 'FOREIGN_KEY_CONSTRAINT'
        });
      }
      
      res.status(500).json({ message: "Failed to delete case type" });
    }
  });

  // Categories Admin Management
  app.post("/api/categories", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { name, description, caseTypeIds } = req.body;
      const category = await storage.createCategory({
        name,
        description,
        code: name.toUpperCase().replace(/\s+/g, '_'),
      }, caseTypeIds);
      res.status(201).json(category);
    } catch (error) {
      console.error("Error creating category:", error);
      res.status(500).json({ message: "Failed to create category" });
    }
  });

  app.get("/api/categories/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const categoryWithCaseTypes = await storage.getCategoryWithCaseTypes(id);
      res.json(categoryWithCaseTypes);
    } catch (error) {
      console.error("Error fetching category:", error);
      res.status(404).json({ message: "Category not found" });
    }
  });

  app.put("/api/categories/:id", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, caseTypeIds } = req.body;
      const category = await storage.updateCategory(id, {
        name,
        description,
      }, caseTypeIds);
      res.json(category);
    } catch (error) {
      console.error("Error updating category:", error);
      res.status(500).json({ message: "Failed to update category" });
    }
  });

  app.delete("/api/categories/:id", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteCategory(id);
      res.json({ message: "Category deleted successfully" });
    } catch (error) {
      console.error("Error deleting category:", error);
      res.status(500).json({ message: "Failed to delete category" });
    }
  });

  // Business Rules Management
  app.get("/api/priority-rules", requireAuth, requireRole("compliance"), async (req, res) => {
    try {
      const rules = await storage.getAllPriorityRules();
      res.json(rules);
    } catch (error) {
      console.error("Error fetching priority rules:", error);
      res.status(500).json({ message: "Failed to fetch priority rules" });
    }
  });

  app.post("/api/priority-rules", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { name, description, priority, conditions, active } = req.body;
      const rule = await storage.createPriorityRule({
        name,
        description,
        priority,
        conditions,
        isActive: active,
      });
      res.status(201).json(rule);
    } catch (error) {
      console.error("Error creating priority rule:", error);
      res.status(500).json({ message: "Failed to create priority rule" });
    }
  });

  app.put("/api/priority-rules/:id", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, priority, conditions, active } = req.body;
      const rule = await storage.updatePriorityRule(id, {
        name,
        description,
        priority,
        conditions,
        isActive: active,
      });
      res.json(rule);
    } catch (error) {
      console.error("Error updating priority rule:", error);
      res.status(500).json({ message: "Failed to update priority rule" });
    }
  });

  app.delete("/api/priority-rules/:id", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deletePriorityRule(id);
      res.json({ message: "Priority rule deleted successfully" });
    } catch (error) {
      console.error("Error deleting priority rule:", error);
      res.status(500).json({ message: "Failed to delete priority rule" });
    }
  });

  // Tag Rules Management
  app.get("/api/tag-rules", requireAuth, requireRole("compliance"), async (req, res) => {
    try {
      const rules = await storage.getAllTagRules();
      res.json(rules);
    } catch (error) {
      console.error("Error fetching tag rules:", error);
      res.status(500).json({ message: "Failed to fetch tag rules" });
    }
  });

  app.post("/api/tag-rules", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { name, description, tag, conditions, active } = req.body;
      const rule = await storage.createTagRule({
        name,
        description,
        tag,
        conditions,
        isActive: active,
      });
      res.status(201).json(rule);
    } catch (error) {
      console.error("Error creating tag rule:", error);
      res.status(500).json({ message: "Failed to create tag rule" });
    }
  });

  app.put("/api/tag-rules/:id", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, tag, conditions, active } = req.body;
      const rule = await storage.updateTagRule(id, {
        name,
        description,
        tag,
        conditions,
        isActive: active,
      });
      res.json(rule);
    } catch (error) {
      console.error("Error updating tag rule:", error);
      res.status(500).json({ message: "Failed to update tag rule" });
    }
  });

  app.delete("/api/tag-rules/:id", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteTagRule(id);
      res.json({ message: "Tag rule deleted successfully" });
    } catch (error) {
      console.error("Error deleting tag rule:", error);
      res.status(500).json({ message: "Failed to delete tag rule" });
    }
  });

  // Checklist Assignment Rules Management
  app.get("/api/checklist-assignment-rules", requireAuth, requireRole("compliance"), async (req, res) => {
    try {
      const rules = await storage.getAllChecklistAssignmentRules();
      // Map database fields to frontend expected fields
      const mappedRules = rules.map(rule => ({
        ...rule,
        templateId: rule.reusableTemplateId, // Map reusableTemplateId to templateId for frontend
        active: rule.isActive, // Map isActive to active for frontend
      }));
      res.json({ data: mappedRules });
    } catch (error) {
      console.error("Error fetching checklist assignment rules:", error);
      res.status(500).json({ error: "Failed to fetch checklist assignment rules" });
    }
  });

  app.post("/api/checklist-assignment-rules", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { name, description, templateId, conditions, active } = req.body;
      const rule = await storage.createChecklistAssignmentRule({
        name,
        description,
        reusableTemplateId: templateId, // Map templateId to reusableTemplateId
        conditions,
        isActive: active !== undefined ? active : true,
      });
      res.status(201).json({ data: rule });
    } catch (error) {
      console.error("Error creating checklist assignment rule:", error);
      res.status(500).json({ error: "Failed to create checklist assignment rule" });
    }
  });

  app.put("/api/checklist-assignment-rules/:id", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, templateId, conditions, active } = req.body;
      const rule = await storage.updateChecklistAssignmentRule(id, {
        name,
        description,
        reusableTemplateId: templateId, // Map templateId to reusableTemplateId
        conditions,
        isActive: active,
      });
      res.json({ data: rule });
    } catch (error) {
      console.error("Error updating checklist assignment rule:", error);
      res.status(500).json({ error: "Failed to update checklist assignment rule" });
    }
  });

  app.delete("/api/checklist-assignment-rules/:id", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteChecklistAssignmentRule(id);
      res.json({ data: { message: "Checklist assignment rule deleted successfully" } });
    } catch (error) {
      console.error("Error deleting checklist assignment rule:", error);
      res.status(500).json({ error: "Failed to delete checklist assignment rule" });
    }
  });

  // SLA Policies Management
  app.get("/api/sla-policies", requireAuth, requireRole("compliance"), async (req, res) => {
    try {
      const policies = await storage.getAllSlaPolicies();
      res.json(policies);
    } catch (error) {
      console.error("Error fetching SLA policies:", error);
      res.status(500).json({ message: "Failed to fetch SLA policies" });
    }
  });

  app.post("/api/sla-policies", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { name, description, priority, responseTimeHours, resolutionTimeHours, conditions, active } = req.body;
      const policy = await storage.createSlaPolicy({
        name,
        description,
        priority,
        responseTimeHours,
        resolutionTimeHours,
        conditions,
        isActive: active,
      });
      res.status(201).json(policy);
    } catch (error) {
      console.error("Error creating SLA policy:", error);
      res.status(500).json({ message: "Failed to create SLA policy" });
    }
  });

  app.put("/api/sla-policies/:id", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, priority, responseTimeHours, resolutionTimeHours, conditions, active } = req.body;
      const policy = await storage.updateSlaPolicy(id, {
        name,
        description,
        priority,
        responseTimeHours,
        resolutionTimeHours,
        conditions,
        isActive: active,
      });
      res.json(policy);
    } catch (error) {
      console.error("Error updating SLA policy:", error);
      res.status(500).json({ message: "Failed to update SLA policy" });
    }
  });

  app.delete("/api/sla-policies/:id", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteSlaPolicy(id);
      res.json({ message: "SLA policy deleted successfully" });
    } catch (error) {
      console.error("Error deleting SLA policy:", error);
      res.status(500).json({ message: "Failed to delete SLA policy" });
    }
  });

  // Rule Testing API
  app.post("/api/rules/test", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { caseData, ruleType, categoryId } = req.body;
      
      if (!caseData || !ruleType) {
        return res.status(400).json({ error: "Missing required fields: caseData, ruleType" });
      }

      // Import rule evaluation functions
      const { findMatchingPriorityRule, findMatchingTagRules, RuleEvaluator } = await import('./rule-engine.js');
      
      let results = [];

      if (ruleType === 'priority') {
        // Test priority rules
        const priorityRulesForCategory = await storage.getAllPriorityRules();
        const filteredRules = categoryId 
          ? priorityRulesForCategory.filter(rule => rule.categoryId === categoryId)
          : priorityRulesForCategory;

        for (const rule of filteredRules) {
          try {
            let conditions;
            try {
              conditions = typeof rule.conditions === 'string' 
                ? JSON.parse(rule.conditions) 
                : rule.conditions;
            } catch (parseError) {
              conditions = [];
            }

            const conditionResults = [];
            let matchedConditions = 0;

            // Test each condition
            for (const condition of conditions) {
              const testResult = RuleEvaluator.testCondition(condition, caseData);
              const matched = testResult.result;
              const actualValue = testResult.fieldValue;
              
              conditionResults.push({
                field: condition.field,
                operator: condition.operator,
                value: condition.value,
                actualValue,
                matched,
                reason: matched ? undefined : `Expected ${condition.operator} ${condition.value}, got ${actualValue}`
              });

              if (matched) matchedConditions++;
            }

            const ruleMatched = matchedConditions === conditions.length && conditions.length > 0;

            results.push({
              ruleId: rule.id,
              ruleName: rule.name,
              ruleType: 'priority',
              matched: ruleMatched,
              matchedConditions,
              totalConditions: conditions.length,
              conditionResults,
              resultValue: ruleMatched ? rule.priority : undefined
            });
          } catch (ruleError) {
            console.error(`Error testing priority rule ${rule.id}:`, ruleError);
            const errorMessage = ruleError instanceof Error ? ruleError.message : 'Unknown error';
            results.push({
              ruleId: rule.id,
              ruleName: rule.name,
              ruleType: 'priority',
              matched: false,
              matchedConditions: 0,
              totalConditions: 0,
              conditionResults: [{
                field: 'error',
                operator: 'test',
                value: 'N/A',
                actualValue: 'Error evaluating rule',
                matched: false,
                reason: errorMessage
              }],
              resultValue: undefined
            });
          }
        }
      } else if (ruleType === 'tag') {
        // Test tag rules
        const tagRulesForCategory = await storage.getAllTagRules();
        const filteredRules = categoryId 
          ? tagRulesForCategory.filter(rule => rule.categoryId === categoryId)
          : tagRulesForCategory;

        for (const rule of filteredRules) {
          try {
            let conditions;
            try {
              conditions = typeof rule.conditions === 'string' 
                ? JSON.parse(rule.conditions) 
                : rule.conditions;
            } catch (parseError) {
              conditions = [];
            }

            const conditionResults = [];
            let matchedConditions = 0;

            // Test each condition
            for (const condition of conditions) {
              const testResult = RuleEvaluator.testCondition(condition, caseData);
              const matched = testResult.result;
              const actualValue = testResult.fieldValue;
              
              conditionResults.push({
                field: condition.field,
                operator: condition.operator,
                value: condition.value,
                actualValue,
                matched,
                reason: matched ? undefined : `Expected ${condition.operator} ${condition.value}, got ${actualValue}`
              });

              if (matched) matchedConditions++;
            }

            const ruleMatched = matchedConditions === conditions.length && conditions.length > 0;

            results.push({
              ruleId: rule.id,
              ruleName: rule.name,
              ruleType: 'tag',
              matched: ruleMatched,
              matchedConditions,
              totalConditions: conditions.length,
              conditionResults,
              resultValue: ruleMatched ? rule.tag : undefined
            });
          } catch (ruleError) {
            console.error(`Error testing tag rule ${rule.id}:`, ruleError);
            const errorMessage = ruleError instanceof Error ? ruleError.message : 'Unknown error';
            results.push({
              ruleId: rule.id,
              ruleName: rule.name,
              ruleType: 'tag',
              matched: false,
              matchedConditions: 0,
              totalConditions: 0,
              conditionResults: [{
                field: 'error',
                operator: 'test',
                value: 'N/A',
                actualValue: 'Error evaluating rule',
                matched: false,
                reason: errorMessage
              }],
              resultValue: undefined
            });
          }
        }
      } else {
        return res.status(400).json({ error: "Invalid ruleType. Must be 'priority' or 'tag'" });
      }

      res.json({ results });
    } catch (error) {
      console.error("Rule testing error:", error);
      res.status(500).json({ error: "Failed to test rules" });
    }
  });

  // Reusable Checklist Templates Management
  app.get("/api/reusable-checklist-templates", requireAuth, async (req, res) => {
    try {
      const templates = await storage.getReusableChecklistTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching reusable checklist templates:", error);
      res.status(500).json({ message: "Failed to fetch reusable checklist templates" });
    }
  });

  app.get("/api/reusable-checklist-templates/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const template = await storage.getReusableChecklistTemplateWithItems(id);
      res.json(template);
    } catch (error) {
      console.error("Error fetching reusable checklist template:", error);
      if (error instanceof Error && error.message === "Template not found") {
        res.status(404).json({ message: "Reusable checklist template not found" });
      } else {
        res.status(500).json({ message: "Failed to fetch reusable checklist template" });
      }
    }
  });

  app.post("/api/reusable-checklist-templates", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { name, description, categoryId, isReusable, isActive } = req.body;
      const template = await storage.createReusableChecklistTemplate({
        name,
        description,
        categoryId: categoryId || null,
        isReusable: isReusable !== undefined ? isReusable : true,
        isActive: isActive !== undefined ? isActive : true,
      });
      res.status(201).json(template);
    } catch (error) {
      console.error("Error creating reusable checklist template:", error);
      res.status(500).json({ message: "Failed to create reusable checklist template" });
    }
  });

  app.put("/api/reusable-checklist-templates/:id", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, categoryId, isReusable, isActive } = req.body;
      const template = await storage.updateReusableChecklistTemplate(id, {
        name,
        description,
        categoryId: categoryId !== undefined ? categoryId : undefined,
        isReusable: isReusable !== undefined ? isReusable : undefined,
        isActive,
      });
      res.json(template);
    } catch (error) {
      console.error("Error updating reusable checklist template:", error);
      res.status(500).json({ message: "Failed to update reusable checklist template" });
    }
  });

  app.delete("/api/reusable-checklist-templates/:id", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteReusableChecklistTemplate(id);
      res.json({ message: "Reusable checklist template deleted successfully" });
    } catch (error) {
      console.error("Error deleting reusable checklist template:", error);
      res.status(500).json({ message: "Failed to delete reusable checklist template" });
    }
  });

  // Reusable Checklist Items Management
  app.get("/api/reusable-checklist-templates/:templateId/items", requireAuth, async (req, res) => {
    try {
      const { templateId } = req.params;
      const items = await storage.getReusableChecklistItems(templateId);
      res.json(items);
    } catch (error) {
      console.error("Error fetching reusable checklist items:", error);
      res.status(500).json({ message: "Failed to fetch reusable checklist items" });
    }
  });

  app.post("/api/reusable-checklist-templates/:templateId/items", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { templateId } = req.params;
      const { key, label, description, isRequired, sortOrder, helpText, estimatedDuration, fieldType, fieldOptions, defaultValue, conditionJson } = req.body;
      
      // Validate field type
      const validFieldTypes = ['checkbox', 'dropdown', 'text', 'number', 'date', 'file'];
      const sanitizedFieldType = fieldType && validFieldTypes.includes(fieldType) ? fieldType : 'checkbox';
      
      // Validate field options (must be array for dropdown)
      let sanitizedFieldOptions = null;
      if (sanitizedFieldType === 'dropdown' && Array.isArray(fieldOptions)) {
        sanitizedFieldOptions = fieldOptions.filter(opt => typeof opt === 'string');
      }
      
      const item = await storage.createReusableChecklistItem({
        templateId,
        key,
        label,
        description,
        isRequired: isRequired || false,
        sortOrder: sortOrder || 0,
        helpText,
        estimatedDuration,
        fieldType: sanitizedFieldType,
        fieldOptions: sanitizedFieldOptions,
        defaultValue: defaultValue || null,
        conditionJson: conditionJson || null,
      });
      res.status(201).json(item);
    } catch (error) {
      console.error("Error creating reusable checklist item:", error);
      res.status(500).json({ message: "Failed to create reusable checklist item" });
    }
  });

  app.put("/api/reusable-checklist-items/:id", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { id } = req.params;
      const { key, label, description, isRequired, sortOrder, helpText, estimatedDuration, fieldType, fieldOptions, defaultValue, conditionJson } = req.body;
      
      // Validate field type
      const validFieldTypes = ['checkbox', 'dropdown', 'text', 'number', 'date', 'file'];
      let sanitizedFieldType = undefined;
      if (fieldType !== undefined) {
        sanitizedFieldType = validFieldTypes.includes(fieldType) ? fieldType : undefined;
      }
      
      // Validate field options (must be array for dropdown)
      let sanitizedFieldOptions = undefined;
      if (fieldOptions !== undefined) {
        if (Array.isArray(fieldOptions)) {
          sanitizedFieldOptions = fieldOptions.filter(opt => typeof opt === 'string');
        } else {
          sanitizedFieldOptions = null;
        }
      }
      
      const item = await storage.updateReusableChecklistItem(id, {
        key,
        label,
        description,
        isRequired,
        sortOrder,
        helpText,
        estimatedDuration,
        fieldType: sanitizedFieldType,
        fieldOptions: sanitizedFieldOptions,
        defaultValue,
        conditionJson,
      });
      res.json(item);
    } catch (error) {
      console.error("Error updating reusable checklist item:", error);
      res.status(500).json({ message: "Failed to update reusable checklist item" });
    }
  });

  app.delete("/api/reusable-checklist-items/:id", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteReusableChecklistItem(id);
      res.json({ message: "Reusable checklist item deleted successfully" });
    } catch (error) {
      console.error("Error deleting reusable checklist item:", error);
      res.status(500).json({ message: "Failed to delete reusable checklist item" });
    }
  });

  // Document Requirements Management  
  app.get("/api/categories/:categoryId/document-requirements", requireAuth, async (req, res) => {
    try {
      const { categoryId } = req.params;
      const requirements = await storage.getDocumentRequirements(categoryId);
      res.json(requirements);
    } catch (error) {
      console.error("Error fetching document requirements:", error);
      res.status(500).json({ message: "Failed to fetch document requirements" });
    }
  });

  app.post("/api/categories/:categoryId/document-requirements", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { categoryId } = req.params;
      const { key, label, isRequired, mimeWhitelist, conditionJson } = req.body;
      const requirement = await storage.createDocumentRequirement({
        categoryId,
        key,
        label,
        isRequired: isRequired || false,
        mimeWhitelist,
        conditionJson,
      });
      res.status(201).json(requirement);
    } catch (error) {
      console.error("Error creating document requirement:", error);
      res.status(500).json({ message: "Failed to create document requirement" });
    }
  });

  app.put("/api/document-requirements/:id", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { id } = req.params;
      const { key, label, isRequired, mimeWhitelist, conditionJson } = req.body;
      const requirement = await storage.updateDocumentRequirement(id, {
        key,
        label,
        isRequired,
        mimeWhitelist,
        conditionJson,
      });
      res.json(requirement);
    } catch (error) {
      console.error("Error updating document requirement:", error);
      res.status(500).json({ message: "Failed to update document requirement" });
    }
  });

  app.delete("/api/document-requirements/:id", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteDocumentRequirement(id);
      res.json({ message: "Document requirement deleted successfully" });
    } catch (error) {
      console.error("Error deleting document requirement:", error);
      res.status(500).json({ message: "Failed to delete document requirement" });
    }
  });

  // Document Management
  app.get("/api/cases/:caseId/documents", requireAuth, async (req, res) => {
    try {
      const { caseId } = req.params;
      const documents = await storage.getDocuments(caseId);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  app.post("/api/cases/:caseId/documents/upload", requireAuth, upload.single('file'), async (req, res) => {
    try {
      const { caseId } = req.params;
      const { key, label } = req.body;
      const file = req.file;
      const userId = req.user!.id;

      if (!file) {
        return res.status(400).json({ message: "No file provided" });
      }

      // Generate unique storage key for object storage
      const timestamp = Date.now();
      const sanitizedFileName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
      const storageKey = `cases/${caseId}/documents/${timestamp}_${sanitizedFileName}`;

      // Determine file type from MIME type
      const getFileTypeFromMime = (mimeType: string): string => {
        if (mimeType.startsWith('image/')) return 'IMAGE';
        if (mimeType === 'application/pdf') return 'PDF';
        if (mimeType.includes('document') || mimeType.includes('word')) return 'DOCUMENT';
        if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'SPREADSHEET';
        return 'OTHER';
      };

      // Upload file to object storage
      const { ObjectStorageService } = await import('./objectStorage');
      const objectStorageService = new ObjectStorageService();
      
      try {
        await objectStorageService.uploadFile(storageKey, file.buffer, file.mimetype);
        
        // Set ACL policy for the uploaded file (private, owned by uploader)
        await objectStorageService.setFileAclPolicy(storageKey, {
          owner: userId,
          visibility: 'private',
        });
        
        console.log(`File uploaded successfully: ${file.originalname}, Size: ${file.size} bytes`);
      } catch (uploadError) {
        console.error('Error uploading file to object storage:', uploadError);
        return res.status(500).json({ message: "Failed to upload file to storage" });
      }

      // Create document record in database
      const document = await storage.createDocument({
        caseId,
        key: key || 'uploaded_document',
        label: label || file.originalname,
        fileType: getFileTypeFromMime(file.mimetype),
        mime: file.mimetype,
        storageKey,
        uploadedByUserId: userId,
      });

      res.status(201).json({
        document,
        message: "File uploaded successfully"
      });
    } catch (error) {
      console.error("Error uploading document:", error);
      res.status(500).json({ message: "Failed to upload document" });
    }
  });

  app.get("/api/documents/:id/download", requireAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      // Get document from database to retrieve storage key
      const document = await storage.getDocument(id);
      
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      // Get the associated case to check access
      const caseData = await storage.getCase(document.caseId);
      if (!caseData) {
        return res.status(404).json({ message: "Associated case not found" });
      }

      // Check user permissions for the case
      if (req.user.restrictedLenderId && caseData.lenderId !== req.user.restrictedLenderId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Download file from object storage
      const { ObjectStorageService } = await import('./objectStorage');
      const { ObjectPermission } = await import('./objectAcl');
      const objectStorageService = new ObjectStorageService();
      
      try {
        const file = await objectStorageService.getFile(document.storageKey);
        
        // Check ACL permissions
        const canAccess = await objectStorageService.canAccessObjectEntity({
          userId,
          objectFile: file,
          requestedPermission: ObjectPermission.READ,
        });

        if (!canAccess) {
          return res.status(403).json({ message: "Access denied to document" });
        }

        // Set download header to prompt download with original filename
        res.set({
          'Content-Disposition': `attachment; filename="${document.label}"`,
        });

        // Stream the file to response
        await objectStorageService.downloadObject(file, res);
      } catch (storageError: any) {
        console.error("Error downloading from object storage:", storageError);
        if (storageError.name === 'ObjectNotFoundError') {
          return res.status(404).json({ message: "File not found in storage" });
        }
        return res.status(500).json({ message: "Failed to download file" });
      }
    } catch (error) {
      console.error("Error downloading document:", error);
      res.status(500).json({ message: "Failed to download document" });
    }
  });

  app.delete("/api/documents/:id", requireAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      // Check if user has permission to delete
      checkUserPermissions.canDelete(req.user);

      // Get document to retrieve storage key before deleting from DB
      const document = await storage.getDocument(id);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      // Get object storage service and check ACL
      const { ObjectStorageService } = await import('./objectStorage');
      const { ObjectPermission } = await import('./objectAcl');
      const objectStorageService = new ObjectStorageService();
      
      try {
        const file = await objectStorageService.getFile(document.storageKey);
        
        // Check ACL permissions - user must be owner or have write permission
        const canDelete = await objectStorageService.canAccessObjectEntity({
          userId,
          objectFile: file,
          requestedPermission: ObjectPermission.WRITE,
        });

        if (!canDelete) {
          return res.status(403).json({ message: "Access denied: you must be the document owner to delete it" });
        }

        // Delete from object storage
        await objectStorageService.deleteFile(document.storageKey);
      } catch (storageError: any) {
        if (storageError.name === 'ObjectNotFoundError') {
          console.warn("File not found in storage, continuing with database deletion");
        } else {
          console.error("Error deleting file from object storage:", storageError);
          return res.status(500).json({ message: "Failed to delete file from storage" });
        }
      }

      // Delete from database
      await storage.deleteDocument(id);
      
      res.json({ message: "Document deleted successfully" });
    } catch (error) {
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      console.error("Error deleting document:", error);
      res.status(500).json({ message: "Failed to delete document" });
    }
  });

  // Checklist Items Management
  app.get("/api/cases/:caseId/checklist-items", requireAuth, async (req, res) => {
    try {
      const { caseId } = req.params;
      const checklistItems = await storage.getChecklistItems(caseId);
      res.json(checklistItems);
    } catch (error) {
      console.error("Error fetching checklist items:", error);
      res.status(500).json({ message: "Failed to fetch checklist items" });
    }
  });

  app.put("/api/checklist-items/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { status, assignedToUserId } = req.body;
      const userId = req.user!.id;

      const updates: any = {};
      if (status !== undefined) {
        updates.status = status;
        if (status === "complete") {
          updates.completedAt = new Date();
        } else {
          updates.completedAt = null;
        }
      }
      if (assignedToUserId !== undefined) {
        updates.assignedToUserId = assignedToUserId;
      }

      const item = await storage.updateChecklistItem(id, updates);
      res.json(item);
    } catch (error) {
      console.error("Error updating checklist item:", error);
      res.status(500).json({ message: "Failed to update checklist item" });
    }
  });

  app.post("/api/checklist-items/:id/complete", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const item = await storage.updateChecklistItem(id, {
        status: "complete",
        completedAt: new Date(),
        assignedToUserId: userId,
      });

      res.json(item);
    } catch (error) {
      console.error("Error completing checklist item:", error);
      res.status(500).json({ message: "Failed to complete checklist item" });
    }
  });

  app.post("/api/checklist-items/:id/reopen", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;

      const item = await storage.updateChecklistItem(id, {
        status: "open",
        completedAt: null,
      });

      res.json(item);
    } catch (error) {
      console.error("Error reopening checklist item:", error);
      res.status(500).json({ message: "Failed to reopen checklist item" });
    }
  });

  // GET /api/cases/:id/dynamic-checklist - Get dynamically evaluated checklist for a case
  app.get("/api/cases/:id/dynamic-checklist", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const dynamicChecklist = await storage.evaluateDynamicChecklist(id);
      res.json({ data: dynamicChecklist });
    } catch (error) {
      console.error("Failed to evaluate dynamic checklist:", error);
      res.status(500).json({ error: "Failed to evaluate dynamic checklist" });
    }
  });

  // POST /api/cases/:caseId/checklist/:key/complete - Mark a dynamic checklist item as complete
  app.post("/api/cases/:caseId/checklist/:key/complete", requireAuth, async (req: any, res) => {
    try {
      const { caseId, key } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      // Check if a checklist item record already exists for this case+key
      const existingItems = await storage.getChecklistItems(caseId);
      const existingItem = existingItems.find(item => item.key === key);

      let item;
      if (existingItem) {
        // Update existing item
        item = await storage.updateChecklistItem(existingItem.id, {
          status: "complete",
          completedAt: new Date(),
          assignedToUserId: userId,
        });
      } else {
        // Create new completion record with minimal data
        item = await storage.createChecklistItem({
          caseId,
          key,
          label: key, // Use key as label temporarily
          isRequired: false,
          status: "complete",
          completedAt: new Date(),
          assignedToUserId: userId,
        });
      }

      // Log the completion in audit log
      await storage.createAuditLog({
        caseId,
        actorUserId: userId,
        action: "checklist_item_completed",
        details: { key, checklistItemId: item.id }
      });

      res.json({ data: item });
    } catch (error) {
      console.error("Failed to complete dynamic checklist item:", error);
      res.status(500).json({ error: "Failed to complete checklist item" });
    }
  });

  // POST /api/cases/:caseId/checklist/:key/reopen - Reopen a dynamic checklist item
  app.post("/api/cases/:caseId/checklist/:key/reopen", requireAuth, async (req: any, res) => {
    try {
      const { caseId, key } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      // Find the existing checklist item record
      const existingItems = await storage.getChecklistItems(caseId);
      const existingItem = existingItems.find(item => item.key === key);

      if (!existingItem) {
        // If no record exists, there's nothing to reopen
        return res.status(404).json({ error: "Checklist item not found" });
      }

      // Update to open status
      const item = await storage.updateChecklistItem(existingItem.id, {
        status: "open",
        completedAt: null,
      });

      // Log the reopening in audit log
      await storage.createAuditLog({
        caseId,
        actorUserId: userId,
        action: "checklist_item_reopened",
        details: { key, checklistItemId: item.id }
      });

      res.json({ data: item });
    } catch (error) {
      console.error("Failed to reopen dynamic checklist item:", error);
      res.status(500).json({ error: "Failed to reopen checklist item" });
    }
  });

  // POST /api/cases/:caseId/checklist/:key/value - Save field value for a dynamic checklist item
  app.post("/api/cases/:caseId/checklist/:key/value", requireAuth, async (req: any, res) => {
    try {
      const { caseId, key } = req.params;
      const { value } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      // Check if a checklist item record already exists for this case+key
      const existingItems = await storage.getChecklistItems(caseId);
      const existingItem = existingItems.find(item => item.key === key);

      let item;
      if (existingItem) {
        // Update existing item with the new value
        item = await storage.updateChecklistItem(existingItem.id, {
          fieldValue: value,
        });
      } else {
        // Create new checklist item with the value
        item = await storage.createChecklistItem({
          caseId,
          key,
          label: key,
          isRequired: false,
          status: "open",
          fieldValue: value,
        });
      }

      // Log the activity
      await storage.createAuditLog({
        caseId,
        actorUserId: userId,
        action: "checklist_item_value_saved",
        details: { key, value, checklistItemId: item.id }
      });

      res.json({ data: item });
    } catch (error) {
      console.error("Failed to save field value:", error);
      res.status(500).json({ error: "Failed to save field value" });
    }
  });

  // Get all users for user management
  app.get("/api/users", requireAuth, async (req, res) => {
    try {
      // Return all database users regardless of role or status
      const users = await storage.getAllUsers();
      // Mask the outlookClientSecret in all users
      const sanitizedUsers = users.map(user => ({
        ...user,
        outlookClientSecret: user.outlookClientSecret ? "***REDACTED***" : null
      }));
      res.json(sanitizedUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Update user (admin only)
  app.put("/api/users/:id", requireRole("admin"), async (req, res) => {
    try {
      const { id } = req.params;
      const { hashPassword } = await import("./auth");
      
      const updateSchema = z.object({
        username: z.string().min(1).optional(),
        password: z.string().min(6).or(z.literal("")).optional(),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        email: z.string().email().or(z.literal("")).optional(),
        role: z.enum(["admin", "compliance", "agent"]).optional(),
        active: z.boolean().optional(),
        restrictedLenderId: z.string().nullable().optional(),
        isViewOnly: z.boolean().optional(),
        canResolve: z.boolean().optional(),
        canDelete: z.boolean().optional(),
        canAssign: z.boolean().optional(),
        // Email configuration fields
        emailEnabled: z.boolean().optional(),
        outlookEmail: z.string().optional(),
        outlookClientId: z.string().optional(),
        outlookTenantId: z.string().optional(),
        outlookClientSecret: z.string().optional(),
        outlookRedirectUri: z.string().optional(),
      });

      const validatedData = updateSchema.parse(req.body);
      
      // Build update object, excluding empty password
      const updates: any = {};
      
      for (const [key, value] of Object.entries(validatedData)) {
        if (key === 'password') {
          // Only update password if it's provided and not empty
          if (value && value !== '') {
            updates.password = await hashPassword(value as string);
          }
        } else if (key === 'outlookClientSecret') {
          // Only update secret if provided and not empty, otherwise preserve existing
          if (value && value !== '') {
            updates.outlookClientSecret = value;
          }
        } else if (key === 'firstName' || key === 'lastName') {
          // Update firstName/lastName
          updates[key] = value;
          
          // Also update name field for compatibility
          if (!updates.name) {
            const user = await storage.getUser(id);
            if (user) {
              const firstName = key === 'firstName' ? value : user.firstName || user.name?.split(' ')[0] || '';
              const lastName = key === 'lastName' ? value : user.lastName || user.name?.split(' ').slice(1).join(' ') || '';
              updates.name = `${firstName} ${lastName}`.trim();
            }
          }
        } else if (key === 'restrictedLenderId') {
          // Handle null value for lender restriction
          updates.restrictedLenderId = value || null;
        } else if (value !== undefined) {
          updates[key] = value;
        }
      }

      const updatedUser = await storage.updateUser(id, updates);
      
      res.json({
        id: updatedUser.id,
        username: updatedUser.username,
        name: updatedUser.name,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
        role: updatedUser.role,
        status: updatedUser.status,
        restrictedLenderId: updatedUser.restrictedLenderId,
        isViewOnly: updatedUser.isViewOnly,
        canResolve: updatedUser.canResolve,
        canDelete: updatedUser.canDelete,
        canAssign: updatedUser.canAssign,
        emailEnabled: updatedUser.emailEnabled,
        outlookEmail: updatedUser.outlookEmail,
        outlookClientId: updatedUser.outlookClientId,
        outlookTenantId: updatedUser.outlookTenantId,
        outlookClientSecret: updatedUser.outlookClientSecret ? "***REDACTED***" : null,
        outlookRedirectUri: updatedUser.outlookRedirectUri,
        createdAt: updatedUser.createdAt,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid user data", details: error.errors });
      }
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Delete user (admin only)
  app.delete("/api/users/:id", requireRole("admin"), async (req, res) => {
    try {
      const { id } = req.params;

      // Check if user exists
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Prevent self-deletion
      if (req.user && req.user.id === id) {
        return res.status(400).json({ error: "Cannot delete your own account" });
      }

      // Attempt deletion - storage will handle foreign key checks
      await storage.deleteUser(id);

      res.json({ success: true, message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      
      // Check if error is about foreign key constraints
      if (error instanceof Error && error.message.includes("Cannot delete user")) {
        return res.status(400).json({ error: error.message });
      }
      
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  // Create new user (admin only)
  app.post("/api/users", requireRole("admin"), async (req, res) => {
    try {
      const { hashPassword } = await import("./auth");
      
      const createSchema = z.object({
        username: z.string().min(1, "Username is required"),
        password: z.string().min(6, "Password must be at least 6 characters"),
        firstName: z.string().min(1, "First name is required"),
        lastName: z.string().min(1, "Last name is required"),
        email: z.string().email().or(z.literal("")).optional(),
        role: z.enum(["admin", "compliance", "agent"]),
        active: z.boolean().default(true),
        restrictedLenderId: z.string().nullable().optional(),
        isViewOnly: z.boolean().default(false),
        canResolve: z.boolean().default(true),
        canDelete: z.boolean().default(false),
        canAssign: z.boolean().default(true),
        // Email configuration fields
        emailEnabled: z.boolean().default(false),
        outlookEmail: z.string().optional(),
        outlookClientId: z.string().optional(),
        outlookTenantId: z.string().optional(),
        outlookClientSecret: z.string().optional(),
        outlookRedirectUri: z.string().optional(),
      });

      const validatedData = createSchema.parse(req.body);
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(validatedData.username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }

      const newUser = await storage.createUser({
        username: validatedData.username,
        password: await hashPassword(validatedData.password),
        name: `${validatedData.firstName} ${validatedData.lastName}`.trim(),
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        email: validatedData.email || null,
        role: validatedData.role,
        status: validatedData.active ? "active" : "inactive",
        restrictedLenderId: validatedData.restrictedLenderId || null,
        isViewOnly: validatedData.isViewOnly,
        canResolve: validatedData.canResolve,
        canDelete: validatedData.canDelete,
        canAssign: validatedData.canAssign,
        emailEnabled: validatedData.emailEnabled,
        outlookEmail: validatedData.outlookEmail || null,
        outlookClientId: validatedData.outlookClientId || null,
        outlookTenantId: validatedData.outlookTenantId || null,
        outlookClientSecret: validatedData.outlookClientSecret || null,
        outlookRedirectUri: validatedData.outlookRedirectUri || null,
      });
      
      res.status(201).json({
        id: newUser.id,
        username: newUser.username,
        name: newUser.name,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
        role: newUser.role,
        status: newUser.status,
        restrictedLenderId: newUser.restrictedLenderId,
        isViewOnly: newUser.isViewOnly,
        canResolve: newUser.canResolve,
        canDelete: newUser.canDelete,
        canAssign: newUser.canAssign,
        emailEnabled: newUser.emailEnabled,
        outlookEmail: newUser.outlookEmail,
        outlookClientId: newUser.outlookClientId,
        outlookTenantId: newUser.outlookTenantId,
        outlookClientSecret: newUser.outlookClientSecret ? "***REDACTED***" : null,
        outlookRedirectUri: newUser.outlookRedirectUri,
        createdAt: newUser.createdAt,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid user data", details: error.errors });
      }
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  // Get all users with assignment status (admin only)
  app.get("/api/users/assignment-status", requireRole("admin"), async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      
      // Get assigned cases count for each user
      const assignmentData = await Promise.all(users.map(async user => {
        const assignedCases = await storage.getCases({ assignedToUserId: user.id });
        return {
          id: user.id,
          username: user.username,
          name: user.name,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          availabilityStatus: user.availabilityStatus,
          lastAssignedAt: user.lastAssignedAt,
          assignedCasesCount: assignedCases.length,
          createdAt: user.createdAt,
        };
      }));
      
      res.json({ data: assignmentData });
    } catch (error) {
      console.error("Error fetching user assignment status:", error);
      res.status(500).json({ message: "Failed to fetch user assignment status" });
    }
  });

  // Update user availability status (admin only)
  app.patch("/api/users/:id/availability", requireRole("admin"), async (req, res) => {
    try {
      const { id } = req.params;
      
      const updateSchema = z.object({
        availabilityStatus: z.enum(["available", "not_available"]),
      });
      
      const { availabilityStatus } = updateSchema.parse(req.body);
      
      const updatedUser = await storage.updateUserAvailability(id, availabilityStatus);
      
      res.json({
        id: updatedUser.id,
        username: updatedUser.username,
        name: updatedUser.name,
        availabilityStatus: updatedUser.availabilityStatus,
        lastAssignedAt: updatedUser.lastAssignedAt,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid availability status", details: error.errors });
      }
      console.error("Error updating user availability:", error);
      res.status(500).json({ message: "Failed to update user availability" });
    }
  });

  // Knowledge Base API Endpoints
  
  // Knowledge Base Categories
  app.get("/api/knowledge-base/categories", requireAuth, async (req, res) => {
    try {
      const categories = await storage.getKbCategories();
      res.json({ data: categories });
    } catch (error) {
      console.error("Error fetching knowledge base categories:", error);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  app.get("/api/knowledge-base/categories/:id", requireAuth, async (req, res) => {
    try {
      const category = await storage.getKbCategory(req.params.id);
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      res.json({ data: category });
    } catch (error) {
      console.error("Error fetching knowledge base category:", error);
      res.status(500).json({ message: "Failed to fetch category" });
    }
  });

  app.post("/api/knowledge-base/categories", requireRole(["admin", "compliance"]), async (req, res) => {
    try {
      const categoryData = insertKbCategorySchema.parse(req.body);
      const category = await storage.createKbCategory(categoryData);
      res.status(201).json({ data: category });
    } catch (error) {
      console.error("Error creating knowledge base category:", error);
      res.status(500).json({ message: "Failed to create category" });
    }
  });

  app.put("/api/knowledge-base/categories/:id", requireRole(["admin", "compliance"]), async (req, res) => {
    try {
      const updates = insertKbCategorySchema.partial().parse(req.body);
      const category = await storage.updateKbCategory(req.params.id, updates);
      res.json({ data: category });
    } catch (error) {
      console.error("Error updating knowledge base category:", error);
      res.status(500).json({ message: "Failed to update category" });
    }
  });

  app.delete("/api/knowledge-base/categories/:id", requireRole(["admin"]), async (req, res) => {
    try {
      await storage.deleteKbCategory(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting knowledge base category:", error);
      res.status(500).json({ message: "Failed to delete category" });
    }
  });

  // Knowledge Base Articles
  app.get("/api/knowledge-base/articles", requireAuth, async (req, res) => {
    try {
      const querySchema = z.object({
        categoryId: z.string().optional(),
        status: z.string().optional(),
        visibility: z.string().optional(),
        search: z.string().optional(),
        limit: z.coerce.number().optional(),
        offset: z.coerce.number().optional(),
      });
      
      const filters = querySchema.parse(req.query);
      const articles = await storage.getKbArticles(filters);
      res.json({ data: articles });
    } catch (error) {
      console.error("Error fetching knowledge base articles:", error);
      res.status(500).json({ message: "Failed to fetch articles" });
    }
  });

  app.get("/api/knowledge-base/articles/:id", requireAuth, async (req, res) => {
    try {
      const article = await storage.getKbArticle(req.params.id);
      if (!article) {
        return res.status(404).json({ message: "Article not found" });
      }
      
      // Check visibility permissions
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const userRole = req.user.role;
      const roleHierarchy = { 'admin': 3, 'compliance': 2, 'agent': 1 };
      const userLevel = roleHierarchy[userRole as keyof typeof roleHierarchy] || 0;
      const requiredLevel = roleHierarchy[article.visibility as keyof typeof roleHierarchy] || 0;
      
      if (userLevel < requiredLevel) {
        return res.status(403).json({ message: "Insufficient permissions to view article" });
      }
      
      // Increment view count
      await storage.incrementKbArticleViews(req.params.id);
      
      res.json({ data: article });
    } catch (error) {
      console.error("Error fetching knowledge base article:", error);
      res.status(500).json({ message: "Failed to fetch article" });
    }
  });

  app.get("/api/knowledge-base/articles/slug/:slug", requireAuth, async (req, res) => {
    try {
      const article = await storage.getKbArticleBySlug(req.params.slug);
      if (!article) {
        return res.status(404).json({ message: "Article not found" });
      }
      
      // Check visibility permissions
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const userRole = req.user.role;
      const roleHierarchy = { 'admin': 3, 'compliance': 2, 'agent': 1 };
      const userLevel = roleHierarchy[userRole as keyof typeof roleHierarchy] || 0;
      const requiredLevel = roleHierarchy[article.visibility as keyof typeof roleHierarchy] || 0;
      
      if (userLevel < requiredLevel) {
        return res.status(403).json({ message: "Insufficient permissions to view article" });
      }
      
      // Increment view count
      await storage.incrementKbArticleViews(article.id);
      
      res.json({ data: article });
    } catch (error) {
      console.error("Error fetching knowledge base article by slug:", error);
      res.status(500).json({ message: "Failed to fetch article" });
    }
  });

  app.post("/api/knowledge-base/articles", requireRole(["admin", "compliance"]), async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const validatedData = insertKbArticleSchema.parse(req.body);
      const articleData = {
        ...validatedData,
        authorId: req.user.id,
        lastModifiedBy: req.user.id,
      };
      const article = await storage.createKbArticle(articleData);
      
      // Create initial version
      await storage.createKbArticleVersion({
        articleId: article.id,
        versionNumber: 1,
        title: article.title,
        content: article.content,
        summary: article.summary,
        changeDescription: "Initial version",
        authorId: req.user.id,
        isPublished: article.status === "published",
      });
      
      res.status(201).json({ data: article });
    } catch (error) {
      console.error("Error creating knowledge base article:", error);
      res.status(500).json({ message: "Failed to create article" });
    }
  });

  app.put("/api/knowledge-base/articles/:id", requireRole(["admin", "compliance"]), async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const validatedUpdates = insertKbArticleSchema.partial().parse(req.body);
      const updates = {
        ...validatedUpdates,
        lastModifiedBy: req.user.id,
      };
      
      // Get current article for version tracking
      const currentArticle = await storage.getKbArticle(req.params.id);
      if (!currentArticle) {
        return res.status(404).json({ message: "Article not found" });
      }
      
      const article = await storage.updateKbArticle(req.params.id, updates);
      
      // Create new version if content changed
      if (updates.content && updates.content !== currentArticle.content) {
        const latestVersion = await storage.getLatestKbArticleVersion(req.params.id);
        const newVersionNumber = (latestVersion?.versionNumber || 0) + 1;
        
        await storage.createKbArticleVersion({
          articleId: req.params.id,
          versionNumber: newVersionNumber,
          title: updates.title || currentArticle.title,
          content: updates.content,
          summary: updates.summary || currentArticle.summary,
          changeDescription: "Content updated",
          authorId: req.user.id,
          isPublished: false,
        });
      }
      
      res.json({ data: article });
    } catch (error) {
      console.error("Error updating knowledge base article:", error);
      res.status(500).json({ message: "Failed to update article" });
    }
  });

  app.post("/api/knowledge-base/articles/:id/publish", requireRole(["admin", "compliance"]), async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const article = await storage.publishKbArticle(req.params.id, req.user.id);
      res.json({ data: article });
    } catch (error) {
      console.error("Error publishing knowledge base article:", error);
      res.status(500).json({ message: "Failed to publish article" });
    }
  });

  app.delete("/api/knowledge-base/articles/:id", requireRole(["admin"]), async (req, res) => {
    try {
      await storage.deleteKbArticle(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting knowledge base article:", error);
      res.status(500).json({ message: "Failed to delete article" });
    }
  });

  // Knowledge Base Search
  app.get("/api/knowledge-base/search", requireAuth, async (req, res) => {
    try {
      const querySchema = z.object({
        q: z.string().min(1),
        visibility: z.string().optional(),
        categoryId: z.string().optional(),
      });
      
      const { q, ...filters } = querySchema.parse(req.query);
      const articles = await storage.searchKbArticles(q, filters);
      res.json({ data: articles });
    } catch (error) {
      console.error("Error searching knowledge base:", error);
      res.status(500).json({ message: "Failed to search articles" });
    }
  });

  // Knowledge Base Article Versions
  app.get("/api/knowledge-base/articles/:id/versions", requireRole(["admin", "compliance"]), async (req, res) => {
    try {
      const versions = await storage.getKbArticleVersions(req.params.id);
      res.json({ data: versions });
    } catch (error) {
      console.error("Error fetching article versions:", error);
      res.status(500).json({ message: "Failed to fetch versions" });
    }
  });

  // Knowledge Base Change Events
  app.get("/api/knowledge-base/change-events", requireRole(["admin", "compliance"]), async (req, res) => {
    try {
      const querySchema = z.object({
        eventType: z.string().optional(),
        entityType: z.string().optional(),
        isProcessed: z.coerce.boolean().optional(),
        limit: z.coerce.number().optional(),
        offset: z.coerce.number().optional(),
      });
      
      const filters = querySchema.parse(req.query);
      const events = await storage.getKbChangeEvents(filters);
      res.json({ data: events });
    } catch (error) {
      console.error("Error fetching change events:", error);
      res.status(500).json({ message: "Failed to fetch change events" });
    }
  });

  app.post("/api/knowledge-base/change-events", requireRole(["admin", "compliance"]), async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const validatedData = insertKbChangeEventSchema.parse(req.body);
      const eventData = {
        ...validatedData,
        userId: req.user.id,
      };
      const event = await storage.createKbChangeEvent(eventData);
      res.status(201).json({ data: event });
    } catch (error) {
      console.error("Error creating change event:", error);
      res.status(500).json({ message: "Failed to create change event" });
    }
  });

  app.put("/api/knowledge-base/change-events/:id/processed", requireRole(["admin", "compliance"]), async (req, res) => {
    try {
      const { relatedArticleId } = req.body;
      const event = await storage.markKbChangeEventProcessed(req.params.id, relatedArticleId);
      res.json({ data: event });
    } catch (error) {
      console.error("Error marking change event as processed:", error);
      res.status(500).json({ message: "Failed to mark event as processed" });
    }
  });

  // Knowledge Base Article Links
  app.get("/api/knowledge-base/articles/:id/links", requireAuth, async (req, res) => {
    try {
      const links = await storage.getKbArticleLinks(req.params.id);
      res.json({ data: links });
    } catch (error) {
      console.error("Error fetching article links:", error);
      res.status(500).json({ message: "Failed to fetch article links" });
    }
  });

  app.get("/api/knowledge-base/linked-articles/:entityType/:entityId", requireAuth, async (req, res) => {
    try {
      const { entityType, entityId } = req.params;
      const links = await storage.getKbLinkedArticles(entityType, entityId);
      res.json({ data: links });
    } catch (error) {
      console.error("Error fetching linked articles:", error);
      res.status(500).json({ message: "Failed to fetch linked articles" });
    }
  });

  app.post("/api/knowledge-base/article-links", requireRole(["admin", "compliance"]), async (req, res) => {
    try {
      const linkData = insertKbArticleLinkSchema.parse(req.body);
      const link = await storage.createKbArticleLink(linkData);
      res.status(201).json({ data: link });
    } catch (error) {
      console.error("Error creating article link:", error);
      res.status(500).json({ message: "Failed to create article link" });
    }
  });

  app.delete("/api/knowledge-base/article-links/:id", requireRole(["admin", "compliance"]), async (req, res) => {
    try {
      await storage.deleteKbArticleLink(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting article link:", error);
      res.status(500).json({ message: "Failed to delete article link" });
    }
  });

  // Email Templates API Endpoints

  // GET /api/email-templates - Get all email templates with optional filters
  app.get("/api/email-templates", requireAuth, async (req, res) => {
    try {
      const querySchema = z.object({
        category: z.enum(["lender", "customer", "internal", "other"]).optional(),
        isActive: z.coerce.boolean().optional(),
      });

      const filters = querySchema.parse(req.query);
      const templates = await storage.getEmailTemplates(filters);
      res.json({ data: templates });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid query parameters", details: error.errors });
      }
      console.error("Failed to fetch email templates:", error);
      res.status(500).json({ error: "Failed to fetch email templates" });
    }
  });

  // GET /api/email-templates/:id - Get single email template by ID
  app.get("/api/email-templates/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const template = await storage.getEmailTemplate(id);
      
      if (!template) {
        return res.status(404).json({ error: "Email template not found" });
      }
      
      res.json({ data: template });
    } catch (error) {
      console.error("Failed to fetch email template:", error);
      res.status(500).json({ error: "Failed to fetch email template" });
    }
  });

  // POST /api/email-templates - Create new email template (admin only)
  app.post("/api/email-templates", requireRole(['admin']), async (req: any, res) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      console.log("Creating email template with data:", JSON.stringify(req.body, null, 2));
      const validatedData = insertEmailTemplateSchema.parse(req.body);
      console.log("Validated data:", JSON.stringify(validatedData, null, 2));
      const templateData = {
        ...validatedData,
        createdBy: userId,
        updatedBy: userId,
      };
      
      const template = await storage.createEmailTemplate(templateData);
      console.log("Template created successfully:", template.id);
      res.status(201).json({ data: template });
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Zod validation error:", JSON.stringify(error.errors, null, 2));
        return res.status(400).json({ error: "Invalid template data", details: error.errors });
      }
      console.error("Failed to create email template - error type:", error?.constructor?.name);
      console.error("Full error:", error);
      res.status(500).json({ error: "Failed to create email template" });
    }
  });

  // PUT /api/email-templates/:id - Update email template (admin only)
  app.put("/api/email-templates/:id", requireRole(['admin']), async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      // Check if template exists
      const existingTemplate = await storage.getEmailTemplate(id);
      if (!existingTemplate) {
        return res.status(404).json({ error: "Email template not found" });
      }

      const validatedData = insertEmailTemplateSchema.partial().parse(req.body);
      const updates = {
        ...validatedData,
        updatedBy: userId,
      };
      
      const template = await storage.updateEmailTemplate(id, updates);
      res.json({ data: template });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid template data", details: error.errors });
      }
      console.error("Failed to update email template:", error);
      res.status(500).json({ error: "Failed to update email template" });
    }
  });

  // DELETE /api/email-templates/:id - Delete email template (admin only)
  app.delete("/api/email-templates/:id", requireRole(['admin']), async (req, res) => {
    try {
      const { id } = req.params;
      
      // Check if template exists
      const existingTemplate = await storage.getEmailTemplate(id);
      if (!existingTemplate) {
        return res.status(404).json({ error: "Email template not found" });
      }

      await storage.deleteEmailTemplate(id);
      res.status(204).send();
    } catch (error) {
      console.error("Failed to delete email template:", error);
      res.status(500).json({ error: "Failed to delete email template" });
    }
  });

  // Helper function to render email template variables
  const renderEmailTemplate = (template: string, caseData: any): string => {
    let rendered = template;
    
    // Replace all template variables
    const replacements: Record<string, string> = {
      '{{caseNumber}}': caseData.caseNumber?.toString() || 'N/A',
      '{{customerName}}': caseData.customerName || 'N/A',
      '{{customerState}}': caseData.customerState || caseData.state || 'N/A',
      '{{lenderName}}': caseData.lenderName || 'N/A',
      '{{loanId}}': caseData.loanId || 'N/A',
      '{{caseType}}': caseData.caseTypeName || 'N/A',
      '{{category}}': caseData.categoryName || 'N/A',
      '{{status}}': caseData.status || 'N/A',
      '{{priority}}': caseData.priorityValue || 'N/A',
      '{{assignedTo}}': caseData.assignedToName || 'Unassigned',
      '{{secondaryAssignedTo}}': caseData.secondaryAssignedToName || 'Unassigned',
      '{{caseDetails}}': caseData.details || 'N/A',
      '{{createdDate}}': caseData.createdAt ? new Date(caseData.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }) : 'N/A'
    };
    
    // Replace all variables in the template
    for (const [variable, value] of Object.entries(replacements)) {
      rendered = rendered.replace(new RegExp(variable, 'g'), value);
    }
    
    return rendered;
  };

  // Helper function to get Microsoft Graph API access token
  const getMicrosoftGraphToken = async (user: any): Promise<string> => {
    // For now, we'll use the client credentials from the user's config
    // In a production environment, you would implement OAuth token refresh logic
    
    if (!user.outlookClientId || !user.outlookTenantId || !user.outlookClientSecret) {
      throw new Error("Outlook OAuth configuration is incomplete");
    }
    
    // Get access token using client credentials flow
    const tokenEndpoint = `https://login.microsoftonline.com/${user.outlookTenantId}/oauth2/v2.0/token`;
    
    const params = new URLSearchParams({
      client_id: user.outlookClientId,
      client_secret: user.outlookClientSecret,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials'
    });
    
    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Failed to get access token: ${errorData}`);
    }
    
    const data = await response.json();
    return data.access_token;
  };

  // POST /api/cases/:id/send-email - Send email using case data and template
  app.post("/api/cases/:id/send-email", requireRole(['agent', 'admin']), async (req: any, res) => {
    try {
      const { id: caseId } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      // Validate request body
      const sendEmailSchema = z.object({
        templateId: z.string(),
        toEmail: z.string().email(),
        ccEmails: z.array(z.string().email()).optional(),
        bccEmails: z.array(z.string().email()).optional(),
        documentIds: z.array(z.string()).optional(),
        customSubject: z.string().optional(),
        customBody: z.string().optional(),
      });

      const emailData = sendEmailSchema.parse(req.body);

      // Check if user has email enabled
      if (!req.user.emailEnabled) {
        return res.status(403).json({ error: "Email sending is not enabled for your account. Please contact your administrator." });
      }

      // Verify OAuth configuration
      if (!req.user.outlookEmail || !req.user.outlookClientId || !req.user.outlookTenantId || !req.user.outlookClientSecret) {
        return res.status(403).json({ error: "Outlook email configuration is incomplete. Please configure your email settings." });
      }

      // Get case with detailed information
      const caseData = await storage.getCaseWithDetails(caseId);
      
      if (!caseData) {
        return res.status(404).json({ error: "Case not found" });
      }

      // Check user has permission to view this case
      try {
        checkUserPermissions.hasLenderAccess(req.user, caseData.lenderId);
      } catch (error) {
        if (error instanceof AuthorizationError) {
          return res.status(403).json({ error: error.message });
        }
        throw error;
      }

      // Get email template
      const template = await storage.getEmailTemplate(emailData.templateId);
      
      if (!template) {
        return res.status(404).json({ error: "Email template not found" });
      }

      if (!template.isActive) {
        return res.status(400).json({ error: "Email template is not active" });
      }

      // Render template or use custom content
      const subject = emailData.customSubject || renderEmailTemplate(template.subject, caseData);
      const body = emailData.customBody || renderEmailTemplate(template.body, caseData);

      // Fetch documents for attachments if provided
      const attachments: any[] = [];
      if (emailData.documentIds && emailData.documentIds.length > 0) {
        for (const docId of emailData.documentIds) {
          const doc = await storage.getDocument(docId);
          if (doc && doc.caseId === caseId) {
            // Note: In a real implementation, you'd need to get the actual file URL from object storage
            // For now, we'll include the metadata
            attachments.push({
              '@odata.type': '#microsoft.graph.fileAttachment',
              name: doc.label,
              contentType: doc.mime,
              // You would need to fetch the actual file content from object storage here
              // contentBytes: base64EncodedContent
            });
          }
        }
      }

      // Get access token
      let accessToken: string;
      try {
        accessToken = await getMicrosoftGraphToken(req.user);
      } catch (error) {
        console.error("Failed to get access token:", error);
        return res.status(500).json({ error: "Failed to authenticate with email service. Please check your OAuth configuration." });
      }

      // Build email message
      const message = {
        message: {
          subject: subject,
          body: {
            contentType: 'HTML',
            content: body
          },
          toRecipients: [
            {
              emailAddress: {
                address: emailData.toEmail
              }
            }
          ],
          ccRecipients: emailData.ccEmails?.map(email => ({
            emailAddress: { address: email }
          })) || [],
          bccRecipients: emailData.bccEmails?.map(email => ({
            emailAddress: { address: email }
          })) || [],
          attachments: attachments
        },
        saveToSentItems: true
      };

      // Send email via Microsoft Graph API using the user's email address
      // Note: Using /users/{email}/sendMail instead of /me/sendMail because we're using client credentials flow
      const graphResponse = await fetch(`https://graph.microsoft.com/v1.0/users/${req.user.outlookEmail}/sendMail`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(message)
      });

      if (!graphResponse.ok) {
        const errorData = await graphResponse.text();
        console.error("Microsoft Graph API error:", errorData);
        return res.status(500).json({ error: "Failed to send email. Please try again or contact support." });
      }

      // Log the email send action
      await storage.createAuditLog({
        caseId: caseId,
        actorUserId: userId,
        action: 'email_sent',
        details: {
          to: emailData.toEmail,
          cc: emailData.ccEmails,
          bcc: emailData.bccEmails,
          subject: subject,
          templateId: emailData.templateId
        }
      });

      res.json({ 
        success: true, 
        message: "Email sent successfully" 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request data", details: error.errors });
      }
      console.error("Failed to send email:", error);
      res.status(500).json({ error: "Failed to send email" });
    }
  });

  // Database sync endpoint - sync development data to production
  app.post("/api/admin/sync-to-production", requireRole("admin"), async (req, res) => {
    try {
      const { productionDatabaseUrl } = req.body;
      
      if (!productionDatabaseUrl) {
        return res.status(400).json({ error: "Production database URL is required" });
      }

      // Import required modules
      const { drizzle } = await import('drizzle-orm/neon-serverless');
      const { Pool, neonConfig } = await import('@neondatabase/serverless');
      const ws = await import('ws');
      const { db: devDb } = await import('./db');
      const { 
        users, lenders, caseOriginations, caseTypes, categories, 
        customers, cases, checklistItems, documents, resolutions,
        flags, caseNotes, auditLogs, valueSets, featureFlags,
        dispositions, subDispositions, policyViolationOptions,
        kbCategories, kbArticles, kbArticleVersions, kbChangeEvents, kbArticleLinks,
        emailTemplates, checklistTemplates, documentRequirements,
        priorityRules, tagRules, slaPolicies, resolutionConfigs,
        reusableChecklistTemplates, reusableChecklistItems,
        checklistAssignmentRules, configAudits, webhooks, integrations,
        caseTypeOriginations, categoryCaseTypes
      } = await import('@shared/schema');

      // Get all data from development database (current connection)
      const devData = {
        lenders: await devDb.select().from(lenders),
        caseOriginations: await devDb.select().from(caseOriginations),
        caseTypes: await devDb.select().from(caseTypes),
        categories: await devDb.select().from(categories),
        users: await devDb.select().from(users),
        customers: await devDb.select().from(customers),
        valueSets: await devDb.select().from(valueSets),
        featureFlags: await devDb.select().from(featureFlags),
        dispositions: await devDb.select().from(dispositions),
        subDispositions: await devDb.select().from(subDispositions),
        policyViolationOptions: await devDb.select().from(policyViolationOptions),
        kbCategories: await devDb.select().from(kbCategories),
        kbArticles: await devDb.select().from(kbArticles),
        kbArticleVersions: await devDb.select().from(kbArticleVersions),
        kbChangeEvents: await devDb.select().from(kbChangeEvents),
        kbArticleLinks: await devDb.select().from(kbArticleLinks),
        emailTemplates: await devDb.select().from(emailTemplates),
        checklistTemplates: await devDb.select().from(checklistTemplates),
        reusableChecklistTemplates: await devDb.select().from(reusableChecklistTemplates),
        reusableChecklistItems: await devDb.select().from(reusableChecklistItems),
        documentRequirements: await devDb.select().from(documentRequirements),
        priorityRules: await devDb.select().from(priorityRules),
        tagRules: await devDb.select().from(tagRules),
        checklistAssignmentRules: await devDb.select().from(checklistAssignmentRules),
        slaPolicies: await devDb.select().from(slaPolicies),
        resolutionConfigs: await devDb.select().from(resolutionConfigs),
        caseTypeOriginations: await devDb.select().from(caseTypeOriginations),
        categoryCaseTypes: await devDb.select().from(categoryCaseTypes),
        configAudits: await devDb.select().from(configAudits),
        webhooks: await devDb.select().from(webhooks),
        integrations: await devDb.select().from(integrations),
        cases: await devDb.select().from(cases),
        checklistItems: await devDb.select().from(checklistItems),
        documents: await devDb.select().from(documents),
        resolutions: await devDb.select().from(resolutions),
        flags: await devDb.select().from(flags),
        caseNotes: await devDb.select().from(caseNotes),
        auditLogs: await devDb.select().from(auditLogs),
      };

      // Connect to production database
      neonConfig.webSocketConstructor = ws.default;
      const prodPool = new Pool({ connectionString: productionDatabaseUrl });
      const prodDb = drizzle({ client: prodPool });

      try {
        // Clear production tables in correct order (respecting foreign keys)
        await prodDb.delete(auditLogs);
        await prodDb.delete(resolutions);
        await prodDb.delete(documents);
        await prodDb.delete(checklistItems);
        await prodDb.delete(flags);
        await prodDb.delete(caseNotes);
        await prodDb.delete(cases);
        await prodDb.delete(customers);
        await prodDb.delete(kbChangeEvents);
        await prodDb.delete(kbArticleLinks);
        await prodDb.delete(kbArticleVersions);
        await prodDb.delete(kbArticles);
        await prodDb.delete(kbCategories);
        await prodDb.delete(emailTemplates);
        await prodDb.delete(users);
        await prodDb.delete(checklistAssignmentRules);
        await prodDb.delete(reusableChecklistItems);
        await prodDb.delete(reusableChecklistTemplates);
        await prodDb.delete(checklistTemplates);
        await prodDb.delete(documentRequirements);
        await prodDb.delete(priorityRules);
        await prodDb.delete(tagRules);
        await prodDb.delete(resolutionConfigs);
        await prodDb.delete(slaPolicies);
        await prodDb.delete(categoryCaseTypes);
        await prodDb.delete(caseTypeOriginations);
        await prodDb.delete(categories);
        await prodDb.delete(caseTypes);
        await prodDb.delete(caseOriginations);
        await prodDb.delete(lenders);
        await prodDb.delete(subDispositions);
        await prodDb.delete(dispositions);
        await prodDb.delete(policyViolationOptions);
        await prodDb.delete(valueSets);
        await prodDb.delete(featureFlags);
        await prodDb.delete(configAudits);
        await prodDb.delete(webhooks);
        await prodDb.delete(integrations);

        // Import data to production in correct order
        if (devData.lenders.length > 0) await prodDb.insert(lenders).values(devData.lenders);
        if (devData.caseOriginations.length > 0) await prodDb.insert(caseOriginations).values(devData.caseOriginations);
        if (devData.caseTypes.length > 0) await prodDb.insert(caseTypes).values(devData.caseTypes);
        if (devData.categories.length > 0) await prodDb.insert(categories).values(devData.categories);
        if (devData.users.length > 0) await prodDb.insert(users).values(devData.users);
        if (devData.customers.length > 0) await prodDb.insert(customers).values(devData.customers);
        if (devData.valueSets.length > 0) await prodDb.insert(valueSets).values(devData.valueSets);
        if (devData.featureFlags.length > 0) await prodDb.insert(featureFlags).values(devData.featureFlags);
        if (devData.dispositions.length > 0) await prodDb.insert(dispositions).values(devData.dispositions);
        if (devData.subDispositions.length > 0) await prodDb.insert(subDispositions).values(devData.subDispositions);
        if (devData.policyViolationOptions.length > 0) await prodDb.insert(policyViolationOptions).values(devData.policyViolationOptions);
        if (devData.kbCategories.length > 0) await prodDb.insert(kbCategories).values(devData.kbCategories);
        if (devData.kbArticles.length > 0) await prodDb.insert(kbArticles).values(devData.kbArticles);
        if (devData.kbArticleVersions.length > 0) await prodDb.insert(kbArticleVersions).values(devData.kbArticleVersions);
        if (devData.kbChangeEvents.length > 0) await prodDb.insert(kbChangeEvents).values(devData.kbChangeEvents);
        if (devData.kbArticleLinks.length > 0) await prodDb.insert(kbArticleLinks).values(devData.kbArticleLinks);
        if (devData.emailTemplates.length > 0) await prodDb.insert(emailTemplates).values(devData.emailTemplates);
        if (devData.checklistTemplates.length > 0) await prodDb.insert(checklistTemplates).values(devData.checklistTemplates);
        if (devData.reusableChecklistTemplates.length > 0) await prodDb.insert(reusableChecklistTemplates).values(devData.reusableChecklistTemplates);
        if (devData.reusableChecklistItems.length > 0) await prodDb.insert(reusableChecklistItems).values(devData.reusableChecklistItems);
        if (devData.documentRequirements.length > 0) await prodDb.insert(documentRequirements).values(devData.documentRequirements);
        if (devData.priorityRules.length > 0) await prodDb.insert(priorityRules).values(devData.priorityRules);
        if (devData.tagRules.length > 0) await prodDb.insert(tagRules).values(devData.tagRules);
        if (devData.checklistAssignmentRules.length > 0) await prodDb.insert(checklistAssignmentRules).values(devData.checklistAssignmentRules);
        if (devData.slaPolicies.length > 0) await prodDb.insert(slaPolicies).values(devData.slaPolicies);
        if (devData.resolutionConfigs.length > 0) await prodDb.insert(resolutionConfigs).values(devData.resolutionConfigs);
        if (devData.caseTypeOriginations.length > 0) await prodDb.insert(caseTypeOriginations).values(devData.caseTypeOriginations);
        if (devData.categoryCaseTypes.length > 0) await prodDb.insert(categoryCaseTypes).values(devData.categoryCaseTypes);
        if (devData.configAudits.length > 0) await prodDb.insert(configAudits).values(devData.configAudits);
        if (devData.webhooks.length > 0) await prodDb.insert(webhooks).values(devData.webhooks);
        if (devData.integrations.length > 0) await prodDb.insert(integrations).values(devData.integrations);
        if (devData.cases.length > 0) await prodDb.insert(cases).values(devData.cases);
        if (devData.checklistItems.length > 0) await prodDb.insert(checklistItems).values(devData.checklistItems);
        if (devData.documents.length > 0) await prodDb.insert(documents).values(devData.documents);
        if (devData.resolutions.length > 0) await prodDb.insert(resolutions).values(devData.resolutions);
        if (devData.flags.length > 0) await prodDb.insert(flags).values(devData.flags);
        if (devData.caseNotes.length > 0) await prodDb.insert(caseNotes).values(devData.caseNotes);
        if (devData.auditLogs.length > 0) await prodDb.insert(auditLogs).values(devData.auditLogs);

        res.json({ 
          success: true, 
          message: "Database synced successfully",
          stats: {
            users: devData.users.length,
            cases: devData.cases.length,
            customers: devData.customers.length,
            categories: devData.categories.length
          }
        });
      } finally {
        // Always close the production pool connection
        await prodPool.end();
      }
    } catch (error) {
      console.error("Database sync error:", error);
      res.status(500).json({ error: "Failed to sync database", details: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
