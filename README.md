# Complaint & Dispute Management Platform

A comprehensive, enterprise-grade solution for managing customer complaints and disputes with automated workflows, role-based access control, and intelligent case routing.

## Overview

This platform streamlines the entire complaint and dispute resolution process across multiple categories (Mail, Complaint, Dispute), providing powerful automation tools, configurable business rules, and comprehensive audit trails to ensure regulatory compliance and operational efficiency.

### Key Features

- **Intelligent Case Management** - Automated priority assignment, SLA tracking, and smart case routing
- **Dynamic Checklists** - Configurable workflow templates with branching logic and multiple field types
- **Role-Based Access Control** - Granular permissions for agents, compliance officers, and administrators
- **Email Integration** - Automated intake, template-based notifications, and complete communication history
- **Document Management** - Secure cloud storage with access controls and audit trails
- **Business Rules Engine** - Flexible automation for priority, tagging, SLA policies, and notifications
- **Dual Authentication** - Support for both Replit OAuth and Microsoft SSO (Azure AD)
- **Comprehensive Reporting** - Analytics, exports, and performance metrics
- **Audit Compliance** - Complete tracking of all actions and system changes

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- Replit Object Storage bucket (for file uploads)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables (see [Setup Guide](docs/SETUP.md))

4. Initialize the database:
   ```bash
   npm run db:push
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:5000`

### Default Admin Account

After seeding the database, log in with:
- **Username**: `admin`
- **Password**: `admin123`

**⚠️ Change the default password immediately in production!**

## Documentation

- **[Setup & Deployment](docs/SETUP.md)** - Installation, configuration, and deployment guide
- **[User Guide](docs/USER_GUIDE.md)** - Complete walkthrough for end users
- **[Admin Guide](docs/ADMIN_GUIDE.md)** - Configuration and administration
- **[API Documentation](docs/API.md)** - REST API reference for integrations
- **[Architecture](docs/ARCHITECTURE.md)** - Technical design and database schema
- **[Development Guide](docs/DEVELOPMENT.md)** - Contributing and development workflows

## Technology Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **UI Components**: shadcn/ui (Radix UI)
- **Styling**: Tailwind CSS with custom design system
- **State Management**: TanStack React Query
- **Routing**: Wouter
- **Forms**: React Hook Form with Zod validation

### Backend
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Passport.js (Local + Microsoft SSO)
- **Session Store**: PostgreSQL-backed sessions
- **File Storage**: Google Cloud Storage (via Replit Object Storage)

## Core Capabilities

### Case Management
- Create, edit, and track cases across multiple categories
- Automated assignment based on configurable rules
- Real-time status updates and notifications
- Case linking for related disputes
- Comprehensive search and filtering

### Workflow Automation
- Dynamic checklist templates with conditional logic
- Automated priority assignment based on case attributes
- Tag automation for categorization and routing
- SLA policy enforcement with deadline tracking
- Email notification triggers on case events

### User Management
- Role-based permissions (Agent, Compliance Officer, Admin)
- Lender-specific access restrictions
- View-only, resolution, deletion, and assignment permissions
- Microsoft SSO integration with per-user enforcement
- Audit trail of all user actions

### Email Features
- Webhook-based email intake for automatic case creation
- Template-based email composition with variable substitution
- Automated notification rules triggered by case events
- Complete email history with attachments
- Per-user Outlook integration for sending

### Reporting & Analytics
- Case volume and trend analysis
- Agent performance metrics
- SLA compliance tracking
- Resolution pattern analysis
- Lender-specific analytics
- Export to CSV for external analysis

## Project Structure

```
.
├── client/               # React frontend application
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── pages/       # Route-level pages
│   │   ├── lib/         # Utilities and helpers
│   │   └── hooks/       # Custom React hooks
├── server/              # Express backend application
│   ├── routes.ts        # API route definitions
│   ├── storage.ts       # Database abstraction layer
│   ├── auth.ts          # Authentication logic
│   ├── microsoftSSO.ts  # Microsoft OAuth integration
│   ├── rule-engine.ts   # Business rules evaluation
│   └── objectStorage.ts # File management service
├── shared/              # Shared TypeScript types
│   └── schema.ts        # Drizzle database schema
└── docs/                # Documentation files
```

## Key Workflows

### Creating a Case
1. Navigate to "New Case" from the dashboard
2. Select case type, category, and lender
3. Enter customer information
4. Add case details and attachments
5. Submit - automated rules assign priority, tags, and SLA

### Processing a Case
1. View assigned cases from dashboard
2. Complete dynamic checklist items
3. Upload required documents
4. Send templated emails to customers/lenders
5. Update status and add resolution details
6. Close case when complete

### Configuring Business Rules
1. Access Admin panel (admin users only)
2. Navigate to Business Rules section
3. Create priority rules, tag rules, or SLA policies
4. Define conditions using visual rule builder
5. Set outcomes (priority level, tags, timeframes)
6. Activate rule - applies automatically to new cases

## Security Features

- **Authentication**: Dual-mode with local credentials and Microsoft SSO
- **Authorization**: Role-based access control with granular permissions
- **Session Management**: Secure, PostgreSQL-backed sessions with httpOnly cookies
- **Data Protection**: Encrypted passwords using scrypt
- **Audit Logging**: Complete trail of all actions for compliance
- **File Security**: ACL-based access control on all documents
- **Input Validation**: Zod schema validation on all API requests

## Support & Contact

For questions, issues, or feature requests, please refer to:
- [User Guide](docs/USER_GUIDE.md) for usage questions
- [API Documentation](docs/API.md) for integration questions
- [Development Guide](docs/DEVELOPMENT.md) for contribution guidelines

## License

Copyright © 2025. All rights reserved.
