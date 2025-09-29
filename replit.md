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

### Phase 3 Complete: Advanced Case Management Workflows (September 2024)
- **Case Detail Views**: Comprehensive case display with customer details, case history, and full case information
- **Case Notes System**: Timeline-based notes with automatic status updates, user attribution, and real-time updates
- **Assignment Management**: Flexible case assignment system with role-based permissions and assignment tracking
- **Status Management**: Complete case lifecycle management (open, in progress, resolved) with audit trails
- **Advanced Case List**: Sortable, searchable, filterable case management with:
  - Full-text search across customer names, case details, and loan IDs
  - Advanced filtering by status, priority, case type, category, and assignee
  - Sortable columns with proper SQL ordering (customer name, status, priority, dates)
  - Pagination with result counts and proper navigation
  - Role-based views (agent "My Cases" vs compliance "All Cases")
- **Enhanced APIs**: Comprehensive case management endpoints with search, filtering, and sorting capabilities
- **Database Optimization**: Enhanced storage methods with joined data queries for performance

### Phase 4 Complete: Enhanced Case Intake with Lender Information and POA/Attorney Representation (September 2024)
- **Lender Name Field**: Added optional lender name field to case intake form for better case tracking and organization
- **POA/Attorney Representation**: Implemented comprehensive representation functionality with:
  - Conditional checkbox to indicate if customer has POA or Attorney representation
  - Dynamic form section that shows/hides representative fields based on selection
  - Required fields for representative details: Company Name, Person Name, Address, Email, Phone
  - Conditional validation ensuring all representative fields are required when representation is indicated
- **Database Schema Enhancement**: Extended cases table with new columns for lender and representative information
- **Form Validation**: Enhanced Zod validation with conditional requirements using refine() for representative fields
- **UI/UX Design**: Consistent form styling with existing design patterns, proper visual grouping, and clear field labels
- **API Integration**: Updated case creation endpoint with comprehensive validation matching frontend requirements

### Phase 5 Complete: Automated Checklist Assignment System (September 2024)
- **Reusable Checklist Templates**: Complete template management system with:
  - Admin interface for creating/editing reusable checklist templates
  - Template items with configurable keys, labels, descriptions, required flags, sort order
  - Help text and estimated duration fields for each item
  - Active/inactive template toggles for workflow control
  - Template listing showing item counts and usage
- **Checklist Assignment Rules**: Integrated rule-based automation with:
  - New "Checklist Rules" tab in business rules admin panel
  - Full integration with existing RuleBuilder component
  - Template selector dropdown for assigning templates to rules
  - Support for complex AND/OR conditions (category, case type, state, priority, etc.)
  - Rule activation/deactivation with immediate effect
- **Automated Rule Evaluation**: Production-ready automation engine with:
  - Automatic checklist assignment during case creation
  - Real-time evaluation of all active checklist assignment rules
  - Global key-level duplicate prevention across all templates
  - Template-level tracking to prevent reprocessing
  - Type-safe integration with existing RuleEvaluator class
  - Non-blocking error handling with comprehensive logging
  - Idempotent behavior (safe for concurrent operations)
- **Frontend Bug Fixes**: Resolved critical query selector issues:
  - Fixed response.data extraction in template queries
  - Fixed template items fetch for proper dropdown rendering
  - Ensured consistent API response handling across admin pages
- **End-to-End Integration**: Complete workflow automation from rule configuration through case creation with automatic checklist population

**Status**: The platform now provides complete case management workflows from intake through resolution with full automation capabilities. All major case management features are operational with role-based access control, comprehensive search and filtering capabilities, full audit trails, and automated checklist assignment based on configurable business rules. The enhanced intake form captures lender information and supports POA/Attorney representation with proper validation. The system supports enterprise-grade case processing with real-time updates, proper data management, and intelligent workflow automation through reusable templates and rule-based checklist assignment.

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
  - Dynamic checklist system with case-specific and reusable templates
  - Reusable checklist templates with configurable items (JSON array storage)
  - Document management with metadata tracking
  - Resolution tracking with disposition and settlement data
  - Audit logging for all operations
  - Configurable business rules (priority rules, tag rules, checklist assignment rules, SLA policies)

### Configuration Management
- **Admin Panel**: Dynamic configuration system allowing runtime updates to:
  - Case types and categories
  - Reusable checklist templates with configurable items
  - Checklist assignment rules for automated workflow automation
  - Priority assignment rules and tag automation
  - Resolution configurations and SLA policies
  - Value sets and feature flags
- **Audit Trail**: Complete tracking of configuration changes with rollback capability
- **Rule-Based Automation**: Intelligent workflow automation using configurable business rules that automatically assign checklists, priorities, and tags based on case attributes during intake

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