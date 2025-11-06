# API Documentation

Complete REST API reference for integrating with the Complaint & Dispute Management Platform.

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [Pagination](#pagination)
- [Authentication Endpoints](#authentication-endpoints)
- [Case Management Endpoints](#case-management-endpoints)
- [Customer Management Endpoints](#customer-management-endpoints)
- [Email Intake Webhook](#email-intake-webhook)
- [Document Management Endpoints](#document-management-endpoints)
- [Configuration Endpoints](#configuration-endpoints)
- [Reporting Endpoints](#reporting-endpoints)
- [Export Endpoints](#export-endpoints)
- [Webhook Integration](#webhook-integration)

## Overview

**Base URL**: `https://your-domain.replit.app/api`

**Content Type**: All requests and responses use `application/json`

**API Version**: v1 (current)

**HTTP Methods**:
- `GET`: Retrieve resources
- `POST`: Create new resources
- `PUT` / `PATCH`: Update existing resources
- `DELETE`: Remove resources

## Authentication

### Session-Based Authentication

The API uses session-based authentication with HTTP-only cookies.

**Login Flow**:
1. POST to `/api/login` with credentials
2. Receive session cookie
3. Include cookie in subsequent requests
4. Cookie automatically sent by browser

**Authentication Methods**:
- **Local**: Username and password
- **Microsoft SSO**: OAuth 2.0 flow

### Authorization Levels

**Role Hierarchy** (highest to lowest):
1. `admin` - Full system access
2. `compliance` - Oversight and reporting
3. `agent` - Standard case operations

**Higher roles inherit lower role permissions** (admin can access agent endpoints).

### Protected Endpoints

Most endpoints require authentication. Use `requireAuth` or `requireRole` middleware.

**Example**: 
```
GET /api/cases
Headers:
  Cookie: connect.sid=<session-cookie>
```

## Error Handling

### Standard Error Response

```json
{
  "error": "Error message",
  "details": "Additional details (optional)"
}
```

### HTTP Status Codes

- `200` - Success
- `201` - Created
- `204` - No Content (successful deletion)
- `400` - Bad Request (invalid input)
- `401` - Unauthorized (not authenticated)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

### Validation Errors

```json
{
  "error": "Invalid input data",
  "details": [
    {
      "path": ["fieldName"],
      "message": "Validation message"
    }
  ]
}
```

## Rate Limiting

Currently no rate limiting implemented. Best practices:
- Implement exponential backoff on errors
- Cache frequently accessed data
- Use pagination for large datasets

## Pagination

### Query Parameters

```
GET /api/cases?limit=20&offset=0
```

Parameters:
- `limit`: Number of results per page (default: 20, max: 100)
- `offset`: Number of results to skip (default: 0)

### Response Format

```json
{
  "data": [ /* results array */ ],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

## Authentication Endpoints

### POST /api/login

Authenticate user with local credentials.

**Request**:
```json
{
  "username": "agent1",
  "password": "password123"
}
```

**Response** (200):
```json
{
  "id": "user-uuid",
  "username": "agent1",
  "email": "agent@example.com",
  "name": "Agent Name",
  "role": "agent",
  "restrictedLenderId": "lender-uuid",
  "isViewOnly": false,
  "canResolve": true,
  "canDelete": false,
  "canAssign": true
}
```

**Errors**:
- `401`: Invalid credentials
- `403`: SSO required for this user

---

### GET /api/auth/microsoft

Initiate Microsoft SSO flow.

**Response**: Redirects to Microsoft login page

---

### GET /api/auth/microsoft/callback

Microsoft SSO callback handler.

**Response**: Redirects to application with session established

---

### POST /api/logout

Log out current user.

**Response** (200):
```json
{
  "message": "Logged out successfully"
}
```

---

### GET /api/user

Get current authenticated user.

**Response** (200):
```json
{
  "id": "user-uuid",
  "username": "agent1",
  "email": "agent@example.com",
  "name": "Agent Name",
  "role": "agent",
  "restrictedLenderId": null,
  "isViewOnly": false,
  "canResolve": true,
  "canDelete": false,
  "canAssign": true,
  "emailEnabled": true
}
```

**Errors**:
- `401`: Not authenticated

---

## Case Management Endpoints

### GET /api/cases

List cases with filtering and pagination.

**Query Parameters**:
- `status` (string): Filter by status
- `priorityValue` (string): Filter by priority (critical, high, medium, low)
- `caseTypeId` (string): Filter by case type
- `categoryId` (string): Filter by category
- `caseOriginationId` (string): Filter by origination
- `assignedToUserId` (string): Filter by assigned user
- `lenderId` (string): Filter by lender
- `tag` (string): Filter by tag
- `slaStatus` (string): Filter by SLA status
- `search` (string): Full-text search
- `detailed` (boolean): Include full case details (default: false)
- `sortField` (enum): createdAt | customerName | status | priorityValue | updatedAt
- `sortDirection` (enum): asc | desc
- `limit` (number): Results per page (max: 100)
- `offset` (number): Pagination offset

**Request**:
```
GET /api/cases?status=open&priorityValue=high&limit=20&offset=0
```

**Response** (200):
```json
{
  "data": [
    {
      "id": "case-uuid",
      "caseNumber": "CASE-00123",
      "status": "open",
      "priorityValue": "high",
      "customerName": "John Doe",
      "lenderName": "ACME Bank",
      "categoryName": "Fraud",
      "assignedUserName": "Agent Smith",
      "createdAt": "2025-01-01T10:00:00Z",
      "updatedAt": "2025-01-01T15:00:00Z",
      "slaResponseDeadline": "2025-01-01T12:00:00Z",
      "slaResolutionDeadline": "2025-01-02T10:00:00Z"
    }
  ],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

**Auth**: Required  
**Roles**: Any authenticated user (filtered by lender restrictions)

---

### GET /api/cases/:id

Get single case with full details.

**Request**:
```
GET /api/cases/case-uuid-123
```

**Response** (200):
```json
{
  "data": {
    "id": "case-uuid-123",
    "caseNumber": "CASE-00123",
    "status": "in_progress",
    "priorityValue": "high",
    "priorityRuleId": "rule-uuid",
    "categoryId": "category-uuid",
    "categoryName": "Fraud",
    "categoryCode": "FRAUD",
    "caseTypeId": "type-uuid",
    "caseTypeName": "Complaint",
    "lenderId": "lender-uuid",
    "lenderName": "ACME Bank",
    "customerId": "customer-uuid",
    "customerName": "John Doe",
    "customerFirstName": "John",
    "customerLastName": "Doe",
    "customerEmail": "john@example.com",
    "customerPhone": "555-1234",
    "customerAddress1": "123 Main St",
    "customerAddress2": "Apt 4B",
    "customerCity": "Springfield",
    "customerState": "IL",
    "customerZipCode": "62701",
    "customerNumber": "CUST-12345",
    "accountNumber": "ACC-67890",
    "caseOriginationId": "origin-uuid",
    "caseOriginationName": "Email",
    "assignedToUserId": "user-uuid",
    "assignedUserName": "Agent Smith",
    "assignedUserEmail": "agent@example.com",
    "secondaryAssignedUserId": null,
    "hasRepresentative": false,
    "details": "Customer reports unauthorized charges on account",
    "tags": ["urgent", "fraud-investigation"],
    "slaResponseDeadline": "2025-01-01T12:00:00Z",
    "slaResolutionDeadline": "2025-01-02T10:00:00Z",
    "slaStatus": "within",
    "createdAt": "2025-01-01T10:00:00Z",
    "updatedAt": "2025-01-01T15:30:00Z",
    "resolvedAt": null,
    "closedAt": null
  }
}
```

**Errors**:
- `404`: Case not found
- `403`: No access to this lender

**Auth**: Required

---

### POST /api/cases

Create a new case.

**Request**:
```json
{
  "caseTypeId": "type-uuid",
  "categoryId": "category-uuid",
  "caseOriginationId": "origin-uuid",
  "lenderId": "lender-uuid",
  "state": "IL",
  "customerFirstName": "Jane",
  "customerLastName": "Doe",
  "customerEmail": "jane@example.com",
  "customerPhone": "555-5678",
  "customerAddress1": "456 Oak Ave",
  "customerCity": "Chicago",
  "customerZipCode": "60601",
  "accountNumber": "ACC-11111",
  "details": "Complaint about service quality",
  "hasRepresentative": false
}
```

**Response** (201):
```json
{
  "data": {
    "id": "new-case-uuid",
    "caseNumber": "CASE-00124",
    "status": "open",
    "priorityValue": "medium",
    /* ... full case object ... */
  }
}
```

**Auto-Applied**:
- Priority (via priority rules)
- Tags (via tag rules)
- SLA deadlines (via SLA policies)
- Checklist template (via assignment rules)
- Email notifications (via notification rules)

**Auth**: Required  
**Roles**: Any authenticated user

---

### PUT /api/cases/:id

Update case details.

**Request**:
```json
{
  "customerFirstName": "Jane",
  "customerLastName": "Smith",
  "customerEmail": "jane.smith@example.com",
  "customerPhone": "555-9999",
  "details": "Updated complaint details",
  "categoryId": "new-category-uuid"
}
```

**Response** (200):
```json
{
  "data": {
    "id": "case-uuid",
    /* ... updated case object ... */
  }
}
```

**Auth**: Required  
**Permissions**: Can modify, lender access

---

### PATCH /api/cases/:id/status

Update case status.

**Request**:
```json
{
  "status": "pending_customer",
  "statusNote": "Sent request for additional information"
}
```

**Response** (200):
```json
{
  "data": {
    "id": "case-uuid",
    "status": "pending_customer",
    /* ... full case object ... */
  }
}
```

**Auth**: Required

---

### PATCH /api/cases/:id/assign

Assign case to user(s).

**Request**:
```json
{
  "assignedToUserId": "primary-user-uuid",
  "secondaryAssignedUserId": "secondary-user-uuid",
  "assignmentNote": "Assigning to specialist for review"
}
```

**Response** (200):
```json
{
  "data": {
    "id": "case-uuid",
    "assignedToUserId": "primary-user-uuid",
    "secondaryAssignedUserId": "secondary-user-uuid",
    /* ... full case object ... */
  }
}
```

**Auth**: Required  
**Permissions**: Can assign

---

### POST /api/cases/:id/link

Link two cases together.

**Request**:
```json
{
  "linkedCaseId": "other-case-uuid",
  "relationshipType": "duplicate",
  "notes": "Same customer, related issue"
}
```

**Response** (201):
```json
{
  "data": {
    "id": "link-uuid",
    "caseId": "case-uuid",
    "linkedCaseId": "other-case-uuid",
    "relationshipType": "duplicate",
    "notes": "Same customer, related issue",
    "createdBy": "user-uuid",
    "createdAt": "2025-01-01T16:00:00Z"
  }
}
```

**Relationship Types**:
- duplicate
- related
- follow-up
- escalation
- merged

**Auth**: Required

---

### DELETE /api/cases/:id/link/:linkedCaseId

Unlink two cases.

**Response** (204): No content

**Auth**: Required

---

### GET /api/cases/:id/linked-cases

Get all cases linked to a specific case.

**Response** (200):
```json
{
  "data": [
    {
      "id": "link-uuid",
      "caseId": "case-uuid",
      "linkedCaseId": "other-case-uuid",
      "linkedCaseNumber": "CASE-00125",
      "relationshipType": "related",
      "notes": "Follow-up case",
      "createdBy": "user-uuid",
      "createdByName": "Agent Smith",
      "createdAt": "2025-01-01T16:00:00Z"
    }
  ]
}
```

**Auth**: Required

---

### DELETE /api/cases/:id

Delete a case.

**Response** (204): No content

**Auth**: Required  
**Permissions**: Can delete, admin role

---

## Customer Management Endpoints

### POST /api/customers/find

Find customer by multiple criteria.

**Request**:
```json
{
  "email": "john@example.com",
  "phone": "555-1234",
  "customerNumber": "CUST-12345",
  "accountNumber": "ACC-67890",
  "lenderId": "lender-uuid"
}
```

All fields are optional. Search uses OR logic (finds customer matching ANY criteria).

**Response** (200):
```json
{
  "data": [
    {
      "id": "customer-uuid",
      "firstName": "John",
      "lastName": "Doe",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "555-1234",
      "address1": "123 Main St",
      "address2": "Apt 4B",
      "city": "Springfield",
      "state": "IL",
      "zipCode": "62701",
      "customerNumber": "CUST-12345",
      "accountNumber": "ACC-67890",
      "lenderId": "lender-uuid"
    }
  ]
}
```

**Auth**: Required

---

## Email Intake Webhook

### POST /api/email-intake

Create case from incoming email (webhook endpoint).

**Purpose**: Receive emails from external systems and automatically create cases.

**Request**:
```json
{
  "from": "customer@example.com",
  "subject": "Complaint about service",
  "bodyPreview": "I am writing to complain...",
  "bodyContent": "Full email body content here...",
  "receivedDateTime": "2025-01-01T10:00:00Z",
  "attachments": [
    {
      "filename": "receipt.pdf",
      "contentType": "application/pdf",
      "content": "base64-encoded-file-content"
    }
  ]
}
```

**Response** (201):
```json
{
  "data": {
    "id": "case-uuid",
    "caseNumber": "CASE-00130",
    "status": "pending_intake",
    "emailMetadata": {
      "from": "customer@example.com",
      "subject": "Complaint about service",
      "bodyPreview": "I am writing to complain...",
      "receivedDateTime": "2025-01-01T10:00:00Z",
      "attachmentCount": 1
    }
  }
}
```

**Behavior**:
- Case created with status `pending_intake`
- Email metadata stored with case
- Attachments saved to case documents
- Agent must complete intake to finalize case

**Auth**: None (public webhook)  
**Security**: Consider implementing webhook signature validation

---

### GET /api/cases/email-intake

Get all pending intake cases.

**Response** (200):
```json
{
  "data": [
    {
      "id": "case-uuid",
      "caseNumber": "CASE-00130",
      "status": "pending_intake",
      "emailMetadata": {
        "from": "customer@example.com",
        "subject": "Complaint about service",
        "bodyPreview": "I am writing to complain...",
        "receivedDateTime": "2025-01-01T10:00:00Z",
        "attachmentCount": 1
      },
      "createdAt": "2025-01-01T10:05:00Z"
    }
  ]
}
```

**Auth**: Required

---

### POST /api/cases/:id/complete-intake

Complete intake process for email-generated case.

**Request**:
```json
{
  "customerFirstName": "John",
  "customerLastName": "Doe",
  "customerEmail": "customer@example.com",
  "customerState": "IL",
  "caseTypeId": "type-uuid",
  "categoryId": "category-uuid",
  "lenderId": "lender-uuid",
  "details": "Customer complaint about service quality"
}
```

**Response** (200):
```json
{
  "data": {
    "id": "case-uuid",
    "caseNumber": "CASE-00130",
    "status": "open",
    "priorityValue": "medium",
    /* ... fully populated case object ... */
  }
}
```

**Auth**: Required

---

## Document Management Endpoints

### POST /api/cases/:caseId/documents/upload

Upload document to case.

**Request**: Multipart form data
```
POST /api/cases/case-uuid/documents/upload
Content-Type: multipart/form-data

file: <binary file data>
```

**Response** (201):
```json
{
  "data": {
    "id": "document-uuid",
    "caseId": "case-uuid",
    "filename": "receipt.pdf",
    "fileSize": 102400,
    "mimeType": "application/pdf",
    "storagePath": "gs://bucket/.private/file.pdf",
    "uploadedBy": "user-uuid",
    "uploadedByName": "Agent Smith",
    "uploadedAt": "2025-01-01T16:00:00Z"
  }
}
```

**Limits**:
- Max file size: 10MB
- Allowed types: PDF, Word, Excel, images

**Auth**: Required

---

### GET /api/documents/:id/download

Download a document.

**Response** (200): Binary file stream

**Headers**:
- `Content-Type`: Original MIME type
- `Content-Disposition`: `attachment; filename="original-filename.pdf"`

**Auth**: Required  
**Permissions**: Access to case

---

### DELETE /api/documents/:id

Delete a document.

**Response** (204): No content

**Auth**: Required  
**Permissions**: Can delete

---

## Configuration Endpoints

All configuration endpoints require **admin** role.

### Lenders

```
GET    /api/lenders           - List all lenders
GET    /api/lenders/:id       - Get lender details
POST   /api/lenders           - Create lender
PUT    /api/lenders/:id       - Update lender
DELETE /api/lenders/:id       - Delete lender
```

### Case Types

```
GET    /api/case-types        - List case types
POST   /api/case-types        - Create case type
PUT    /api/case-types/:id    - Update case type
DELETE /api/case-types/:id    - Delete case type
```

### Categories

```
GET    /api/categories        - List categories
POST   /api/categories        - Create category
PUT    /api/categories/:id    - Update category
DELETE /api/categories/:id    - Delete category
```

### Business Rules

#### Priority Rules
```
GET    /api/priority-rules    - List priority rules
POST   /api/priority-rules    - Create priority rule
PUT    /api/priority-rules/:id - Update priority rule
DELETE /api/priority-rules/:id - Delete priority rule
```

**Example Priority Rule**:
```json
{
  "name": "High Priority Fraud",
  "priority": "high",
  "categoryId": "fraud-category-uuid",
  "conditions": {
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
  },
  "isActive": true
}
```

#### Tag Rules
```
GET    /api/tag-rules         - List tag rules
POST   /api/tag-rules         - Create tag rule
PUT    /api/tag-rules/:id     - Update tag rule
DELETE /api/tag-rules/:id     - Delete tag rule
```

#### SLA Policies
```
GET    /api/sla-policies      - List SLA policies
POST   /api/sla-policies      - Create SLA policy
PUT    /api/sla-policies/:id  - Update SLA policy
DELETE /api/sla-policies/:id  - Delete SLA policy
```

**Example SLA Policy**:
```json
{
  "name": "Critical Case SLA",
  "priority": "critical",
  "responseTimeHours": 2,
  "resolutionTimeHours": 24,
  "conditions": {
    "logic": "AND",
    "conditions": [
      {
        "field": "priorityValue",
        "operator": "equals",
        "value": "critical"
      }
    ]
  },
  "isActive": true
}
```

### Email Templates

```
GET    /api/email-templates   - List email templates
POST   /api/email-templates   - Create template
PUT    /api/email-templates/:id - Update template
DELETE /api/email-templates/:id - Delete template
```

**Example Template**:
```json
{
  "name": "New Case Acknowledgment",
  "category": "customer",
  "subject": "Case {{caseNumber}} - Received",
  "body": "Dear {{customerFirstName}},\n\nWe have received your case {{caseNumber}}.\n\nBest regards,\n{{lenderName}}"
}
```

---

## Reporting Endpoints

### GET /api/reports/case-volume

Case volume analytics.

**Query Parameters**:
- `startDate` (string): ISO date
- `endDate` (string): ISO date
- `lenderId` (string): Filter by lender
- `categoryId` (string): Filter by category

**Response** (200):
```json
{
  "data": {
    "totalCases": 1250,
    "byStatus": {
      "open": 45,
      "in_progress": 120,
      "resolved": 1085
    },
    "byPriority": {
      "critical": 15,
      "high": 250,
      "medium": 700,
      "low": 285
    },
    "byCategory": [
      {
        "categoryName": "Fraud",
        "count": 340
      },
      {
        "categoryName": "Billing",
        "count": 425
      }
    ],
    "trend": [
      {
        "date": "2025-01-01",
        "count": 42
      },
      {
        "date": "2025-01-02",
        "count": 38
      }
    ]
  }
}
```

**Auth**: Required  
**Roles**: compliance, admin

---

### GET /api/reports/agent-performance

Agent performance metrics.

**Query Parameters**:
- `startDate` (string): ISO date
- `endDate` (string): ISO date

**Response** (200):
```json
{
  "data": [
    {
      "agentId": "user-uuid",
      "agentName": "Agent Smith",
      "casesHandled": 85,
      "casesResolved": 78,
      "averageResolutionTime": 36.5,
      "slaCompliance": 92.3,
      "casesOverdue": 2
    }
  ]
}
```

**Auth**: Required  
**Roles**: compliance, admin

---

### GET /api/reports/sla-compliance

SLA compliance analysis.

**Response** (200):
```json
{
  "data": {
    "overall": {
      "totalCases": 1000,
      "metResponse": 920,
      "metResolution": 880,
      "responseCompliance": 92.0,
      "resolutionCompliance": 88.0
    },
    "byPriority": [
      {
        "priority": "critical",
        "totalCases": 50,
        "metResponse": 48,
        "metResolution": 45,
        "responseCompliance": 96.0,
        "resolutionCompliance": 90.0
      }
    ]
  }
}
```

**Auth**: Required  
**Roles**: compliance, admin

---

## Export Endpoints

### GET /api/exports/cases

Export cases to Excel.

**Query Parameters**:
- `startDate` (string): Filter from date
- `endDate` (string): Filter to date
- `status` (string): Filter by status
- `priority` (string): Filter by priority
- `lenderId` (string): Filter by lender

**Response** (200): Excel file download

**Headers**:
- `Content-Type`: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- `Content-Disposition`: `attachment; filename="cases-export-2025-01-01.xlsx"`

**Auth**: Required  
**Roles**: compliance, admin

---

## Webhook Integration

### Setting Up Webhooks

For external systems to send data to the platform:

**Email Intake Webhook**:
```
POST https://your-domain.replit.app/api/email-intake
```

**Webhook Security Best Practices**:
1. Use HTTPS only
2. Implement signature verification
3. Validate payload schema
4. Rate limit requests
5. Log all webhook attempts

**Example Integration** (Email Provider):

Configure your email provider to forward to:
```
URL: https://your-domain.replit.app/api/email-intake
Method: POST
Content-Type: application/json
```

Map email fields to API format:
```javascript
{
  "from": email.from,
  "subject": email.subject,
  "bodyPreview": email.body.substring(0, 200),
  "bodyContent": email.body,
  "receivedDateTime": email.date,
  "attachments": email.attachments.map(att => ({
    "filename": att.name,
    "contentType": att.type,
    "content": att.base64Content
  }))
}
```

---

## External System Integration Patterns

### Pattern 1: Case Creation API

External system creates cases directly:

```javascript
// 1. Find or create customer
const customerResponse = await fetch('https://api.example.com/api/customers/find', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Cookie': sessionCookie
  },
  body: JSON.stringify({
    email: 'customer@example.com',
    accountNumber: 'ACC-12345',
    lenderId: 'lender-uuid'
  })
});

const customers = await customerResponse.json();
const customer = customers.data[0];

// 2. Create case
const caseResponse = await fetch('https://api.example.com/api/cases', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Cookie': sessionCookie
  },
  body: JSON.stringify({
    caseTypeId: 'complaint-type-uuid',
    categoryId: 'billing-category-uuid',
    caseOriginationId: 'api-origin-uuid',
    lenderId: 'lender-uuid',
    state: customer.state || 'IL',
    customerFirstName: customer.firstName,
    customerLastName: customer.lastName,
    customerEmail: customer.email,
    accountNumber: customer.accountNumber,
    details: 'Complaint from external system'
  })
});

const newCase = await caseResponse.json();
console.log('Created case:', newCase.data.caseNumber);
```

### Pattern 2: Email Intake Webhook

Email provider forwards to webhook:

```javascript
// Email provider configuration
const emailForwarder = {
  webhookUrl: 'https://api.example.com/api/email-intake',
  onEmailReceived: async (email) => {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: email.sender,
        subject: email.subject,
        bodyPreview: email.text.substring(0, 200),
        bodyContent: email.text,
        receivedDateTime: email.date.toISOString(),
        attachments: email.attachments.map(att => ({
          filename: att.filename,
          contentType: att.contentType,
          content: att.content.toString('base64')
        }))
      })
    });
    
    const result = await response.json();
    console.log('Case created from email:', result.data.caseNumber);
  }
};
```

### Pattern 3: Customer Lookup Before Creation

Prevent duplicate customer records:

```javascript
async function findOrCreateCustomer(customerData, lenderId) {
  // Search by multiple criteria
  const searchResponse = await fetch('https://api.example.com/api/customers/find', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': sessionCookie
    },
    body: JSON.stringify({
      email: customerData.email,
      phone: customerData.phone,
      customerNumber: customerData.customerNumber,
      accountNumber: customerData.accountNumber,
      lenderId: lenderId
    })
  });
  
  const customers = await searchResponse.json();
  
  if (customers.data.length > 0) {
    // Customer exists, use existing
    return customers.data[0];
  } else {
    // Customer doesn't exist, create new
    // (happens implicitly during case creation)
    return customerData;
  }
}
```

---

## Best Practices

### Authentication
- Store session cookies securely
- Implement auto-refresh for long-running processes
- Handle 401 errors with re-authentication

### Error Handling
- Check HTTP status codes
- Parse error details for user feedback
- Implement retry logic with exponential backoff
- Log all API errors for debugging

### Performance
- Use pagination for large datasets
- Cache reference data (lenders, categories, etc.)
- Batch operations where possible
- Use detailed=false for list views

### Data Integrity
- Validate input before sending
- Use customer lookup to prevent duplicates
- Include comprehensive error handling
- Test with sample data first

### Security
- Always use HTTPS
- Never log sensitive data
- Implement request signing for webhooks
- Rotate API credentials regularly

---

## Support

For API-related questions:
- Review this documentation
- Check error logs for details
- Test in development environment first
- Contact system administrator for access issues

## Changelog

**Version 1.0** (2025-01-01):
- Initial API release
- Session-based authentication
- Complete case management endpoints
- Email intake webhook
- Reporting and export functionality
