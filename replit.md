# Complaint & Dispute Management Platform

## Overview

This is a comprehensive Complaint & Dispute Management platform designed to streamline the intake, processing, and resolution of customer cases across Mail, Complaint, and Dispute categories. The platform provides role-based access for agents, compliance officers, and administrators, with automated priority assignment, branching checklists, document management, and configurable business rules.

The system is built as a single-repository full-stack application optimized for enterprise use, focusing on regulatory compliance, audit trails, and efficient case resolution workflows.

## Recent Changes

### Phase 1 Complete: Case Management System Operational (September 2024)
- **Authentication System**: Fixed critical password hashing from bcrypt to scrypt format, resolving login failures
- **Session Management**: Resolved session deserialization issues preventing API access after login
- **Case Intake Form**: Successfully connected to live APIs (/api/case-types, /api/categories) with dynamic category loading
- **API Integration**: Fixed apiRequest function to return parsed JSON instead of Response objects
- **Routing**: Added missing /cases/new route for case intake form
- **Query Management**: Added automatic cache invalidation after case creation to refresh dashboards
- **End-to-End Testing**: Verified complete case creation workflow with Playwright automation

### Phase 2 Complete: Real Data Dashboard Implementation (September 2024)
- **Dashboard API**: Created `/api/dashboard` endpoint with live database statistics calculation
- **Storage Layer**: Implemented `getDashboardStats` method for real-time case metrics and SLA tracking
- **Frontend Integration**: Updated Dashboard component to use TanStack Query with real API data
- **Mock Data Removal**: Successfully replaced all mock data references with live database queries
- **Error Handling**: Added proper loading states and empty state handling for zero-data scenarios
- **Bug Fixes**: Resolved import path issues and missing database query functions
- **End-to-End Testing**: Verified dashboard displays real statistics with appropriate empty state messages

**Status**: The dashboard now displays live data from the database including case counts, SLA alerts, and recent cases. All mock data has been successfully replaced with real database integration. The system provides proper loading states and handles empty data scenarios gracefully.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Framework**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design system focused on enterprise productivity
- **State Management**: TanStack React Query for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod validation
- **Theme System**: Custom light/dark mode implementation with CSS variables

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript throughout the stack
- **API Design**: RESTful endpoints with structured error handling
- **Authentication**: Replit OAuth integration with session-based auth
- **Session Storage**: PostgreSQL-backed sessions using connect-pg-simple
- **Business Logic**: Service layer pattern with storage abstraction

### Database Design
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema**: Comprehensive relational model supporting:
  - User management with role-based access (agent, compliance, admin)
  - Customer and case entities with flexible categorization
  - Dynamic checklist system with templates
  - Document management with metadata tracking
  - Resolution tracking with disposition and settlement data
  - Audit logging for all operations
  - Configurable business rules (priority rules, tag rules, SLA policies)

### Configuration Management
- **Admin Panel**: Dynamic configuration system allowing runtime updates to:
  - Case types and categories
  - Checklist templates and document requirements
  - Priority assignment rules and tag automation
  - Resolution configurations and SLA policies
  - Value sets and feature flags
- **Audit Trail**: Complete tracking of configuration changes with rollback capability

### File Management
- **Strategy**: Prepared for S3 integration with presigned URL patterns
- **Document Types**: Support for various file types (PDF, images, archives)
- **Metadata**: File size, type, upload tracking, and requirement validation

### Security & Compliance
- **Authentication**: OAuth-based with Replit integration
- **Authorization**: Role-based access control at API and UI levels
- **Audit Logging**: Comprehensive tracking of all user actions and system changes
- **Data Validation**: Zod schemas for runtime type safety and validation

### Development Features
- **Type Safety**: End-to-end TypeScript with shared schema definitions
- **Code Organization**: Clean separation between client, server, and shared code
- **Development Tools**: Hot reload, runtime error overlays, and development banners
- **Component Library**: Extensive shadcn/ui component system with examples

## External Dependencies

### Core Infrastructure
- **Database**: PostgreSQL (Neon serverless in production, configurable via DATABASE_URL)
- **Authentication Provider**: Replit OAuth service
- **Session Store**: PostgreSQL-backed sessions for scalability

### UI Libraries
- **Component System**: Radix UI primitives for accessibility and behavior
- **Icons**: Lucide React for consistent iconography
- **Styling**: Tailwind CSS with PostCSS processing
- **Fonts**: Google Fonts (Inter for UI, JetBrains Mono for code)

### Development Services
- **Build Tools**: Vite for fast development and optimized builds
- **Runtime**: ESBuild for server bundling
- **Development**: Replit-specific plugins for enhanced development experience

### Planned Integrations
- **File Storage**: AWS S3 for document storage (architecture prepared)
- **Email Services**: For automated notifications (hooks in place)
- **External APIs**: Webhook system for third-party integrations
- **Reporting**: Dashboard analytics and compliance reporting