# User Guide

Complete guide to using the Complaint & Dispute Management Platform for agents, compliance officers, and administrators.

## Table of Contents

- [Getting Started](#getting-started)
- [Dashboard Overview](#dashboard-overview)
- [Case Management](#case-management)
- [Working with Checklists](#working-with-checklists)
- [Document Management](#document-management)
- [Email Features](#email-features)
- [Search and Filtering](#search-and-filtering)
- [Reports and Analytics](#reports-and-analytics)
- [User Roles and Permissions](#user-roles-and-permissions)
- [Best Practices](#best-practices)

## Getting Started

### Logging In

The platform supports two authentication methods:

**Local Authentication**:
1. Navigate to the login page
2. Enter your username and password
3. Click "Log In"

**Microsoft SSO** (if enabled for your account):
1. Click "Sign in with Microsoft"
2. Authenticate with your Microsoft account
3. Grant permissions if prompted

### First-Time Setup

After logging in for the first time:

1. **Update Your Profile**
   - Click your name in the top-right corner
   - Select "Profile"
   - Update your email and contact information

2. **Familiarize with the Dashboard**
   - Review your assigned cases
   - Check pending tasks
   - Explore available reports

3. **Review Your Permissions**
   - Check which lenders you have access to
   - Understand your role (Agent, Compliance Officer, Admin)
   - Note any restrictions on your account

## Dashboard Overview

### Main Dashboard

The dashboard provides an at-a-glance view of your work:

**Key Metrics**:
- **Total Cases**: All cases you have access to
- **Pending Cases**: Cases awaiting action
- **Cases Due Today**: Cases with SLA deadlines today
- **Overdue Cases**: Cases past their SLA deadline

**Quick Actions**:
- Create new case
- Search cases
- View reports
- Access admin panel (admins only)

**Recent Activity**:
- Recently updated cases
- Cases assigned to you
- Cases approaching deadlines
- Recent audit activity

### Navigation

**Sidebar Menu**:
- **Dashboard**: Main overview
- **Cases**: All cases
- **New Case**: Create a case
- **Reports**: Analytics and exports
- **Admin** (admin only): System configuration

**Top Bar**:
- Search: Quick case lookup
- Notifications: System alerts
- Profile: User settings
- Theme Toggle: Light/dark mode

## Case Management

### Creating a New Case

1. **Navigate to Case Creation**
   - Click "New Case" in sidebar
   - Or click "+ New Case" button on dashboard

2. **Select Case Type**
   - **Mail**: Issues related to mail delivery
   - **Complaint**: Customer complaints
   - **Dispute**: Formal disputes requiring resolution

3. **Choose Category**
   - Categories are specific to your case type
   - Each category may have different checklists and requirements

4. **Select Lender**
   - Choose the lender associated with this case
   - Only lenders you have access to will be shown

5. **Enter Customer Information**
   
   **Required Fields**:
   - First Name
   - Last Name
   - State
   
   **Optional Fields**:
   - Email
   - Phone
   - Address (Line 1, Line 2, City, Zip Code)
   - Account Number
   - Customer Number

6. **Find Existing Customer** (Optional)
   - Click "Find Existing Customer"
   - Search by email, phone, customer number, or account number
   - Select matching customer to auto-fill information

7. **Add Case Details**
   - Enter comprehensive description
   - Include relevant dates and amounts
   - Note any special circumstances

8. **Specify Origin**
   - How the case was received (Email, Phone, Mail, Web, In-Person, etc.)

9. **Representative Information** (if applicable)
   - Enable "Customer has representative"
   - Enter company name and contact information

10. **Upload Documents** (Optional)
    - Attach relevant files
    - Supported formats: PDF, Word, Excel, images
    - Maximum file size: 10MB per file

11. **Submit**
    - Review all information
    - Click "Create Case"
    - System automatically assigns priority, tags, and SLA based on business rules

### Viewing Case Details

**Case Overview**:
- Case number and status
- Priority level (Critical, High, Medium, Low)
- SLA deadlines (Response and Resolution)
- Tags and categories
- Customer information
- Lender details

**Status Indicators**:
- **Open**: Newly created, awaiting assignment
- **In Progress**: Actively being worked on
- **Pending Customer**: Awaiting customer response
- **Pending Internal**: Awaiting internal review
- **Resolved**: Case completed
- **Closed**: Case finalized

**Tabs**:
- **Details**: Case information and checklist
- **Documents**: All attached files
- **Emails**: Communication history
- **Audit Log**: Complete activity trail
- **Linked Cases**: Related cases

### Editing a Case

1. **Open Case Details**
2. **Click "Edit Case Details"**
3. **Modify Fields**
   - Update customer information
   - Change case type or category
   - Edit details or description
   - Update representative info
4. **Save Changes**
   - All edits are logged in audit trail

**Permissions**: Only users with modify permissions can edit cases.

### Updating Case Status

1. **Click "Update Status"** on case details page
2. **Select New Status**:
   - In Progress
   - Pending Customer
   - Pending Internal
   - Resolved
   - Closed
3. **Add Status Note** (required)
4. **Click "Update"**

Status changes trigger:
- Audit log entry
- Email notifications (if configured)
- SLA recalculation

### Assigning Cases

**Self-Assignment**:
1. Open unassigned case
2. Click "Assign to Me"

**Assign to Another User**:
1. Open case
2. Click "Reassign"
3. Select user from dropdown
4. Add assignment note
5. Click "Assign"

**Permissions**: Requires "Can Assign" permission

### Resolving Cases

1. **Complete All Checklist Items** (if required)
2. **Click "Resolve Case"**
3. **Select Resolution Details**:
   - **Disposition**: Primary outcome category
   - **Sub-Disposition**: Specific resolution reason
   - **Policy Violation**: If policy was violated
4. **Add Resolution Notes**:
   - Explain what was done
   - Note any follow-up required
   - Document customer satisfaction
5. **Upload Final Documents** (if needed)
6. **Submit Resolution**

**Permissions**: Requires "Can Resolve" permission

### Linking Related Cases

**Why Link Cases**:
- Track related disputes
- Identify patterns
- Maintain complete customer history

**How to Link**:
1. Open case details
2. Navigate to "Linked Cases" tab
3. Click "Link Case"
4. Search for case to link
5. Select relationship type:
   - Duplicate
   - Related
   - Follow-up
   - Escalation
   - Merged
6. Add linking note
7. Submit

Linked cases show bidirectional relationship in both cases.

## Working with Checklists

### Understanding Dynamic Checklists

Checklists are automatically assigned based on:
- Case category
- Case type
- Business rules matching case attributes

Each checklist contains required items that must be completed before resolution.

### Checklist Field Types

**Checkbox**:
- Simple yes/no completion
- Click to toggle complete
- Example: "Verified customer identity"

**Dropdown**:
- Select from predefined options
- Example: "Resolution method" → [Phone, Email, Mail]

**Text**:
- Free-form text entry
- Example: "Customer feedback notes"

**Number**:
- Numeric value
- Example: "Refund amount"

**Date**:
- Calendar picker
- Example: "Scheduled follow-up date"

**File Upload**:
- Attach documents specific to checklist item
- Example: "Upload signed resolution agreement"
- Files stored securely with case

### Completing Checklist Items

1. **Open Case Details**
2. **View Checklist Section**
3. **For Each Item**:
   
   **Checkbox Items**:
   - Click checkbox to mark complete
   - Uncheck if you need to undo
   
   **Dropdown Items**:
   - Click dropdown
   - Select appropriate option
   - Selection is saved automatically
   
   **Text Items**:
   - Click in text field
   - Enter required information
   - Text saves on blur (when you click away)
   
   **Number Items**:
   - Click in number field
   - Enter numeric value
   - Can use up/down arrows
   
   **Date Items**:
   - Click date picker
   - Select date from calendar
   - Or manually enter date (MM/DD/YYYY)
   
   **File Items**:
   - Click "Choose File" or "Upload"
   - Select file from computer
   - Wait for upload confirmation
   - File appears in case documents

4. **Track Progress**
   - Progress bar shows completion percentage
   - Incomplete items highlighted
   - Required items marked with asterisk

**Auto-Save**: Most checklist items save automatically. You'll see a brief confirmation message.

### Checklist Validation

Before resolving a case, the system checks:
- All required checklist items are complete
- File uploads are finished
- Dropdown selections are made
- Text fields have minimum required content

**If validation fails**:
- Error message shows which items need attention
- Scroll to incomplete items
- Complete missing items
- Try resolving again

## Document Management

### Uploading Documents

**During Case Creation**:
1. Scroll to "Attachments" section
2. Click "Choose Files" or drag and drop
3. Select one or more files
4. Files upload automatically
5. See upload progress
6. Remove unwanted files before submission

**To Existing Case**:
1. Open case details
2. Navigate to "Documents" tab
3. Click "Upload Document"
4. Select file
5. Wait for upload confirmation

**Supported Formats**:
- PDF documents
- Microsoft Word (.doc, .docx)
- Microsoft Excel (.xls, .xlsx)
- Images (.jpg, .jpeg, .png, .gif)
- Text files (.txt)

**File Size Limit**: 10MB per file

### Viewing Documents

1. Navigate to "Documents" tab on case
2. See list of all attachments:
   - Filename
   - Upload date
   - Uploaded by
   - File size
   - File type icon

3. **Download File**:
   - Click filename or download icon
   - File downloads to your computer

4. **Preview** (if supported):
   - PDFs and images show inline preview
   - Other formats require download

### Document Security

**Access Control**:
- Only users with case access can view documents
- Permissions checked at download time
- Audit trail tracks who downloaded what and when

**Storage**:
- Files stored in secure cloud storage
- Encrypted at rest and in transit
- Automatic backups
- Retention per company policy

### Email Attachments

Documents attached to incoming or outgoing emails:
- Automatically saved to case documents
- Tagged as email attachments
- Linked to corresponding email in history

## Email Features

### Sending Emails

1. **Open Case Details**
2. **Click "Send Email"**
3. **Choose Template** (or create custom)
4. **Enter Recipients**:
   - **To**: Primary recipient (usually customer)
   - **CC**: Copy additional recipients
   - **BCC**: Blind copy (hidden from other recipients)

5. **Customize Email**:
   - Template auto-populates subject and body
   - Variables replaced with case data:
     - `{{caseNumber}}` → Actual case number
     - `{{customerName}}` → Customer's name
     - `{{lenderName}}` → Lender name
     - etc.
   - Edit subject or body as needed

6. **Attach Documents** (optional):
   - Select from existing case documents
   - Or upload new files

7. **Review and Send**:
   - Preview final email
   - Click "Send Email"
   - Confirmation appears when sent

**Email Sender**:
- Uses your configured Outlook integration (if set up)
- Or uses lender's email configuration
- Admin must configure email settings

### Email History

View all emails sent and received for a case:

1. **Navigate to "Emails" Tab**
2. **View Email List**:
   - Sender and recipients
   - Subject line
   - Date/time sent
   - Template used (if any)
   - Attachments

3. **Expand Email**:
   - Click email to see full details
   - View complete body
   - Download attachments
   - See all recipients (To, CC, BCC)

**Email Sources**:
- **Manual**: Sent by user through platform
- **Automated**: Triggered by notification rules
- **Intake**: Incoming email that created case

### Automated Email Notifications

System can automatically send emails when:
- Case is created
- Status changes
- SLA deadline approaching
- Case is assigned
- Case is resolved
- Custom trigger conditions

**Configuration**: Admins set up email notification rules

**Visibility**: All automated emails appear in case email history

## Search and Filtering

### Quick Search

**Top Bar Search**:
1. Click search box in top bar
2. Enter search term:
   - Case number (e.g., "CASE-12345")
   - Customer name
   - Account number
3. Press Enter or click search icon
4. Results appear immediately

### Advanced Search

1. **Navigate to Cases Page**
2. **Click "Advanced Search"**
3. **Apply Filters**:

**Status Filters**:
- Open
- In Progress
- Pending Customer
- Pending Internal
- Resolved
- Closed
- Multiple selections allowed

**Priority Filters**:
- Critical
- High
- Medium
- Low

**Date Filters**:
- Created date range
- Modified date range
- Resolved date range
- SLA deadline range

**Assignment Filters**:
- Assigned to me
- Assigned to specific user
- Unassigned
- By lender

**Type and Category**:
- Filter by case type
- Filter by category
- Combine multiple filters

4. **Sort Results**:
   - By creation date (newest/oldest)
   - By priority (highest/lowest)
   - By SLA deadline (soonest/latest)
   - By status
   - By case number

5. **Save Search** (optional):
   - Click "Save Search"
   - Name your search
   - Quickly reuse later

### Bulk Actions

Select multiple cases to:
- Bulk assign
- Bulk status update
- Bulk tag application
- Bulk export

**How to Use**:
1. Check boxes next to cases
2. Select action from dropdown
3. Apply to all selected cases
4. Confirm bulk action

## Reports and Analytics

### Accessing Reports

1. **Navigate to "Reports"** in sidebar
2. **Choose Report Type**:
   - Case Volume
   - Agent Performance
   - SLA Compliance
   - Resolution Patterns
   - Lender Analytics
   - Custom Reports

### Case Volume Reports

**Shows**:
- Total cases by period
- Cases by type and category
- Cases by status
- Trend analysis

**Filters**:
- Date range
- Lender
- Case type
- Category
- Status

**Visualizations**:
- Line charts for trends
- Bar charts for comparisons
- Pie charts for distributions

### Agent Performance Reports

**Metrics**:
- Cases handled
- Average resolution time
- SLA compliance rate
- Cases overdue
- Customer satisfaction (if tracked)

**Filters**:
- Agent/user
- Date range
- Lender
- Case type

### SLA Compliance Reports

**Shows**:
- Percentage meeting response SLA
- Percentage meeting resolution SLA
- Average time to response
- Average time to resolution
- Cases breaching SLA

**By**:
- Priority level
- Category
- Lender
- Agent

### Exporting Data

1. **Generate Report** with desired filters
2. **Click "Export"**
3. **Choose Format**:
   - CSV (for Excel/analysis)
   - PDF (for printing/sharing)
4. **Download File**

**Export Includes**:
- All filtered data
- Summary statistics
- Charts (PDF only)
- Generated timestamp

### Scheduled Reports

**Admins can configure**:
- Daily/weekly/monthly reports
- Auto-email to stakeholders
- Specific metrics and filters

## User Roles and Permissions

### Agent Role

**Can**:
- View assigned cases
- Create new cases
- Update case status
- Complete checklists
- Upload documents
- Send emails (if configured)
- View reports for own cases

**Cannot**:
- Access admin panel
- View other agents' cases (unless shared)
- Configure business rules
- Manage users
- Delete cases (unless granted)

### Compliance Officer Role

**Can**:
- View all cases (across lenders if permitted)
- Access comprehensive reports
- Review audit logs
- Monitor SLA compliance
- Override business rules (if needed)
- Generate compliance exports

**Cannot**:
- Configure system settings
- Manage users
- Delete audit logs
- Modify business rules

### Administrator Role

**Can**:
- Full system access
- Configure business rules
- Manage users and permissions
- Set up email templates
- Configure lenders
- Access all reports
- View system health
- Manage integrations
- Delete/archive cases

**Cannot**:
- Bypass audit logging (all actions tracked)

### Permission Flags

**Restrict to Lender**:
- User can only see cases for specific lender
- Useful for lender-specific agents

**View Only**:
- Can see cases but not modify
- Useful for read-only access or observers

**Can Resolve**:
- Allowed to mark cases as resolved
- Typically agents and compliance officers

**Can Delete**:
- Allowed to delete cases (with audit trail)
- Typically admins only

**Can Assign**:
- Allowed to assign cases to other users
- Supervisors and admins

## Best Practices

### Case Creation

- **Be Complete**: Enter all available information upfront
- **Use Find Customer**: Avoid duplicate customer records
- **Choose Correct Category**: Determines checklist and routing
- **Attach Early**: Upload all known documents during creation
- **Clear Details**: Write comprehensive case description

### Case Processing

- **Check Checklist First**: Review required items before starting
- **Update Status Regularly**: Keep stakeholders informed
- **Add Meaningful Notes**: Future agents need context
- **Document Thoroughly**: Over-communicate in notes
- **Link Related Cases**: Maintain complete customer view

### Document Management

- **Descriptive Filenames**: Use clear, searchable names
- **Organize by Type**: Group similar documents
- **Upload Promptly**: Don't wait until resolution
- **Verify Uploads**: Ensure files uploaded successfully
- **Check Quality**: Ensure documents are legible

### Email Communication

- **Use Templates**: Ensure consistent messaging
- **Personalize**: Customize template content appropriately
- **Proofread**: Check before sending
- **Attach Relevant Docs**: Include supporting files
- **Follow Up**: Send status updates proactively

### Time Management

- **Prioritize by SLA**: Work on cases nearing deadlines first
- **Use Dashboard**: Start each day reviewing your queue
- **Set Reminders**: For follow-ups and deadlines
- **Batch Similar Tasks**: Process similar cases together
- **Leverage Automation**: Let system handle routing and notifications

### Data Quality

- **Verify Customer Info**: Double-check contact details
- **Update Changes**: Keep customer information current
- **Consistent Formatting**: Use standard formats (phone, dates, etc.)
- **Complete Checklists**: Don't skip required items
- **Accurate Resolution**: Choose correct disposition

### Collaboration

- **Assign Appropriately**: Route to correct specialist
- **Add Context**: When reassigning, explain why
- **Link Cases**: Help others see full picture
- **Share Knowledge**: Add notes that help teammates
- **Communicate**: Use status updates to coordinate

### Security and Compliance

- **Protect Customer Data**: Don't share outside platform
- **Log Out**: Especially on shared computers
- **Strong Passwords**: Use unique, complex passwords
- **Report Issues**: Security concerns to admin immediately
- **Follow SOPs**: Adhere to company procedures

## Getting Help

### In-App Support

- **Tooltips**: Hover over fields for quick help
- **Field Validation**: Error messages guide corrections
- **Status Messages**: Confirmations show success/failure

### Admin Support

- Contact your system administrator for:
  - Permission issues
  - Email configuration
  - Missing lenders or categories
  - System errors
  - Feature requests

### Documentation

- **Admin Guide**: For configuration questions
- **API Guide**: For integration questions
- **Setup Guide**: For technical issues

## Keyboard Shortcuts

- **Ctrl+K**: Quick search
- **Ctrl+N**: New case
- **Ctrl+S**: Save (where applicable)
- **Esc**: Close dialog/modal
- **Tab**: Navigate form fields

## Tips and Tricks

- **Bulk Selection**: Shift+click to select range
- **Multi-Sort**: Click column headers while holding Ctrl
- **Quick Filters**: Bookmark frequently used searches
- **Email Templates**: Save time with pre-written templates
- **Custom Views**: Admins can create role-specific dashboards
- **Mobile Access**: Platform is mobile-responsive
- **Dark Mode**: Toggle for eye comfort
- **Auto-Refresh**: Dashboard updates automatically
