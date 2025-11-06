# Administrator Guide

Complete guide for system administrators to configure and manage the Complaint & Dispute Management Platform.

## Table of Contents

- [Admin Panel Overview](#admin-panel-overview)
- [Lender Management](#lender-management)
- [User Management](#user-management)
- [Business Rules Configuration](#business-rules-configuration)
- [Email Template Management](#email-template-management)
- [Checklist Template Configuration](#checklist-template-configuration)
- [Resolution Configuration](#resolution-configuration)
- [Value Sets Management](#value-sets-management)
- [System Health Monitoring](#system-health-monitoring)
- [Database Synchronization](#database-synchronization)
- [Best Practices](#best-practices)

## Admin Panel Overview

### Accessing the Admin Panel

1. Log in with an admin account
2. Click "Admin" in the sidebar navigation
3. Admin dashboard displays system overview

**Requirements**: Administrator role

### Admin Dashboard Sections

- **Lenders**: Manage lender organizations
- **Users**: User accounts and permissions
- **Business Rules**: Automation configuration
  - Priority Rules
  - Tag Rules
  - SLA Policies
  - Checklist Assignment Rules
  - Email Notification Rules
- **Email Templates**: Reusable email content
- **Checklist Templates**: Dynamic workflow checklists
- **Resolutions**: Disposition and policy violation options
- **Value Sets**: Case types, categories, statuses
- **System Health**: Database and server monitoring
- **Database Sync**: Production data synchronization

## Lender Management

### Creating a Lender

1. **Navigate to Admin → Lenders**
2. **Click "Add Lender"**
3. **Enter Lender Information**:
   - **Name**: Legal name of lender (required)
   - **Code**: Short identifier (e.g., "ACME")
   - **Status**: Active/Inactive
   - **Contact Information**:
     - Primary contact name
     - Email address
     - Phone number
     - Address

4. **Configure Email Settings** (optional):
   - Enable email sending for this lender
   - Enter Outlook credentials:
     - Email address
     - App password (not regular password)
     - SMTP server: smtp-mail.outlook.com
     - Port: 587
   
5. **Set Permissions**:
   - Assign users to this lender
   - Configure lender-specific workflows

6. **Save Lender**

### Email Configuration for Lenders

**Why Configure**:
- Send automated notifications from lender's email
- Maintain lender branding in communications
- Centralized email management

**Getting Outlook App Password**:
1. Go to [Microsoft Account Security](https://account.microsoft.com/security)
2. Select "Advanced security options"
3. Under "App passwords", create new password
4. Copy password (it's only shown once)
5. Use this in lender configuration

**Testing Email Configuration**:
1. After saving lender with email config
2. Create a test case for that lender
3. Send a test email
4. Verify email arrives from lender's address
5. Check audit log for email sending success

### Managing Lenders

**Edit Lender**:
- Click lender name
- Modify fields
- Save changes
- All changes logged in audit trail

**Deactivate Lender**:
- Set status to "Inactive"
- Existing cases remain accessible
- New cases cannot be created for inactive lender
- Users restricted to lender lose access

**Delete Lender**:
- Only possible if no cases exist
- Permanent action
- Requires confirmation

## User Management

### Creating a User

1. **Navigate to Admin → Users**
2. **Click "Add User"**
3. **Enter User Details**:
   - **Username**: Unique identifier (required)
   - **Email**: User's email address (required)
   - **Password**: Initial password (required)
   - **Full Name**: Display name

4. **Set Role**:
   - **Agent**: Standard case worker
   - **Compliance Officer**: Oversight and reporting
   - **Administrator**: Full system access

5. **Configure Permissions**:
   - **Restrict to Lender**: Limit to specific lender
   - **View Only**: Read-only access
   - **Can Resolve**: Allowed to resolve cases
   - **Can Delete**: Allowed to delete cases
   - **Can Assign**: Allowed to assign cases to others

6. **SSO Settings** (if Microsoft SSO configured):
   - **Require SSO**: Force Microsoft authentication
   - When enabled, user must login with Microsoft
   - Useful for enterprise compliance

7. **Email Configuration** (optional):
   - Enable email sending for this user
   - Configure Outlook credentials
   - User can send emails from their account

8. **Save User**

### User Permission Matrix

| Permission | Agent | Compliance Officer | Admin |
|------------|-------|-------------------|-------|
| View Cases | ✓ (assigned/lender) | ✓ (all) | ✓ (all) |
| Create Cases | ✓ | ✓ | ✓ |
| Edit Cases | ✓ | ✓ | ✓ |
| Resolve Cases | If granted | ✓ | ✓ |
| Delete Cases | If granted | If granted | ✓ |
| Assign Cases | If granted | ✓ | ✓ |
| View Reports | Own cases | All cases | All cases |
| Configure Rules | ✗ | ✗ | ✓ |
| Manage Users | ✗ | ✗ | ✓ |
| System Settings | ✗ | ✗ | ✓ |

### Managing User Access

**Lender Restrictions**:
- Assign user to specific lender
- User only sees cases for that lender
- Useful for lender-specific support teams
- Can be changed later if needed

**SSO Enforcement**:
- Enable "Require SSO" for enterprise users
- User cannot login with password
- Must use Microsoft SSO
- Enhances security for sensitive accounts

**View-Only Access**:
- Enable for auditors or observers
- User can see all case details
- Cannot modify or take actions
- All view activity still logged

### Resetting User Passwords

1. **Navigate to Admin → Users**
2. **Click user to edit**
3. **Click "Reset Password"**
4. **Enter New Password**
5. **Notify user of new password**
6. **User should change on first login**

### Deactivating Users

1. **Edit user**
2. **Set status to "Inactive"**
3. **User cannot login**
4. **Existing case assignments remain**
5. **Can be reactivated later**

## Business Rules Configuration

Business rules automate case processing based on configurable conditions.

### Priority Rules

**Purpose**: Automatically assign priority levels based on case attributes.

**Creating a Priority Rule**:

1. **Navigate to Admin → Business Rules → Priority Rules**
2. **Click "Add Priority Rule"**
3. **Configure Rule**:
   - **Name**: Descriptive name (e.g., "High Priority for Critical Complaints")
   - **Priority Level**: Critical, High, Medium, or Low
   - **Status**: Active/Inactive

4. **Define Conditions**:
   - Click "Add Condition"
   - Select field (e.g., "Category")
   - Choose operator (equals, contains, greater than, etc.)
   - Enter value
   - Add more conditions as needed

5. **Set Logic**:
   - **AND**: All conditions must match
   - **OR**: Any condition can match

6. **Save Rule**

**Example Rules**:

**Rule 1**: Critical Priority for Fraud Complaints
```
Conditions (AND):
- Case Type = "Complaint"
- Category = "Fraud"
Priority: Critical
```

**Rule 2**: High Priority for Large Amounts
```
Conditions (OR):
- Amount > 10000
- Has Representative = true
Priority: High
```

**Rule Priority**: If multiple rules match, highest priority wins (Critical > High > Medium > Low).

### Tag Rules

**Purpose**: Automatically apply tags to cases for categorization and routing.

**Creating a Tag Rule**:

1. **Navigate to Admin → Business Rules → Tag Rules**
2. **Click "Add Tag Rule"**
3. **Configure Rule**:
   - **Name**: Descriptive name
   - **Tags**: One or more tags to apply (comma-separated)
   - **Status**: Active/Inactive

4. **Define Conditions**: Same as priority rules

5. **Save Rule**

**Example Rules**:

**Rule**: Auto-tag VIP Customers
```
Conditions:
- Customer Tier = "VIP"
Tags: VIP, High-Touch, Expedite
```

**Rule**: Flag Regulatory Issues
```
Conditions (OR):
- Category = "Regulatory Violation"
- Details contains "CFPB"
- Details contains "FTC"
Tags: Regulatory, Legal-Review, Compliance
```

**Multiple Matches**: A case can match multiple tag rules. All matching tags are applied.

### SLA Policies

**Purpose**: Define response and resolution timeframes based on case characteristics.

**Creating an SLA Policy**:

1. **Navigate to Admin → Business Rules → SLA Policies**
2. **Click "Add SLA Policy"**
3. **Configure Policy**:
   - **Name**: Descriptive name
   - **Priority**: Used for rule precedence
   - **Response Time**: Hours to first response
   - **Resolution Time**: Hours to final resolution
   - **Status**: Active/Inactive

4. **Define Conditions**: Same as other rules

5. **Save Policy**

**Example Policies**:

**Policy**: Critical Case SLA
```
Conditions:
- Priority = "Critical"
Response Time: 2 hours
Resolution Time: 24 hours
```

**Policy**: Standard Complaint SLA
```
Conditions:
- Case Type = "Complaint"
- Priority != "Critical"
Response Time: 24 hours
Resolution Time: 72 hours
```

**SLA Tracking**:
- System calculates deadlines automatically
- Dashboard shows cases approaching/breaching SLA
- Email notifications (if configured) alert stakeholders

### Checklist Assignment Rules

**Purpose**: Automatically assign checklist templates based on case attributes.

**Creating a Checklist Assignment Rule**:

1. **Navigate to Admin → Business Rules → Checklist Assignment**
2. **Click "Add Assignment Rule"**
3. **Configure Rule**:
   - **Name**: Descriptive name
   - **Checklist Template**: Template to assign
   - **Status**: Active/Inactive

4. **Define Conditions**: Same as other rules

5. **Save Rule**

**Example Rules**:

**Rule**: Fraud Investigation Checklist
```
Conditions:
- Category = "Fraud"
Assigns: "Fraud Investigation Checklist Template"
```

**Rule**: Mail Complaint Checklist
```
Conditions (AND):
- Case Type = "Mail"
- Category = "Lost Mail"
Assigns: "Lost Mail Resolution Checklist"
```

**Default Assignment**: If no rules match, category default checklist is assigned.

### Email Notification Rules

**Purpose**: Automatically send emails when specific events occur.

**Creating an Email Notification Rule**:

1. **Navigate to Admin → Business Rules → Email Notifications**
2. **Click "Add Notification Rule"**
3. **Configure Rule**:
   - **Name**: Descriptive name
   - **Event Trigger**: When to send
     - Case Created
     - Status Changed
     - Case Assigned
     - Case Resolved
     - SLA Warning
   - **Status**: Active/Inactive

4. **Define Conditions**: When this notification applies

5. **Configure Email**:
   - **Sender**: User or Lender email integration
   - **Recipients**: 
     - Case Customer
     - Assigned Agent
     - Custom email addresses
   - **Template**: Select email template

6. **Save Rule**

**Example Rules**:

**Rule**: Welcome Email on Case Creation
```
Event: Case Created
Conditions: (all new cases)
Sender: Lender Email
Recipients: Case Customer
Template: "New Case Acknowledgment"
```

**Rule**: SLA Warning to Agent
```
Event: SLA Warning (6 hours before deadline)
Conditions: Priority = "Critical"
Sender: System
Recipients: Assigned Agent, Agent's Manager
Template: "SLA Deadline Warning"
```

**Background Processing**: Emails send asynchronously to avoid blocking case operations.

### Rule Testing

**Test Rules Before Activation**:

1. **Navigate to Admin → Business Rules → Rule Tester**
2. **Select Rule Type**: Priority, Tag, SLA, etc.
3. **Enter Test Case Data**:
   - Case Type
   - Category
   - Amount
   - Customer information
   - etc.

4. **Click "Test Rules"**

5. **View Results**:
   - Which rules match
   - Why they match (condition evaluation)
   - What would be applied (priority, tags, SLA, etc.)

6. **Refine Rules** based on test results

### Rule Management Best Practices

- **Name Clearly**: Descriptive names help future maintenance
- **Test Thoroughly**: Use rule tester before activation
- **Start Simple**: Begin with basic conditions, add complexity as needed
- **Document Purpose**: Add notes explaining business reasoning
- **Review Regularly**: Audit rules quarterly for relevance
- **Monitor Impact**: Check cases to ensure rules work as expected
- **Version Control**: Track changes in audit log

## Email Template Management

### Creating an Email Template

1. **Navigate to Admin → Email Templates**
2. **Click "Add Template"**
3. **Configure Template**:
   - **Name**: Internal reference name
   - **Description**: Purpose of template
   - **Category**: Type of communication
     - Lender
     - Customer
     - Internal
     - Other
   - **Subject**: Email subject line
   - **Body**: Email content

4. **Use Variables**:
   Available variables (auto-replace with case data):
   - `{{caseNumber}}` - Case ID
   - `{{customerName}}` - Customer's full name
   - `{{customerFirstName}}` - Customer's first name
   - `{{customerLastName}}` - Customer's last name
   - `{{lenderName}}` - Lender name
   - `{{category}}` - Case category
   - `{{priority}}` - Priority level
   - `{{status}}` - Current status
   - `{{details}}` - Case details
   - `{{createdDate}}` - Creation date
   - `{{assignedAgent}}` - Assigned agent name

5. **Save Template**

### Example Templates

**New Case Acknowledgment**:
```
Subject: Case {{caseNumber}} - We've Received Your Inquiry

Dear {{customerFirstName}},

Thank you for contacting {{lenderName}}. We have received your inquiry 
and created case {{caseNumber}} to track our response.

Case Details:
- Case Number: {{caseNumber}}
- Category: {{category}}
- Priority: {{priority}}

We will review your case and respond within our standard timeframe. 
You can reference this case number in any future correspondence.

Best regards,
{{lenderName}} Customer Service Team
```

**Status Update**:
```
Subject: Update on Case {{caseNumber}}

Dear {{customerName}},

This is an update regarding your case {{caseNumber}}.

Current Status: {{status}}
Priority: {{priority}}

{{details}}

If you have any questions, please don't hesitate to contact us.

Best regards,
{{lenderName}} Support
```

**Resolution Notice**:
```
Subject: Case {{caseNumber}} - Resolved

Dear {{customerName}},

We are pleased to inform you that case {{caseNumber}} has been resolved.

Resolution Details:
{{details}}

If you have any concerns about this resolution, please contact us 
within 30 days.

Thank you for your patience.

Best regards,
{{lenderName}}
```

### Template Variables

All templates support dynamic variable substitution. When sending an email, variables are replaced with actual case data.

**Testing Templates**:
1. Create or edit template
2. Click "Preview with Sample Data"
3. See how template renders with example case
4. Verify all variables populate correctly

## Checklist Template Configuration

### Creating a Checklist Template

1. **Navigate to Admin → Checklist Templates**
2. **Click "Add Template"**
3. **Configure Template**:
   - **Name**: Template name
   - **Description**: Purpose and usage notes
   - **Status**: Active/Inactive

4. **Add Checklist Items**:
   Click "Add Item" for each step in the workflow

5. **For Each Item**:
   - **Label**: Item description (e.g., "Verify customer identity")
   - **Field Type**: Choose from:
     - **Checkbox**: Simple yes/no
     - **Dropdown**: Select from options
     - **Text**: Free-form entry
     - **Number**: Numeric value
     - **Date**: Date picker
     - **File**: Document upload
   - **Required**: Must be completed before resolution
   - **Help Text**: Optional guidance for agents

6. **Configure Field-Specific Options**:

   **For Dropdown Fields**:
   - Add options (one per line)
   - Example: "Phone", "Email", "In-Person"

   **For Text Fields**:
   - Set minimum length (if needed)
   - Set maximum length

   **For Number Fields**:
   - Set minimum value
   - Set maximum value

   **For File Fields**:
   - Specify allowed file types
   - Set maximum file size

7. **Arrange Items**:
   - Drag to reorder
   - Group related items together
   - Logical workflow sequence

8. **Save Template**

### Example Checklist Templates

**Fraud Investigation Checklist**:
1. ☑ Verified customer identity (Checkbox, Required)
2. ☑ Reviewed account history (Checkbox, Required)
3. 📝 Initial assessment notes (Text, Required)
4. 📅 Date of alleged fraud (Date, Required)
5. 💰 Amount in dispute (Number, Required)
6. 📁 Police report uploaded (File - PDF, Required)
7. ⬇️ Investigation outcome (Dropdown: Fraud Confirmed, No Fraud, Inconclusive)
8. ☑ Contacted fraud department (Checkbox, Required)
9. 📝 Final resolution notes (Text, Required)

**Lost Mail Resolution Checklist**:
1. ☑ Confirmed tracking number (Checkbox, Required)
2. 📅 Expected delivery date (Date, Required)
3. ⬇️ Contact method (Dropdown: Phone, Email, Mail)
4. ☑ Filed claim with postal service (Checkbox)
5. 📁 Proof of mailing (File, Required)
6. 📝 Resolution details (Text, Required)

### Assigning Templates to Categories

**Manual Assignment**:
1. Edit checklist template
2. Select "Default for Categories"
3. Choose one or more categories
4. Save

**Rule-Based Assignment**:
- Create checklist assignment rule (see Business Rules section)
- More flexible than category defaults
- Can use multiple conditions

## Resolution Configuration

### Managing Dispositions

**Dispositions** are the primary outcome categories for resolved cases.

1. **Navigate to Admin → Resolutions → Dispositions**
2. **Click "Add Disposition"**
3. **Enter**:
   - **Code**: Short identifier (e.g., "RESOLVED")
   - **Label**: Display name (e.g., "Resolved - Customer Satisfied")
   - **Description**: When to use this disposition

4. **Save**

**Example Dispositions**:
- Resolved - Customer Satisfied
- Resolved - Refund Issued
- Resolved - Service Restored
- Closed - No Action Required
- Closed - Cannot Reproduce
- Closed - Customer Withdrew
- Escalated - Forwarded to Legal

### Managing Sub-Dispositions

**Sub-Dispositions** provide additional detail within a disposition.

1. **Navigate to Admin → Resolutions → Sub-Dispositions**
2. **Click "Add Sub-Disposition"**
3. **Enter**:
   - **Parent Disposition**: Associated disposition
   - **Code**: Short identifier
   - **Label**: Display name
   - **Description**: Specific circumstances

4. **Save**

**Example Sub-Dispositions** (for "Resolved - Refund Issued"):
- Full Refund
- Partial Refund
- Credit Applied
- Replacement Sent

### Managing Policy Violations

**Policy Violations** track if company policy was breached.

1. **Navigate to Admin → Resolutions → Policy Violations**
2. **Click "Add Policy Violation"**
3. **Enter**:
   - **Code**: Short identifier
   - **Label**: Violation type
   - **Severity**: Minor, Moderate, Severe
   - **Description**: Details and remediation

4. **Save**

**Example Policy Violations**:
- Customer Service Failure
- Processing Error
- Delay in Response
- Incorrect Information Provided
- Unauthorized Fee Charged
- Privacy Breach

### Resolution Reporting

Track resolution patterns:
- Most common dispositions
- Policy violation trends
- Resolution time by disposition
- Agent performance by outcome

## Value Sets Management

### Case Types

Define available case types:

1. **Navigate to Admin → Value Sets → Case Types**
2. **Add/Edit Case Types**:
   - Mail
   - Complaint
   - Dispute
   - (Add custom types as needed)

### Categories

Define categories within each case type:

1. **Navigate to Admin → Value Sets → Categories**
2. **Add Category**:
   - **Name**: Category name
   - **Case Type**: Parent type
   - **Description**: When to use
   - **Default Checklist**: Optional default template

**Example Categories** (for Complaint type):
- Service Quality
- Billing Issues
- Product Defect
- Fraud
- Privacy Concern
- Harassment
- Other

### Case Originations

Define how cases are received:

1. **Navigate to Admin → Value Sets → Originations**
2. **Add Origination**:
   - Email
   - Phone
   - Mail
   - Web Portal
   - In-Person
   - Social Media
   - Third-Party

### Statuses

Define available case statuses:

Default statuses:
- Open
- In Progress
- Pending Customer
- Pending Internal
- Resolved
- Closed
- Pending Intake (for email intake)

**Custom Statuses**:
- Add organization-specific statuses as needed
- Define status transitions
- Configure status-triggered actions

## System Health Monitoring

### Accessing System Health

1. **Navigate to Admin → System Health**
2. **View Health Dashboard**:
   - Database status
   - Server status
   - Storage status
   - Recent errors
   - Performance metrics

### Database Health

**Metrics**:
- Connection status
- Active connections
- Database size
- Table sizes
- Index health
- Query performance

**Maintenance Tasks**:
- Vacuum database (PostgreSQL)
- Analyze tables
- Rebuild indexes
- Archive old data

### Server Health

**Metrics**:
- CPU usage
- Memory usage
- Disk space
- Response times
- Error rates

**Alerts**:
- High CPU usage
- Low disk space
- Elevated error rates
- Slow response times

### Storage Health

**Object Storage Metrics**:
- Total files
- Storage used
- Upload success rate
- Download performance

**Maintenance**:
- Check orphaned files
- Verify ACL policies
- Review access logs

## Database Synchronization

**Purpose**: Sync development database data to production.

**⚠️ CAUTION**: This is a powerful admin tool. Use carefully.

### Accessing Database Sync

1. **Navigate to Admin → Database Sync**
2. **Review Sync Options**

### Sync Operations

**What Gets Synced**:
- Lenders
- Case types
- Categories
- Checklist templates
- Business rules
- Email templates
- Resolution configurations

**What Does NOT Sync**:
- Cases
- Customers
- Users
- Audit logs
- Sessions

### Running a Sync

1. **Select Tables to Sync**
2. **Preview Changes**:
   - Shows what will be added/updated
   - Highlights potential conflicts

3. **Review Foreign Key Dependencies**:
   - System automatically handles relationships
   - Dependent records sync in correct order

4. **Confirm Sync**:
   - Click "Start Sync"
   - Monitor progress
   - Review completion report

5. **Verify Results**:
   - Check synced data in production
   - Test functionality
   - Review any errors or warnings

### Best Practices for Sync

- **Test in Dev First**: Verify all configurations work
- **Backup Production**: Always backup before syncing
- **Sync During Maintenance**: Low-traffic periods
- **Review Dependencies**: Understand what will be affected
- **Communicate Changes**: Notify team before syncing
- **Document Sync**: Record what was synced and why

## Best Practices

### Configuration Management

- **Version Control**: Track changes in audit log
- **Test Before Production**: Use dev environment
- **Document Decisions**: Add notes and descriptions
- **Review Regularly**: Quarterly config audits
- **Backup Configurations**: Export critical rules/templates
- **Gradual Rollout**: Test with small user group first

### User Management

- **Least Privilege**: Grant minimum necessary permissions
- **Regular Access Reviews**: Audit user permissions quarterly
- **Offboarding Process**: Deactivate users promptly
- **Password Policy**: Enforce strong passwords
- **SSO for Enterprise**: Use Microsoft SSO where possible
- **Monitor Activity**: Review audit logs for suspicious behavior

### Rule Management

- **Start Simple**: Begin with basic rules
- **Test Thoroughly**: Use rule tester extensively
- **Name Clearly**: Descriptive, searchable names
- **Document Purpose**: Explain business reasoning
- **Monitor Impact**: Review rule match rates
- **Iterate**: Refine based on real usage
- **Avoid Over-Automation**: Balance automation with flexibility

### Email Management

- **Template Consistency**: Maintain brand voice
- **Test Variables**: Verify all placeholders work
- **Proofread**: Check spelling and grammar
- **Mobile-Friendly**: Test on mobile devices
- **Unsubscribe**: Include opt-out where required
- **Monitor Deliverability**: Check bounce rates
- **Compliance**: Follow email regulations (CAN-SPAM, GDPR)

### Performance Optimization

- **Archive Old Cases**: Move resolved cases to archive
- **Clean Up Documents**: Remove unnecessary files
- **Optimize Rules**: Simplify complex conditions
- **Index Database**: Ensure proper indexing
- **Monitor Queries**: Identify slow operations
- **Cache Where Possible**: Reduce repeated computations

### Security

- **Regular Updates**: Keep platform updated
- **Strong Passwords**: Enforce password complexity
- **SSO Preferred**: Use enterprise SSO where possible
- **Audit Regularly**: Review security logs
- **Limit Admin Access**: Minimize admin accounts
- **Enable MFA**: Multi-factor authentication where supported
- **Encrypt Sensitive Data**: Especially customer PII

### Compliance

- **Audit Trail**: Preserve all audit logs
- **Data Retention**: Follow retention policies
- **Privacy**: Comply with GDPR, CCPA, etc.
- **Access Controls**: Enforce role-based access
- **Regular Backups**: Automated, tested backups
- **Disaster Recovery**: Maintain recovery plan
- **Documentation**: Keep accurate records

## Troubleshooting Common Issues

### Users Cannot Access Cases

**Check**:
- User has appropriate role
- Lender restriction matches case lender
- User is not "View Only" if trying to modify
- User account is active
- SSO requirements are met

### Business Rules Not Working

**Check**:
- Rule is active
- Conditions match case attributes exactly
- Field names are correct
- Operators are appropriate for data types
- Use rule tester to debug

### Emails Not Sending

**Check**:
- Email configuration is complete
- Outlook credentials are correct
- SMTP settings are accurate
- Email template is active
- Notification rule conditions match
- Check audit log for error details

### Checklists Not Appearing

**Check**:
- Template is active
- Assignment rule exists and is active
- Category has default template (if no rules)
- Rule conditions match case

### Performance Issues

**Check**:
- Database indexes exist
- Large tables need archiving
- Too many active cases
- Complex rules slowing system
- Server resources adequate

## Support and Escalation

For issues beyond this guide:

1. **Check Documentation**: Review all admin guides
2. **Search Audit Logs**: Often reveals the issue
3. **Test in Development**: Reproduce in non-production
4. **Review Recent Changes**: Check audit for recent config changes
5. **Contact Support**: Provide detailed error information
