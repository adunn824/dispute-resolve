# Setup & Deployment Guide

Complete instructions for installing, configuring, and deploying the Complaint & Dispute Management Platform.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Development Setup](#development-setup)
- [Environment Configuration](#environment-configuration)
- [Database Setup](#database-setup)
- [Object Storage Setup](#object-storage-setup)
- [Authentication Configuration](#authentication-configuration)
- [Email Integration Setup](#email-integration-setup)
- [Running the Application](#running-the-application)
- [Production Deployment](#production-deployment)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Software

- **Node.js**: Version 18.x or higher
- **npm**: Version 8.x or higher (comes with Node.js)
- **PostgreSQL**: Version 14.x or higher
- **Git**: For version control

### Required Accounts

- **Replit Account** (for hosting and object storage)
- **Microsoft Azure** (optional, for SSO integration)
- **Email Provider** (optional, for automated notifications)

## Development Setup

### 1. Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd complaint-dispute-platform

# Install dependencies
npm install
```

### 2. Verify Installation

```bash
# Check Node.js version
node --version  # Should be 18.x or higher

# Check npm version
npm --version   # Should be 8.x or higher

# Verify dependencies installed
npm list --depth=0
```

## Environment Configuration

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```bash
# === Core Configuration ===
NODE_ENV=development
PORT=5000

# === Database ===
DATABASE_URL=postgresql://username:password@localhost:5432/complaints_db

# === Session Security ===
SESSION_SECRET=your-secure-random-string-here

# === Replit OAuth (Development) ===
REPLIT_DOMAINS=your-repl-url.replit.dev
REPL_ID=your-repl-id
ISSUER_URL=https://replit.com/oidc

# === Object Storage ===
PUBLIC_OBJECT_SEARCH_PATHS=gs://your-bucket/public
PRIVATE_OBJECT_DIR=gs://your-bucket/.private

# === Microsoft SSO (Optional) ===
MICROSOFT_CLIENT_ID=your-azure-app-client-id
MICROSOFT_CLIENT_SECRET=your-azure-app-client-secret
MICROSOFT_TENANT_ID=your-azure-tenant-id
MICROSOFT_REDIRECT_URI=https://your-domain.com/api/auth/microsoft/callback

# === Email Configuration (Optional) ===
# Per-user Outlook integration configured in admin panel
```

### Generating Secure Secrets

Generate a secure session secret:

```bash
# On Linux/Mac
openssl rand -hex 32

# On Windows (PowerShell)
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

### Environment-Specific Configuration

**Development** (`.env.development`):
```bash
NODE_ENV=development
# Use local database
DATABASE_URL=postgresql://localhost:5432/complaints_dev
# Disable SSL requirements
SESSION_COOKIE_SECURE=false
```

**Production** (`.env.production`):
```bash
NODE_ENV=production
# Use production database (Neon serverless)
DATABASE_URL=postgresql://user:pass@host.neon.tech/complaints
# Enable SSL for security
SESSION_COOKIE_SECURE=true
```

## Database Setup

### Using Replit PostgreSQL (Recommended)

1. **Create Database**
   - Open Replit workspace
   - Navigate to "Tools" → "Database"
   - Create new PostgreSQL database
   - Copy connection string to `DATABASE_URL`

2. **Initialize Schema**

```bash
# Push schema to database
npm run db:push

# If you encounter conflicts
npm run db:push --force
```

3. **Verify Database**

```bash
# Connect to database and check tables
psql $DATABASE_URL -c "\dt"
```

### Using Local PostgreSQL

1. **Install PostgreSQL**

```bash
# Ubuntu/Debian
sudo apt-get install postgresql postgresql-contrib

# macOS (with Homebrew)
brew install postgresql
brew services start postgresql

# Windows
# Download installer from postgresql.org
```

2. **Create Database**

```bash
# Login as postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE complaints_db;
CREATE USER complaints_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE complaints_db TO complaints_user;
\q
```

3. **Update Connection String**

```bash
DATABASE_URL=postgresql://complaints_user:secure_password@localhost:5432/complaints_db
```

4. **Push Schema**

```bash
npm run db:push
```

### Database Migrations

**Important**: This project uses Drizzle ORM with `db:push` for schema management. Do NOT manually write SQL migrations.

```bash
# Apply schema changes
npm run db:push

# Force push (data loss warning)
npm run db:push --force

# Generate migration files (for reference only)
npm run db:generate
```

## Object Storage Setup

### Using Replit Object Storage

1. **Create Bucket**
   - Open Replit workspace
   - Navigate to "Tools" → "Object Storage"
   - Create new bucket (e.g., `complaints-storage`)

2. **Configure Directories**
   - Create `public` folder for public assets
   - Create `.private` folder for case documents

3. **Set Environment Variables**

```bash
PUBLIC_OBJECT_SEARCH_PATHS=gs://complaints-storage/public
PRIVATE_OBJECT_DIR=gs://complaints-storage/.private
```

4. **Verify Access**
   - Upload a test file through the admin panel
   - Check that files appear in object storage
   - Verify download permissions work correctly

### Access Control

The system automatically sets ACL policies on uploaded files:

- **Case Documents**: Only case owner and authorized users can access
- **Public Assets**: Accessible without authentication
- **Email Attachments**: Restricted to case participants

## Authentication Configuration

### Replit OAuth (Default)

Automatically configured when running on Replit. Required environment variables:

```bash
REPLIT_DOMAINS=your-repl-url.replit.dev
REPL_ID=your-repl-id
ISSUER_URL=https://replit.com/oidc
```

### Microsoft SSO Setup

1. **Register Application in Azure**
   - Go to [Azure Portal](https://portal.azure.com)
   - Navigate to "Azure Active Directory" → "App registrations"
   - Click "New registration"
   - Name: "Complaint Management Platform"
   - Redirect URI: `https://your-domain.com/api/auth/microsoft/callback`

2. **Configure Application**
   - Note the **Application (client) ID**
   - Create a **client secret** under "Certificates & secrets"
   - Note the **Directory (tenant) ID**

3. **Set Permissions**
   - Add API permissions:
     - `User.Read` (Microsoft Graph)
     - `email`
     - `openid`
     - `profile`

4. **Update Environment Variables**

```bash
MICROSOFT_CLIENT_ID=<application-client-id>
MICROSOFT_CLIENT_SECRET=<client-secret-value>
MICROSOFT_TENANT_ID=<directory-tenant-id>
MICROSOFT_REDIRECT_URI=https://your-domain.com/api/auth/microsoft/callback
```

5. **Enable SSO for Users**
   - Login as admin
   - Navigate to "Admin" → "Users"
   - Edit user → Enable "Require SSO"
   - User must login with Microsoft credentials

### Local Authentication

Default admin account (created by seed data):

```
Username: admin
Password: admin123
```

**⚠️ IMPORTANT**: Change this password immediately in production!

## Email Integration Setup

### Per-User Outlook Configuration

Administrators can configure Outlook integration for individual users or lenders:

1. **User Email Setup**
   - Login as admin
   - Navigate to "Admin" → "Users"
   - Edit user → "Email Configuration"
   - Enter Outlook credentials:
     - Email address
     - App password (not regular password)
     - SMTP server: `smtp-mail.outlook.com`
     - Port: `587`

2. **Lender Email Setup**
   - Navigate to "Admin" → "Lenders"
   - Edit lender → "Email Configuration"
   - Configure Outlook integration for lender-wide sending

3. **Get Outlook App Password**
   - Go to [Microsoft Account Security](https://account.microsoft.com/security)
   - Select "Advanced security options"
   - Under "App passwords", create new password
   - Use this password (not your regular password)

### Email Templates

Create reusable email templates:

1. Navigate to "Admin" → "Email Templates"
2. Create template with variables:
   - `{{caseNumber}}` - Case ID
   - `{{customerName}}` - Customer name
   - `{{lenderName}}` - Lender name
   - `{{priority}}` - Case priority
   - `{{status}}` - Current status

Example template:

```
Subject: Case {{caseNumber}} - Update

Dear {{customerName}},

Your case ({{caseNumber}}) has been updated.

Status: {{status}}
Priority: {{priority}}

We are working to resolve your concern. If you have questions, please contact us.

Best regards,
{{lenderName}} Support Team
```

### Email Intake Webhook

Configure external email provider to forward to:

```
POST https://your-domain.com/api/email-intake
Content-Type: application/json

{
  "from": "customer@example.com",
  "subject": "Complaint about service",
  "bodyPreview": "I am writing to complain...",
  "bodyContent": "Full email body...",
  "receivedDateTime": "2025-01-01T10:00:00Z",
  "attachments": [
    {
      "filename": "receipt.pdf",
      "contentType": "application/pdf",
      "content": "base64-encoded-content"
    }
  ]
}
```

## Running the Application

### Development Mode

```bash
# Start development server (hot reload enabled)
npm run dev
```

The application will be available at:
- Frontend: `http://localhost:5000`
- API: `http://localhost:5000/api`

### Production Mode

```bash
# Build the application
npm run build

# Start production server
npm start
```

### Using Replit Workflow

The project includes a pre-configured workflow:

1. Click "Run" button in Replit
2. Or execute manually: `npm run dev`
3. Access via Replit's webview

## Production Deployment

### Deploying to Replit

1. **Configure Environment**
   - Add all required secrets in Replit Secrets
   - Ensure database is production-ready (Neon)
   - Configure object storage

2. **Update Configuration**
   - Set `NODE_ENV=production`
   - Update `REPLIT_DOMAINS` with production domain
   - Ensure `SESSION_COOKIE_SECURE=true`

3. **Deploy**
   - Click "Publish" in Replit
   - Configure custom domain (optional)
   - Enable autoscaling if needed

4. **Verify Deployment**
   - Test login functionality
   - Create a test case
   - Upload a document
   - Send a test email
   - Check audit logs

### Post-Deployment Checklist

- [ ] Change default admin password
- [ ] Configure backup schedule
- [ ] Set up monitoring/alerts
- [ ] Review security settings
- [ ] Test all authentication methods
- [ ] Verify email sending works
- [ ] Check file upload/download
- [ ] Test business rules
- [ ] Verify reporting exports

## Troubleshooting

### Database Connection Issues

**Problem**: `Error: connect ECONNREFUSED`

**Solution**:
```bash
# Check if PostgreSQL is running
sudo service postgresql status

# Check connection string format
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT 1;"
```

### Session Store Errors

**Problem**: `Error: connect to session store failed`

**Solution**:
```bash
# Ensure sessions table exists
psql $DATABASE_URL -c "SELECT * FROM sessions LIMIT 1;"

# If missing, create it
npm run db:push
```

### Object Storage Access

**Problem**: `Error: Object storage not configured`

**Solution**:
```bash
# Verify environment variables are set
echo $PUBLIC_OBJECT_SEARCH_PATHS
echo $PRIVATE_OBJECT_DIR

# Check bucket exists in Replit Object Storage
# Verify bucket names match environment variables
```

### Microsoft SSO Issues

**Problem**: SSO redirect fails or shows error

**Solution**:
1. Verify redirect URI matches Azure app registration exactly
2. Check client ID and secret are correct
3. Ensure tenant ID is valid
4. Verify API permissions are granted and consented
5. Check user has "Require SSO" enabled

### Email Sending Failures

**Problem**: Emails not sending

**Solution**:
1. Verify Outlook credentials are correct
2. Use app password, not regular password
3. Check SMTP server and port
4. Verify email template exists
5. Check audit logs for error details
6. Ensure user/lender has email configured

### Performance Issues

**Problem**: Slow page loads or queries

**Solution**:
```bash
# Check database indexes
psql $DATABASE_URL -c "\di"

# Monitor query performance
# Add EXPLAIN ANALYZE to slow queries

# Check server resources
top
df -h

# Review Replit performance metrics
```

## Additional Resources

- [User Guide](USER_GUIDE.md) - How to use the platform
- [Admin Guide](ADMIN_GUIDE.md) - Configuration and administration
- [API Documentation](API.md) - Integration endpoints
- [Architecture](ARCHITECTURE.md) - Technical design
- [Development Guide](DEVELOPMENT.md) - Contributing guidelines

## Support

For additional help:
- Review error logs in console
- Check browser console for frontend errors
- Review audit logs for user action history
- Examine database logs for query issues
