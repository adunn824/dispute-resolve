# System Architecture

Technical architecture documentation for the Complaint & Dispute Management Platform.

## Table of Contents

- [System Overview](#system-overview)
- [Technology Stack](#technology-stack)
- [Architecture Patterns](#architecture-patterns)
- [Database Schema](#database-schema)
- [Authentication Architecture](#authentication-architecture)
- [File Storage Architecture](#file-storage-architecture)
- [Business Rules Engine](#business-rules-engine)
- [Email System Architecture](#email-system-architecture)
- [Audit Logging System](#audit-logging-system)
- [Security Architecture](#security-architecture)
- [Deployment Architecture](#deployment-architecture)

## System Overview

### High-Level Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        Client Browser                         │
│  (React SPA + TanStack Query + Wouter Routing)               │
└────────────────────┬─────────────────────────────────────────┘
                     │ HTTPS
                     │
┌────────────────────▼─────────────────────────────────────────┐
│                    Express.js Server                          │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   Routes     │  │  Auth        │  │  Storage     │       │
│  │   Layer      │  │  Middleware  │  │  Layer       │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ Rule Engine  │  │ Email        │  │ Object       │       │
│  │              │  │ Service      │  │ Storage      │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└─────────┬──────────────────┬───────────────────┬─────────────┘
          │                  │                   │
          ▼                  ▼                   ▼
┌─────────────────┐  ┌──────────────┐  ┌──────────────────┐
│   PostgreSQL    │  │   Session    │  │  Google Cloud    │
│   Database      │  │   Store      │  │  Storage (GCS)   │
│  (Neon)         │  │ (PG-backed)  │  │  via Replit      │
└─────────────────┘  └──────────────┘  └──────────────────┘

External Integrations:
┌──────────────────┐  ┌──────────────┐  ┌──────────────────┐
│  Microsoft       │  │  Outlook     │  │  Email           │
│  Azure AD SSO    │  │  SMTP        │  │  Intake Webhook  │
└──────────────────┘  └──────────────┘  └──────────────────┘
```

### Request Flow

1. **Client Request** → Browser sends HTTP request
2. **Session Validation** → Express session middleware checks authentication
3. **Route Handling** → Route handler validates request with Zod
4. **Authorization** → Role-based middleware checks permissions
5. **Business Logic** → Storage layer executes database operations
6. **Rule Evaluation** → Business rules engine processes conditions
7. **Response** → JSON response sent to client
8. **State Update** → TanStack Query updates client cache

## Technology Stack

### Frontend

**Framework & Core**:
- React 18.3.1 - Component-based UI library
- TypeScript - Type-safe JavaScript
- Vite - Build tool and dev server

**UI Components**:
- shadcn/ui - Component system built on Radix UI
- Radix UI - Unstyled, accessible component primitives
- Tailwind CSS - Utility-first CSS framework
- Lucide React - Icon library

**State Management**:
- TanStack React Query - Server state management
- React Hook Form - Form state management
- Zod - Schema validation

**Routing**:
- Wouter - Lightweight client-side routing

**Utilities**:
- date-fns - Date manipulation
- clsx - Class name utilities
- tailwind-merge - Merge Tailwind classes

### Backend

**Runtime & Framework**:
- Node.js 18+ - JavaScript runtime
- Express.js - Web application framework
- TypeScript - Type-safe backend code

**Database**:
- PostgreSQL 14+ - Relational database
- Drizzle ORM - Type-safe ORM
- @neondatabase/serverless - Neon serverless driver

**Authentication**:
- Passport.js - Authentication middleware
- passport-local - Username/password strategy
- openid-client - Microsoft SSO (OAuth 2.0)
- express-session - Session management
- connect-pg-simple - PostgreSQL session store

**File Storage**:
- @google-cloud/storage - GCS client library
- multer - File upload middleware

**Email**:
- Custom SMTP integration with Outlook

**Utilities**:
- zod - Schema validation
- drizzle-zod - Drizzle to Zod schema conversion
- memoizee - Function memoization

### Infrastructure

**Database**: Neon PostgreSQL (serverless)  
**File Storage**: Google Cloud Storage (via Replit Object Storage)  
**Hosting**: Replit Deployments  
**Session Store**: PostgreSQL-backed sessions  

## Architecture Patterns

### Layered Architecture

```
┌─────────────────────────────────────────┐
│         Presentation Layer              │
│  (React Components, Pages, Forms)       │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│         API Layer                       │
│  (Express Routes, Middleware, Auth)     │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│         Business Logic Layer            │
│  (Storage Interface, Rule Engine)       │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│         Data Access Layer               │
│  (Drizzle ORM, SQL Queries)            │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│         Database                        │
│  (PostgreSQL Tables, Indexes)          │
└─────────────────────────────────────────┘
```

### Storage Abstraction Pattern

**Interface**: `IStorage` in `server/storage.ts`  
**Implementation**: `PgStorage` class

**Benefits**:
- Testability (can mock storage)
- Flexibility (can swap implementations)
- Single source of truth for data operations
- Type safety with TypeScript

**Example**:
```typescript
interface IStorage {
  getCase(id: string): Promise<Case | null>;
  createCase(data: InsertCase): Promise<Case>;
  updateCase(id: string, data: Partial<Case>): Promise<Case>;
  // ... more methods
}
```

### Repository Pattern

Storage layer encapsulates all data access:
- Cases
- Customers
- Users
- Lenders
- Business rules
- Email templates
- Documents
- Audit logs

Each entity has dedicated methods (CRUD + custom queries).

### Service Layer Pattern

Separation of concerns:
- **Routes**: HTTP handling, validation, response formatting
- **Storage**: Data persistence and retrieval
- **Services**: Business logic (rule engine, email service, object storage)

## Database Schema

### Core Entities

#### Users Table
```sql
CREATE TABLE users (
  id VARCHAR PRIMARY KEY,
  username VARCHAR UNIQUE NOT NULL,
  password VARCHAR,
  email VARCHAR UNIQUE NOT NULL,
  name VARCHAR NOT NULL,
  role VARCHAR NOT NULL, -- 'agent' | 'compliance' | 'admin'
  restricted_lender_id VARCHAR, -- FK to lenders
  is_view_only BOOLEAN DEFAULT false,
  can_resolve BOOLEAN DEFAULT true,
  can_delete BOOLEAN DEFAULT false,
  can_assign BOOLEAN DEFAULT true,
  require_sso BOOLEAN DEFAULT false,
  sso_provider VARCHAR,
  sso_identifier VARCHAR,
  sso_email VARCHAR,
  email_enabled BOOLEAN DEFAULT false,
  email_address VARCHAR,
  email_smtp_host VARCHAR,
  email_smtp_port INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### Lenders Table
```sql
CREATE TABLE lenders (
  id VARCHAR PRIMARY KEY,
  name VARCHAR NOT NULL,
  code VARCHAR,
  contact_name VARCHAR,
  contact_email VARCHAR,
  contact_phone VARCHAR,
  address VARCHAR,
  email_enabled BOOLEAN DEFAULT false,
  email_address VARCHAR,
  email_smtp_host VARCHAR,
  email_smtp_port INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### Customers Table
```sql
CREATE TABLE customers (
  id VARCHAR PRIMARY KEY,
  first_name VARCHAR NOT NULL,
  last_name VARCHAR NOT NULL,
  name VARCHAR NOT NULL, -- computed: first_name + last_name
  email VARCHAR,
  phone VARCHAR,
  address1 VARCHAR,
  address2 VARCHAR,
  city VARCHAR,
  state VARCHAR,
  zip_code VARCHAR,
  customer_number VARCHAR,
  account_number VARCHAR,
  lender_id VARCHAR, -- FK to lenders
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_customer_number ON customers(customer_number);
CREATE INDEX idx_customers_account_number ON customers(account_number);
CREATE INDEX idx_customers_lender_id ON customers(lender_id);
```

#### Cases Table
```sql
CREATE TABLE cases (
  id VARCHAR PRIMARY KEY,
  case_number VARCHAR UNIQUE NOT NULL,
  status VARCHAR NOT NULL,
  priority_value VARCHAR, -- 'critical' | 'high' | 'medium' | 'low'
  priority_rule_id VARCHAR,
  case_type_id VARCHAR NOT NULL, -- FK to case_types
  category_id VARCHAR NOT NULL, -- FK to categories
  case_origination_id VARCHAR, -- FK to case_originations
  lender_id VARCHAR NOT NULL, -- FK to lenders
  customer_id VARCHAR, -- FK to customers
  state VARCHAR NOT NULL,
  assigned_to_user_id VARCHAR, -- FK to users
  secondary_assigned_user_id VARCHAR, -- FK to users
  has_representative BOOLEAN DEFAULT false,
  representative_company VARCHAR,
  representative_name VARCHAR,
  representative_email VARCHAR,
  representative_phone VARCHAR,
  details TEXT,
  tags TEXT[], -- Array of tag strings
  sla_response_deadline TIMESTAMP,
  sla_resolution_deadline TIMESTAMP,
  email_metadata JSONB, -- For email intake cases
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP,
  closed_at TIMESTAMP
);

CREATE INDEX idx_cases_status ON cases(status);
CREATE INDEX idx_cases_priority ON cases(priority_value);
CREATE INDEX idx_cases_lender ON cases(lender_id);
CREATE INDEX idx_cases_assigned ON cases(assigned_to_user_id);
CREATE INDEX idx_cases_customer ON cases(customer_id);
CREATE INDEX idx_cases_created ON cases(created_at);
```

#### Case Links Table
```sql
CREATE TABLE case_links (
  id VARCHAR PRIMARY KEY,
  case_id VARCHAR NOT NULL, -- FK to cases
  linked_case_id VARCHAR NOT NULL, -- FK to cases
  relationship_type VARCHAR NOT NULL,
  notes TEXT,
  created_by VARCHAR NOT NULL, -- FK to users
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(case_id, linked_case_id)
);

CREATE INDEX idx_case_links_case ON case_links(case_id);
CREATE INDEX idx_case_links_linked ON case_links(linked_case_id);
```

### Configuration Entities

#### Case Types, Categories, Originations
```sql
CREATE TABLE case_types (
  id VARCHAR PRIMARY KEY,
  name VARCHAR NOT NULL,
  code VARCHAR,
  description TEXT,
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE categories (
  id VARCHAR PRIMARY KEY,
  case_type_id VARCHAR NOT NULL,
  name VARCHAR NOT NULL,
  code VARCHAR,
  description TEXT,
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE case_originations (
  id VARCHAR PRIMARY KEY,
  name VARCHAR NOT NULL,
  code VARCHAR
);
```

#### Statuses and Resolutions
```sql
CREATE TABLE statuses (
  id VARCHAR PRIMARY KEY,
  name VARCHAR NOT NULL,
  code VARCHAR
);

CREATE TABLE dispositions (
  id VARCHAR PRIMARY KEY,
  code VARCHAR NOT NULL,
  label VARCHAR NOT NULL,
  description TEXT
);

CREATE TABLE sub_dispositions (
  id VARCHAR PRIMARY KEY,
  disposition_id VARCHAR NOT NULL,
  code VARCHAR NOT NULL,
  label VARCHAR NOT NULL,
  description TEXT
);

CREATE TABLE policy_violation_options (
  id VARCHAR PRIMARY KEY,
  code VARCHAR NOT NULL,
  label VARCHAR NOT NULL,
  severity VARCHAR,
  description TEXT
);
```

### Business Rules Tables

#### Priority Rules
```sql
CREATE TABLE priority_rules (
  id VARCHAR PRIMARY KEY,
  name VARCHAR NOT NULL,
  priority VARCHAR NOT NULL,
  category_id VARCHAR,
  conditions JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Tag Rules
```sql
CREATE TABLE tag_rules (
  id VARCHAR PRIMARY KEY,
  name VARCHAR NOT NULL,
  tag VARCHAR,
  tags TEXT[],
  conditions JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### SLA Policies
```sql
CREATE TABLE sla_policies (
  id VARCHAR PRIMARY KEY,
  name VARCHAR NOT NULL,
  priority VARCHAR NOT NULL,
  response_time_hours INTEGER NOT NULL,
  resolution_time_hours INTEGER NOT NULL,
  conditions JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Email Notification Rules
```sql
CREATE TABLE email_notification_rules (
  id VARCHAR PRIMARY KEY,
  name VARCHAR NOT NULL,
  event_trigger VARCHAR NOT NULL,
  sender_type VARCHAR NOT NULL, -- 'user' | 'lender'
  sender_user_id VARCHAR,
  sender_lender_id VARCHAR,
  recipient_type VARCHAR NOT NULL,
  recipient_emails TEXT[],
  email_template_id VARCHAR,
  conditions JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Checklist System

#### Reusable Checklist Templates
```sql
CREATE TABLE reusable_checklist_templates (
  id VARCHAR PRIMARY KEY,
  name VARCHAR NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE reusable_checklist_items (
  id VARCHAR PRIMARY KEY,
  template_id VARCHAR NOT NULL,
  label VARCHAR NOT NULL,
  field_type VARCHAR NOT NULL, -- 'checkbox' | 'dropdown' | 'text' | 'number' | 'date' | 'file'
  options JSONB, -- For dropdown: {values: ['opt1', 'opt2']}
  is_required BOOLEAN DEFAULT false,
  help_text TEXT,
  sort_order INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE checklist_assignment_rules (
  id VARCHAR PRIMARY KEY,
  name VARCHAR NOT NULL,
  template_id VARCHAR NOT NULL,
  conditions JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### Dynamic Checklist State
```sql
CREATE TABLE dynamic_checklist_state (
  id VARCHAR PRIMARY KEY,
  case_id VARCHAR NOT NULL,
  checklist_key VARCHAR NOT NULL,
  value TEXT,
  file_id VARCHAR,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(case_id, checklist_key)
);
```

### Document Management

```sql
CREATE TABLE documents (
  id VARCHAR PRIMARY KEY,
  case_id VARCHAR NOT NULL,
  filename VARCHAR NOT NULL,
  file_size INTEGER,
  mime_type VARCHAR,
  storage_path VARCHAR NOT NULL,
  uploaded_by VARCHAR NOT NULL,
  uploaded_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_documents_case ON documents(case_id);
```

### Email Templates

```sql
CREATE TABLE email_templates (
  id VARCHAR PRIMARY KEY,
  name VARCHAR NOT NULL,
  description TEXT,
  category VARCHAR,
  subject VARCHAR NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Audit Logging

```sql
CREATE TABLE audit_log (
  id VARCHAR PRIMARY KEY,
  user_id VARCHAR,
  action VARCHAR NOT NULL,
  entity_type VARCHAR NOT NULL,
  entity_id VARCHAR,
  details JSONB,
  ip_address VARCHAR,
  user_agent VARCHAR,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_user ON audit_log(user_id);
CREATE INDEX idx_audit_created ON audit_log(created_at);
```

### Entity Relationships

```
lenders (1) ──< (N) users [restricted_lender_id]
lenders (1) ──< (N) customers
lenders (1) ──< (N) cases

case_types (1) ──< (N) categories
case_types (1) ──< (N) cases

categories (1) ──< (N) cases
categories (1) ──< (N) priority_rules

case_originations (1) ──< (N) cases

customers (1) ──< (N) cases

users (1) ──< (N) cases [assigned_to_user_id]
users (1) ──< (N) cases [secondary_assigned_user_id]

cases (1) ──< (N) documents
cases (1) ──< (N) dynamic_checklist_state
cases (1) ──< (N) case_links [case_id]
cases (1) ──< (N) case_links [linked_case_id]

reusable_checklist_templates (1) ──< (N) reusable_checklist_items
reusable_checklist_templates (1) ──< (N) checklist_assignment_rules

email_templates (1) ──< (N) email_notification_rules
```

## Authentication Architecture

### Dual Authentication System

The platform supports two authentication methods:

1. **Local Authentication** (Username/Password)
2. **Microsoft SSO** (Azure AD OAuth 2.0)

### Local Authentication Flow

```
┌──────────┐                 ┌──────────┐                 ┌──────────┐
│  Client  │                 │  Server  │                 │ Database │
└─────┬────┘                 └─────┬────┘                 └─────┬────┘
      │                            │                            │
      │ POST /api/login            │                            │
      │ {username, password}       │                            │
      ├───────────────────────────>│                            │
      │                            │ Query user by username     │
      │                            ├───────────────────────────>│
      │                            │<───────────────────────────┤
      │                            │ User record                │
      │                            │                            │
      │                            │ Compare passwords          │
      │                            │ (scrypt hash)              │
      │                            │                            │
      │                            │ Create session             │
      │                            ├───────────────────────────>│
      │                            │<───────────────────────────┤
      │                            │ Session ID                 │
      │<───────────────────────────┤                            │
      │ Set-Cookie: connect.sid    │                            │
      │                            │                            │
```

**Password Hashing**: scrypt with random salt  
**Session Storage**: PostgreSQL table  
**Cookie**: HTTP-only, secure in production

### Microsoft SSO Flow

```
┌──────────┐     ┌──────────┐     ┌──────────────┐     ┌──────────┐
│  Client  │     │  Server  │     │ Azure AD     │     │ Database │
└─────┬────┘     └─────┬────┘     └──────┬───────┘     └─────┬────┘
      │                │                  │                   │
      │ GET /api/auth/microsoft           │                   │
      ├───────────────>│                  │                   │
      │                │ Redirect to Azure AD                 │
      │<───────────────┤                  │                   │
      │                                   │                   │
      │ User authenticates                │                   │
      ├──────────────────────────────────>│                   │
      │<──────────────────────────────────┤                   │
      │ Redirect with auth code           │                   │
      │                                   │                   │
      │ GET /api/auth/microsoft/callback  │                   │
      ├───────────────>│                  │                   │
      │                │ Exchange code for tokens             │
      │                ├─────────────────>│                   │
      │                │<─────────────────┤                   │
      │                │ Access token + ID token              │
      │                │                  │                   │
      │                │ Extract claims (email, sub)          │
      │                │                                      │
      │                │ Find or create user                  │
      │                ├─────────────────────────────────────>│
      │                │<─────────────────────────────────────┤
      │                │ User record                          │
      │                │                                      │
      │                │ Create session                       │
      │                ├─────────────────────────────────────>│
      │<───────────────┤                                      │
      │ Set-Cookie     │                                      │
```

**SSO Provider**: Microsoft Azure AD  
**Protocol**: OAuth 2.0 / OpenID Connect  
**Library**: openid-client  
**Account Linking**: By email or SSO identifier

### Per-User SSO Enforcement

Users can have `requireSso` flag set:
- If true: User must login via Microsoft SSO
- If false: User can login with either method

**Check**: `checkSsoRequired` middleware on `/api/login`

### Session Management

**Store**: PostgreSQL table (`sessions`)  
**Library**: express-session + connect-pg-simple  
**TTL**: 1 week  
**Cookie**: HTTP-only, secure, sameSite

**Session Data**:
```json
{
  "passport": {
    "user": "user-uuid"
  },
  "ssoUsername": "optional-for-sso"
}
```

### Authorization Middleware

**Role Hierarchy**: admin > compliance > agent

```typescript
const requireRole = (roles: string | string[]) => {
  // Check user role level >= required level
  // Higher roles can access lower role endpoints
};
```

**Example**:
- Admin can access agent endpoints
- Compliance can access agent endpoints
- Agent can only access agent endpoints

## File Storage Architecture

### Google Cloud Storage Integration

**Provider**: Replit Object Storage (GCS-backed)  
**Client**: @google-cloud/storage  
**Authentication**: Replit sidecar service

### Storage Structure

```
gs://bucket-name/
├── public/              # Public assets (no auth required)
│   └── ...
└── .private/            # Case documents (auth required)
    ├── case-uuid-1/
    │   ├── document-1.pdf
    │   └── document-2.xlsx
    └── case-uuid-2/
        └── document-3.jpg
```

### Access Control

**ACL Policy**: Owner-based permissions

**Upload Flow**:
1. User uploads file via multipart form
2. Server validates file (type, size, permissions)
3. File saved to GCS with private ACL
4. Document record created in database
5. ACL set to owner = uploading user

**Download Flow**:
1. User requests document download
2. Server checks case access permission
3. Server checks document ownership
4. If authorized, generate signed URL
5. Stream file from GCS to client

**Security**:
- Files stored in private bucket
- ACL enforced at object level
- Database tracks ownership
- Server validates all access

## Business Rules Engine

### Rule Evaluation Architecture

```
Case Created/Updated
        │
        ▼
┌───────────────────┐
│  Gather Case Data │
│  - Type, Category │
│  - Customer Info  │
│  - Details, etc.  │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  Load Active Rules│
│  - Priority       │
│  - Tag            │
│  - SLA            │
│  - Checklist      │
│  - Email          │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  For Each Rule:   │
│  1. Parse Conditions
│  2. Evaluate Against Data
│  3. Check Logic (AND/OR)
│  4. Collect Results
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  Apply Results:   │
│  - Set Priority   │
│  - Add Tags       │
│  - Set SLA        │
│  - Assign Checklist
│  - Send Emails    │
└────────┬──────────┘
         │
         ▼
    Case Updated
```

### Condition Structure

```json
{
  "logic": "AND",
  "conditions": [
    {
      "field": "categoryId",
      "operator": "equals",
      "value": "fraud-category-uuid"
    },
    {
      "field": "amount",
      "operator": "greaterThan",
      "value": 1000
    }
  ]
}
```

### Supported Operators

**Text**: equals, contains, startsWith, endsWith, regex, exists, notExists  
**Number**: equals, greaterThan, lessThan, exists, notExists  
**Boolean**: equals  
**Enum**: equals, in, notIn  
**Reference**: equals, in, notIn

### Rule Precedence

**Priority Rules**: Highest priority wins  
**Tag Rules**: All matching rules apply (cumulative)  
**SLA Policies**: Highest priority wins  
**Checklist Assignment**: First match wins  
**Email Notifications**: All matching rules trigger

## Email System Architecture

### Email Sending

**SMTP Integration**: Direct SMTP connection  
**Provider**: Outlook/Microsoft 365  
**Port**: 587 (TLS)

**Sender Configuration**:
- Per-user email settings
- Per-lender email settings
- System default (if configured)

### Email Template System

**Variables**: `{{variableName}}`  
**Replacement**: Server-side before sending

**Available Variables**:
- Case: caseNumber, status, priority, details, createdDate
- Customer: customerName, customerFirstName, customerLastName, customerEmail
- Lender: lenderName
- Agent: assignedAgent

### Email Notification Rules

**Event Triggers**:
- Case Created
- Status Changed
- Case Assigned
- Case Resolved
- SLA Warning

**Conditional Logic**: Same as business rules

**Asynchronous Sending**: Background processing, doesn't block

## Audit Logging System

### Audit Log Structure

Every action tracked:
- User who performed action
- Action type (create, update, delete, etc.)
- Entity type and ID
- Before/after state (in details JSONB)
- IP address and user agent
- Timestamp

### Logged Actions

**Cases**:
- Create, Update, Delete
- Status change, Assignment
- Resolution
- Link/unlink

**Users**: Create, Update, Delete, Login, Logout

**Configuration**: All admin changes (rules, templates, etc.)

**Documents**: Upload, Download, Delete

**Emails**: Send (recipient, template, success/failure)

### Audit Log Queries

**By Entity**: Find all changes to specific case  
**By User**: Find all actions by specific user  
**By Date Range**: Find all actions in timeframe  
**By Action Type**: Find all deletions, etc.

**Performance**: Indexed on entity_type, entity_id, user_id, created_at

## Security Architecture

### Data Protection

**Passwords**: Scrypt hashing with random salt  
**Sessions**: HTTP-only cookies, secure in production  
**Secrets**: Environment variables, never logged  
**PII**: Encrypted at rest (database), TLS in transit

### Input Validation

**All Inputs**: Validated with Zod schemas  
**SQL Injection**: Prevented by Drizzle ORM (parameterized queries)  
**XSS**: React auto-escapes, CSP headers  
**CSRF**: Session-based, SameSite cookies

### Authorization Layers

1. **Session Check**: User authenticated?
2. **Role Check**: User has required role?
3. **Lender Restriction**: User has access to this lender?
4. **View-Only Check**: User can modify?
5. **Resource Ownership**: User owns this resource?

### File Upload Security

- File type validation
- File size limits
- Malware scanning (recommended)
- Private storage with ACLs
- Signed URLs for downloads

## Deployment Architecture

### Replit Deployment

```
┌──────────────────────────────────────┐
│       Replit Cloud Platform          │
│                                      │
│  ┌────────────────────────────────┐  │
│  │  Application Container         │  │
│  │  - Node.js Runtime             │  │
│  │  - Express Server              │  │
│  │  - Static Files (Vite build)   │  │
│  └────────────────────────────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │  Neon PostgreSQL               │  │
│  │  (External, serverless)        │  │
│  └────────────────────────────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │  Object Storage (GCS)          │  │
│  │  (Managed by Replit)           │  │
│  └────────────────────────────────┘  │
│                                      │
└──────────────────────────────────────┘
            │
            ▼
      Public Internet
      (HTTPS, TLS 1.2+)
```

### Environment Configuration

**Development**:
- Local PostgreSQL or Neon dev database
- Local object storage or dev bucket
- Debug logging enabled
- Hot reload with Vite

**Production**:
- Neon PostgreSQL production database
- Production GCS bucket
- Error logging only
- Optimized builds
- Secure cookies

### Scaling Considerations

**Database**: Neon autoscaling  
**Storage**: GCS (unlimited)  
**Server**: Replit handles scaling  
**Sessions**: PostgreSQL-backed (scales with DB)

### Monitoring

**Health Checks**: `/api/health` endpoint  
**Metrics**: Server logs, database metrics  
**Error Tracking**: Console errors, audit logs  
**Performance**: Query timing, response times

## Performance Optimizations

### Database

- Indexes on frequently queried columns
- Efficient joins with proper foreign keys
- Pagination for large result sets
- Connection pooling (Neon serverless)

### Caching

- TanStack Query client-side caching
- Memoized OIDC configuration
- Static asset caching (Vite)

### API

- Batch operations where possible
- Efficient serialization (JSON)
- Minimal data transfer (select only needed fields)
- Detailed vs. basic views (detailed=false)

### Frontend

- Code splitting (Vite)
- Lazy loading routes
- Optimized re-renders (React)
- Debounced search inputs

## Future Considerations

### Scalability

- Add Redis for session caching
- Implement message queue for background jobs
- Separate read replicas for reporting
- CDN for static assets

### Reliability

- Database replication
- Automated backups
- Disaster recovery plan
- Health monitoring and alerts

### Security

- Implement rate limiting
- Add CAPTCHA for public endpoints
- Webhook signature validation
- Advanced threat detection

### Features

- Real-time updates (WebSocket)
- Advanced analytics (BI tools)
- Mobile application
- API versioning
