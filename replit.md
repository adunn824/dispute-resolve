# Complaint & Dispute Management Platform

## Overview

This is a comprehensive Complaint & Dispute Management platform designed to streamline the intake, processing, and resolution of customer cases across Mail, Complaint, and Dispute categories. The platform provides role-based access for agents, compliance officers, and administrators, with automated priority assignment, branching checklists, document management, and configurable business rules. It aims to be a single-repository full-stack application optimized for enterprise use, focusing on regulatory compliance, audit trails, and efficient case resolution workflows. The system supports enterprise-grade case processing with real-time updates, proper data management, intelligent workflow automation through reusable templates and rule-based checklist assignment, and centralized lender administration.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite.
- **UI Framework**: shadcn/ui components built on Radix UI.
- **Styling**: Tailwind CSS with a custom design system.
- **State Management**: TanStack React Query for server state.
- **Routing**: Wouter.
- **Forms**: React Hook Form with Zod validation.
- **Theme System**: Custom light/dark mode implementation.

### Backend Architecture
- **Runtime**: Node.js with Express.js server.
- **Language**: TypeScript.
- **API Design**: RESTful endpoints with structured error handling.
- **Authentication**: Replit OAuth integration with session-based auth.
- **Session Storage**: PostgreSQL-backed sessions using connect-pg-simple.
- **Business Logic**: Service layer pattern with storage abstraction.

### Database Design
- **ORM**: Drizzle ORM with PostgreSQL.
- **Schema**: Comprehensive relational model for user management (role-based access), customer/case entities, dynamic checklists (case-specific and reusable templates), document management, resolution tracking, audit logging, and configurable business rules (priority, tags, checklist assignment, SLA policies).

### Configuration Management
- **Admin Panel**: Dynamic system for runtime updates to case types, categories, checklist templates, assignment rules, priority rules, tag automation, resolution configurations (dispositions, sub-dispositions, policy violations), SLA policies, value sets, and feature flags.
- **Audit Trail**: Tracking of configuration changes with rollback capability.
- **Rule-Based Automation**: Intelligent workflow automation using configurable business rules.
- **Resolution Options**: Fully configurable disposition options, hierarchical sub-dispositions linked to parent dispositions, and policy violation options - all manageable through the admin interface at /admin/resolution-options.

### Unified Checklist Template System
- **Single Template System**: The platform uses **reusableChecklistTemplates** as the single source of truth for all checklist templates. The legacy `checklistTemplates` system has been deprecated and consolidated.
- **Automatic Assignment**: Templates are automatically assigned to cases through two mechanisms:
  - **Category-specific**: Templates with a `categoryId` are automatically applied to all cases in that category
  - **Rule-based**: Templates can be conditionally assigned via business rules (checklistAssignmentRules)
- **Dynamic Evaluation**: The system evaluates which templates apply to each case on-demand using the `/api/cases/:id/dynamic-checklist` endpoint
- **Six Field Types**: Each checklist item supports multiple field types:
  - **Checkbox**: Traditional toggle-based completion (default)
  - **Dropdown**: Select from pre-configured options
  - **Text**: Free-form text input
  - **Number**: Numeric input with validation
  - **Date**: Date picker for deadline/date fields
  - **File**: Text input for file references (URLs or file IDs from object storage)
- **Dynamic Configuration**: Field options (dropdown choices) and default values are configurable per item
- **Case Detail Rendering**: Each field type renders appropriately in the case detail view with type-specific inputs
- **Admin Interface**: Single unified templates page at `/admin/templates` for managing all reusable templates
- **Legacy System**: The old `checklistTemplates` API routes and storage methods have been removed. The database schema remains for historical data but is no longer actively used.

### File Management
- **Strategy**: Prepared for S3 integration with presigned URL patterns.
- **Document Types**: Support for various file types (PDF, images, archives).

### Security & Compliance
- **Authentication**: OAuth-based with Replit integration.
- **Authorization**: Role-based access control with granular user permissions.
- **Audit Logging**: Comprehensive tracking of user actions and system changes.
- **Data Validation**: Zod schemas for type safety and validation.

### User Permission System
- **Permission Model**: Granular permission system with five configurable fields per user:
  - **restrictedLenderId**: Restricts user access to cases from a specific lender (null = access all lenders)
  - **isViewOnly**: Prevents user from making any modifications to cases
  - **canResolve**: Allows user to mark cases as resolved
  - **canDelete**: Allows user to delete cases and related entities
  - **canAssign**: Allows user to assign/reassign cases to other users
- **Default Permissions**: New users are created with all permissions enabled (non-restricted) except restrictedLenderId (null)
- **Backend Enforcement**: 
  - Custom `AuthorizationError` class returns 403 Forbidden responses for permission violations
  - Permission checks in all case management routes (GET, PATCH status, PATCH assign, PUT)
  - Lender filtering automatically applied to case lists for restricted users
  - View-only users blocked from all modification operations
- **Frontend Enforcement**:
  - Conditional rendering of action buttons based on user permissions
  - Status/assignment dropdowns replaced with read-only text for restricted users
  - Loading state protection prevents permission bypass during auth fetch
  - Buttons disabled during authentication loading
- **Admin Interface**: Permission configuration available in Users Management (/admin/users) with:
  - Lender restriction dropdown
  - Toggle switches for view-only, resolve, delete, and assign permissions
  - Real-time validation and clear permission descriptions

### User Email Configuration
- **Purpose**: Allows individual users to connect their Outlook email accounts to send notices to clients and external parties
- **OAuth Fields**: Each user can configure:
  - **emailEnabled**: Toggle to enable email functionality for the user
  - **outlookEmail**: User's Outlook email address
  - **outlookClientId**: Azure app client ID for OAuth authentication
  - **outlookTenantId**: Azure tenant ID for the organization
  - **outlookClientSecret**: Azure app client secret (stored securely, never exposed)
  - **outlookRedirectUri**: OAuth redirect URI for authentication callback
- **Security Measures**:
  - Client secret masked as "***REDACTED***" in all API responses (GET, POST, PUT)
  - Empty secret field during update preserves existing value in database
  - Password-type input field prevents secret visibility in UI
  - Same security pattern as lender email configuration
- **Admin Interface**: Located in Users Management page (/admin/users):
  - Email configuration section appears when "Enable Email" toggle is activated
  - Conditional display of all OAuth fields when email is enabled
  - Clear placeholder text for secret field: "Leave empty to keep existing secret" when editing
  - Visual separation with border and Mail icon for easy identification
- **Per-User Setup**: Each user has independent email configuration, allowing different team members to use their own email accounts

### Email Intake System
- **Webhook Endpoint**: POST /api/email-intake accepts emails from external services (Outlook, Gmail, etc.) and auto-creates cases
- **Pending Intake Status**: New status type "pending_intake" for cases awaiting agent review and completion
- **Email Metadata Storage**: JSONB field stores sender, subject, body preview, received timestamp, and attachment details array
- **Attachment Handling**: Full attachment metadata stored including file name, size, and content type
- **Intake Workflow**:
  1. Email arrives at webhook → Case created with pending_intake status
  2. Agent reviews email in Email Intake Queue (/email-intake)
  3. Agent fills in customer details, case type/category, priority, lender info
  4. On completion → Case transitions to "open" status with full case metadata
- **Intake Tracking**:
  - **receivedAt**: Email receipt timestamp
  - **firstViewedAt**: When agent first opens the intake case
  - **intakeCompletedAt**: When agent completes intake form
- **Dashboard Integration**: Widget displays pending intake count and average processing time (in hours)
- **Queue Display**: Shows email metadata including sender, subject, body preview, and list of attachments with file details
- **Queue Management**: Dedicated page shows all pending intakes with age tracking and quick access
- **Case Detail Integration**: For pending_intake cases, displays email preview and completion form instead of normal case tabs
- **No External Integration Required**: User dismissed Outlook connector; webhook is generic and works with any email forwarding service

## External Dependencies

### Core Infrastructure
- **Database**: PostgreSQL (Neon serverless in production).
- **Authentication Provider**: Replit OAuth service.
- **Session Store**: PostgreSQL-backed sessions.

### UI Libraries
- **Component System**: Radix UI.
- **Icons**: Lucide React.
- **Styling**: Tailwind CSS.
- **Fonts**: Google Fonts (Inter, JetBrains Mono).

### Development Services
- **Build Tools**: Vite (frontend), ESBuild (server).
- **Development**: Replit-specific plugins.

### Planned Integrations
- **File Storage**: AWS S3.
- **Email Services**: For automated notifications.
- **External APIs**: Webhook system.
- **Reporting**: Dashboard analytics and compliance.