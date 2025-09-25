# Design Guidelines: Complaint & Dispute Management Platform

## Design Approach
**System-Based Approach**: Using a refined version of Material Design principles focused on enterprise productivity and data management. This utility-focused platform prioritizes efficiency, clarity, and professional appearance over visual flair.

## Core Design Elements

### A. Color Palette
**Light Mode:**
- Primary: 220 91% 50% (Professional blue for actions and navigation)
- Background: 0 0% 98% (Clean off-white)
- Surface: 0 0% 100% (Pure white for cards and panels)
- Border: 220 13% 91% (Subtle gray borders)
- Text Primary: 220 9% 15% (Dark charcoal)
- Text Secondary: 220 9% 46% (Medium gray)

**Dark Mode:**
- Primary: 220 91% 60% (Slightly lighter blue for contrast)
- Background: 220 13% 9% (Deep dark blue-gray)
- Surface: 220 13% 11% (Elevated dark surface)
- Border: 220 13% 20% (Subtle dark borders)
- Text Primary: 220 13% 95% (Off-white)
- Text Secondary: 220 9% 70% (Light gray)

**Status Colors:**
- Success: 142 76% 36% (Professional green)
- Warning: 38 92% 50% (Amber warning)
- Error: 0 84% 60% (Clear red for alerts)
- Critical: 348 83% 47% (Urgent red for critical cases)

### B. Typography
**Primary Font**: Inter (Google Fonts)
- Headings: 600-700 weight, sizes from text-sm to text-3xl
- Body: 400-500 weight, text-sm to text-base
- Labels: 500 weight, text-xs to text-sm
- Code/IDs: JetBrains Mono, 400 weight

### C. Layout System
**Tailwind Spacing**: Consistent use of 2, 4, 6, 8, 12, 16 unit increments
- Component padding: p-4, p-6
- Section margins: mb-6, mb-8
- Grid gaps: gap-4, gap-6
- Container max-width: max-w-7xl with mx-auto

### D. Component Library

**Navigation:**
- Top navigation bar with logo, search, and user menu
- Sidebar navigation with collapsible sections for different user roles
- Breadcrumb navigation for deep case details

**Data Display:**
- Clean data tables with alternating row colors
- Status badges with appropriate color coding (Open, Pending, Resolved, Critical)
- Progress indicators for case completion
- Card layouts for case summaries and dashboards

**Forms:**
- Consistent form styling with proper spacing
- Clear field labels and validation states
- Multi-step forms for case intake with progress indicators
- File upload areas with drag-and-drop styling

**Admin Interface:**
- Tabbed interface for configuration sections
- JSON editor with syntax highlighting for rule configuration
- Preview modes for testing configurations
- Diff views for configuration changes

**Case Management:**
- Tabbed case detail view (Checklist, Documents, Resolution, Audit)
- Timeline view for audit logs
- Document viewer with download capabilities
- Resolution form with conditional fields

### E. Interactions
- Hover states: Subtle background color changes (hover:bg-gray-50 in light mode)
- Focus states: Prominent focus rings using focus:ring-2 focus:ring-blue-500
- Loading states: Skeleton screens and spinner indicators
- No custom animations - rely on CSS transitions for smooth state changes

## Specific UI Considerations

**Dashboard Design:**
- Grid-based layout with metric cards
- Clean charts and graphs using a charting library like Chart.js
- Filterable tables with search and sort functionality
- Quick action buttons prominently placed

**Case Intake Flow:**
- Progressive disclosure based on case type selection
- Real-time validation feedback
- Clear visual hierarchy for required vs optional fields

**Document Management:**
- Grid view for document thumbnails
- List view with metadata
- Upload progress indicators
- MIME type restrictions clearly communicated

**Admin Configuration:**
- Clear separation between draft and published configurations
- Version history with rollback capabilities
- Preview mode to test configurations before publishing
- Form builders for creating custom checklists and rules

This design system emphasizes clarity, efficiency, and professional appearance appropriate for a business-critical compliance tool while maintaining accessibility and usability across different user roles.