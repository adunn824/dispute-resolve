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
- **Admin Panel**: Dynamic system for runtime updates to case types, categories, checklist templates, assignment rules, priority rules, tag automation, resolution configurations, SLA policies, value sets, and feature flags.
- **Audit Trail**: Tracking of configuration changes with rollback capability.
- **Rule-Based Automation**: Intelligent workflow automation using configurable business rules.

### File Management
- **Strategy**: Prepared for S3 integration with presigned URL patterns.
- **Document Types**: Support for various file types (PDF, images, archives).

### Security & Compliance
- **Authentication**: OAuth-based with Replit integration.
- **Authorization**: Role-based access control.
- **Audit Logging**: Comprehensive tracking of user actions and system changes.
- **Data Validation**: Zod schemas for type safety and validation.

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