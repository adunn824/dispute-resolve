# Complaint & Dispute Management Platform

## Overview

This platform is a comprehensive solution for managing customer complaints and disputes across various categories (Mail, Complaint, Dispute). It provides role-based access for agents, compliance officers, and administrators, featuring automated priority assignment, branching checklists, document management, and configurable business rules. The system is designed as a single-repository, full-stack application focused on regulatory compliance, audit trails, and efficient case resolution. It supports enterprise-grade case processing with real-time updates, intelligent workflow automation via reusable templates, and centralized lender administration, aiming to streamline operations and enhance resolution efficiency.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
- **Frontend Framework**: React with TypeScript (Vite).
- **UI Components**: shadcn/ui built on Radix UI.
- **Styling**: Tailwind CSS with a custom design system.
- **Theming**: Custom light/dark mode.

### Technical Implementations
- **Backend**: Node.js with Express.js and TypeScript.
- **API**: RESTful with structured error handling.
- **Authentication**: Dual authentication system supporting both Replit OAuth and Microsoft SSO (Azure AD). Session-based management using `connect-pg-simple`. Per-user SSO enforcement with toggleable requirement flags.
- **Database ORM**: Drizzle ORM with PostgreSQL.
- **State Management**: TanStack React Query for server state.
- **Routing**: Wouter.
- **Forms**: React Hook Form with Zod validation.
- **Business Logic**: Service layer pattern with storage abstraction.
- **User Permission System**: Granular, role-based access control with configurable fields (restrictedLenderId, isViewOnly, canResolve, canDelete, canAssign) enforced at both backend and frontend levels.
- **User Email Configuration**: Per-user Outlook email integration for sending notices, secured with OAuth and client secret redaction.
- **Email Intake System**: Webhook-based email ingestion (`POST /api/email-intake`) automatically creates cases with a "pending_intake" status, storing email metadata and attachments for agent review and completion.
- **Email Template System**: Admin-managed, reusable email templates with variable substitution for dynamic case data, categorized for different communication types (Lender, Customer, Internal, Other).
- **Email History**: Dedicated "Emails" tab in case details displaying chronological communication history, including sender, recipients, subject, body preview, template usage, and attachments, sourced from audit logs.
- **Email Notification Rules**: Automated email sending system triggered by case events. Rules define conditions for when emails should be sent, select sender (user or lender with configured Outlook integration), specify recipients, and choose email template. Rules are evaluated on case creation and updates, with asynchronous background email sending that doesn't block operations. All automated emails are logged in audit trails.
- **Case Editing**: Comprehensive dialog for editing all case creation fields, with dynamic dropdowns, customer management (find/create), and audit trail logging.
- **Database Sync System**: Admin interface (`/admin/database-sync`) to sync development database data to production, handling foreign key constraints, ensuring data integrity, and providing progress feedback.
- **Case Linking**: Bidirectional relationship tracking between related cases with manual search linking and automatic potential match detection. Features normalized self-linking prevention, permission-based access control, audit trail logging, and navigation between linked cases via dedicated "Linked Cases" tab.
- **Expanded Customer Data Model**: Comprehensive customer information capture with firstName, lastName, email, phone, complete address fields (address1, address2, city, state, zipCode), customerNumber, accountNumber, and lenderId reference. Supports customer lookup via multiple identifiers (email, phone, customerNumber, accountNumber) with optional lender filtering. Designed for external API integration with backward compatibility (legacy `name` field auto-populated as firstName + lastName).

### Feature Specifications
- **Dynamic Checklists**: Single, unified `reusableChecklistTemplates` system for all templates, automatically assigned based on category or business rules. Supports six field types (Checkbox, Dropdown, Text, Number, Date, File) with dynamic configuration. Rules require at least one condition to match (empty conditions do not auto-apply). Visual rule match display shows which templates are active and why, including per-condition evaluation results.
- **Admin Panel**: Dynamic system for runtime configuration of case types, categories, checklist templates, assignment rules, priority rules, tag automation, resolution configurations, SLA policies, email notification rules, value sets, and feature flags, including audit trails with rollback.
- **Resolution Options**: Fully configurable disposition, sub-disposition, and policy violation options managed via the admin interface.

### System Design Choices
- **File Management**: Integrated with Replit Object Storage (Google Cloud Storage backed) for document uploads/downloads with ACL-based access control. Files are stored privately with owner-based permissions, enforcing authorization at both case-level and object-level.
- **Audit Logging**: Comprehensive tracking of user actions and system changes for compliance.
- **Data Validation**: Zod schemas used for type safety and validation across the platform.

## External Dependencies

### Core Infrastructure
- **Database**: PostgreSQL (Neon serverless for production).
- **Authentication Provider**: Replit OAuth service.
- **Session Store**: PostgreSQL-backed sessions.
- **Object Storage**: Replit Object Storage (Google Cloud Storage) for document management with ACL policies.

### UI Libraries
- **Component System**: Radix UI.
- **Icons**: Lucide React.
- **Styling**: Tailwind CSS.
- **Fonts**: Google Fonts (Inter, JetBrains Mono).

### Development Services
- **Build Tools**: Vite (frontend), ESBuild (server).

### Planned Integrations
- **Email Services**: For automated notifications.
- **External APIs**: Webhook system.
- **Reporting**: Dashboard analytics and compliance.