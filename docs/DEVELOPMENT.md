# Development Guide

Developer documentation for contributing to the Complaint & Dispute Management Platform.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Environment](#development-environment)
- [Project Structure](#project-structure)
- [Code Organization](#code-organization)
- [Development Workflow](#development-workflow)
- [Database Management](#database-management)
- [Testing Guidelines](#testing-guidelines)
- [Code Style and Standards](#code-style-and-standards)
- [Git Workflow](#git-workflow)
- [Debugging](#debugging)
- [Common Tasks](#common-tasks)
- [Contributing](#contributing)

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- Git
- Code editor (VS Code recommended)

### Initial Setup

1. **Clone Repository**:
   ```bash
   git clone <repository-url>
   cd complaint-dispute-platform
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Initialize Database**:
   ```bash
   npm run db:push
   ```

5. **Start Development Server**:
   ```bash
   npm run dev
   ```

6. **Access Application**:
   - Frontend: `http://localhost:5000`
   - API: `http://localhost:5000/api`

## Development Environment

### Recommended VS Code Extensions

- **ESLint**: Linting JavaScript/TypeScript
- **Prettier**: Code formatting
- **Tailwind CSS IntelliSense**: Tailwind class autocomplete
- **PostgreSQL**: Database management
- **GitLens**: Enhanced Git integration

### Environment Variables

Create `.env` file with:

```bash
# Database
DATABASE_URL=postgresql://localhost:5432/complaints_dev

# Session
SESSION_SECRET=dev-secret-change-in-production

# Replit OAuth (for Replit deployment)
REPLIT_DOMAINS=localhost:5000
REPL_ID=dev

# Object Storage
PUBLIC_OBJECT_SEARCH_PATHS=gs://dev-bucket/public
PRIVATE_OBJECT_DIR=gs://dev-bucket/.private

# Microsoft SSO (Optional)
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
MICROSOFT_TENANT_ID=
MICROSOFT_REDIRECT_URI=http://localhost:5000/api/auth/microsoft/callback

# Development Mode
NODE_ENV=development
```

## Project Structure

```
.
├── client/                      # React frontend
│   ├── src/
│   │   ├── components/          # Reusable UI components
│   │   │   ├── ui/             # shadcn/ui components
│   │   │   ├── AdminConfigPanel.tsx
│   │   │   ├── CaseDetailView.tsx
│   │   │   ├── RuleBuilder.tsx
│   │   │   └── ...
│   │   ├── pages/              # Route-level page components
│   │   │   ├── Dashboard.tsx
│   │   │   ├── CaseList.tsx
│   │   │   ├── AdminPanel.tsx
│   │   │   └── ...
│   │   ├── lib/                # Utilities and helpers
│   │   │   ├── queryClient.ts  # TanStack Query setup
│   │   │   └── utils.ts
│   │   ├── hooks/              # Custom React hooks
│   │   │   ├── use-toast.ts
│   │   │   └── use-auth.ts
│   │   ├── App.tsx             # Main app component with routing
│   │   └── index.css           # Global styles and Tailwind
│   └── index.html              # HTML entry point
│
├── server/                      # Express backend
│   ├── routes.ts               # API route definitions
│   ├── storage.ts              # Database abstraction layer
│   ├── auth.ts                 # Local authentication
│   ├── microsoftSSO.ts         # Microsoft SSO integration
│   ├── replitAuth.ts           # Replit OAuth integration
│   ├── rule-engine.ts          # Business rules evaluation
│   ├── objectStorage.ts        # File storage service
│   ├── vite.ts                 # Vite integration
│   └── index.ts                # Server entry point
│
├── shared/                      # Shared code (frontend + backend)
│   └── schema.ts               # Drizzle database schema + types
│
├── docs/                        # Documentation
│   ├── README.md
│   ├── SETUP.md
│   ├── USER_GUIDE.md
│   ├── ADMIN_GUIDE.md
│   ├── API.md
│   ├── ARCHITECTURE.md
│   └── DEVELOPMENT.md
│
├── vite.config.ts              # Vite configuration
├── tailwind.config.ts          # Tailwind CSS configuration
├── tsconfig.json               # TypeScript configuration
├── drizzle.config.ts           # Drizzle ORM configuration
└── package.json                # Dependencies and scripts
```

### Key Files

**Frontend Entry Points**:
- `client/index.html` - HTML template
- `client/src/main.tsx` - React app bootstrap
- `client/src/App.tsx` - Route configuration

**Backend Entry Points**:
- `server/index.ts` - Express server setup
- `server/routes.ts` - API endpoints
- `server/storage.ts` - Data layer

**Shared**:
- `shared/schema.ts` - Database schema and types

## Code Organization

### Frontend Architecture

**Component Structure**:
```typescript
// Presentational Component
export function MyComponent({ prop1, prop2 }: MyComponentProps) {
  return (
    <div>
      {/* Component markup */}
    </div>
  );
}

// Container Component (with data fetching)
export function MyDataComponent() {
  const { data, isLoading } = useQuery({
    queryKey: ['/api/resource']
  });

  if (isLoading) return <div>Loading...</div>;

  return <MyComponent data={data} />;
}
```

**State Management**:
- Use TanStack Query for server state
- Use React Hook Form for form state
- Use useState/useContext for local UI state

**Routing**:
```typescript
// App.tsx
import { Route, Switch } from "wouter";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/cases" component={CaseList} />
      <Route path="/cases/:id" component={CaseDetail} />
      <Route component={NotFound} />
    </Switch>
  );
}
```

### Backend Architecture

**Route Handler Pattern**:
```typescript
app.get("/api/resource/:id", requireAuth, async (req, res) => {
  try {
    // 1. Validate input
    const schema = z.object({
      id: z.string()
    });
    const { id } = schema.parse(req.params);

    // 2. Check authorization
    if (!canAccess(req.user, id)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    // 3. Execute business logic
    const resource = await storage.getResource(id);

    // 4. Return response
    res.json({ data: resource });
  } catch (error) {
    // 5. Handle errors
    console.error("Failed to fetch resource:", error);
    res.status(500).json({ error: "Failed to fetch resource" });
  }
});
```

**Storage Layer Pattern**:
```typescript
class PgStorage implements IStorage {
  async getResource(id: string): Promise<Resource | null> {
    const [resource] = await db
      .select()
      .from(resources)
      .where(eq(resources.id, id))
      .limit(1);
    
    return resource || null;
  }

  async createResource(data: InsertResource): Promise<Resource> {
    const [resource] = await db
      .insert(resources)
      .values(data)
      .returning();
    
    return resource;
  }
}
```

## Development Workflow

### Starting Development

```bash
# Start dev server (hot reload enabled)
npm run dev

# In separate terminal, watch for TypeScript errors
npm run type-check -- --watch
```

### Making Changes

1. **Create Feature Branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Code Changes**

3. **Test Changes**:
   - Manual testing in browser
   - Check console for errors
   - Verify database changes

4. **Commit Changes**:
   ```bash
   git add .
   git commit -m "Add feature: description"
   ```

5. **Push and Create PR**:
   ```bash
   git push origin feature/your-feature-name
   ```

## Database Management

### Schema Changes

**IMPORTANT**: Never manually write SQL migrations. Use Drizzle's schema push.

**Making Schema Changes**:

1. **Edit Schema** in `shared/schema.ts`:
   ```typescript
   export const myTable = pgTable("my_table", {
     id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
     name: text("name").notNull(),
     createdAt: timestamp("created_at").defaultNow()
   });
   ```

2. **Push to Database**:
   ```bash
   npm run db:push
   ```

3. **If Conflicts**:
   ```bash
   npm run db:push --force
   ```

### Database Safety Rules

**CRITICAL**: Never change primary key ID column types
- If it's `serial`, keep it `serial`
- If it's `varchar` with UUID, keep it `varchar`
- Changing ID types generates destructive migrations

**Best Practices**:
- Check existing schema before changes
- Match Drizzle schema to existing structure
- Use `db:push --force` only when necessary
- Backup database before major changes

### Querying Database

**Using Drizzle ORM**:
```typescript
import { db } from "./db";
import { cases, users } from "@shared/schema";
import { eq, and } from "drizzle-orm";

// Simple select
const allCases = await db.select().from(cases);

// With where clause
const openCases = await db
  .select()
  .from(cases)
  .where(eq(cases.status, "open"));

// With joins
const casesWithUsers = await db
  .select({
    case: cases,
    user: users
  })
  .from(cases)
  .leftJoin(users, eq(cases.assignedToUserId, users.id));
```

### Database Inspection

```bash
# Connect to database
psql $DATABASE_URL

# List tables
\dt

# Describe table
\d table_name

# Run query
SELECT * FROM cases LIMIT 10;
```

## Testing Guidelines

### Manual Testing Checklist

Before committing:
- [ ] Feature works as expected
- [ ] No console errors
- [ ] Mobile responsive (check at 768px and 1024px)
- [ ] All form validations work
- [ ] Error states display correctly
- [ ] Loading states display correctly

### Testing Business Rules

Use the admin rule tester:
1. Navigate to Admin → Business Rules → Rule Tester
2. Enter test case data
3. See which rules match
4. Verify expected rules apply

### Testing Email Notifications

1. Configure test email credentials
2. Create test case that matches rule
3. Check email sent successfully
4. Verify template variables replaced correctly

### Testing File Uploads

1. Test various file types (PDF, Word, Excel, images)
2. Test file size limits
3. Test access permissions
4. Verify files download correctly

## Code Style and Standards

### TypeScript

**Use Type Safety**:
```typescript
// Good
interface User {
  id: string;
  name: string;
  role: "agent" | "compliance" | "admin";
}

function getUser(id: string): Promise<User | null> {
  // ...
}

// Bad
function getUser(id: any): Promise<any> {
  // ...
}
```

**Prefer Interfaces for Objects**:
```typescript
// Good
interface CaseData {
  caseNumber: string;
  status: string;
}

// Also good
type CaseStatus = "open" | "in_progress" | "resolved";

// Bad
type CaseData = { caseNumber: string; status: string };
```

### React Components

**Use Functional Components**:
```typescript
// Good
export function MyComponent({ prop }: MyComponentProps) {
  return <div>{prop}</div>;
}

// Bad
export class MyComponent extends React.Component { ... }
```

**Extract Complex Logic to Hooks**:
```typescript
function useCaseData(caseId: string) {
  const { data, isLoading } = useQuery({
    queryKey: ['/api/cases', caseId]
  });

  return { case: data, isLoading };
}

function CaseDetail({ caseId }: Props) {
  const { case: caseData, isLoading } = useCaseData(caseId);
  // ...
}
```

### CSS/Styling

**Use Tailwind Utilities**:
```tsx
// Good
<div className="flex items-center gap-4 p-6">

// Avoid
<div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.5rem' }}>
```

**Use shadcn Components**:
```tsx
// Good
import { Button } from "@/components/ui/button";
<Button variant="primary">Click Me</Button>

// Avoid
<button className="bg-blue-500 px-4 py-2 rounded">Click Me</button>
```

### Naming Conventions

**Components**: PascalCase
```typescript
export function CaseDetailView() { }
export function AdminPanel() { }
```

**Functions**: camelCase
```typescript
function getUserById(id: string) { }
function calculateSlaDeadline() { }
```

**Constants**: UPPER_SNAKE_CASE
```typescript
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const DEFAULT_PAGE_SIZE = 20;
```

**Files**:
- Components: PascalCase (`CaseList.tsx`)
- Utilities: kebab-case (`date-utils.ts`)
- Pages: PascalCase (`Dashboard.tsx`)

## Git Workflow

### Branch Naming

- `feature/description` - New features
- `fix/description` - Bug fixes
- `refactor/description` - Code refactoring
- `docs/description` - Documentation changes

### Commit Messages

Follow conventional commits:

```
type(scope): description

[optional body]

[optional footer]
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code refactoring
- `docs`: Documentation
- `style`: Formatting
- `test`: Tests
- `chore`: Maintenance

**Examples**:
```
feat(cases): add case linking functionality
fix(auth): resolve session expiration issue
refactor(storage): extract common query logic
docs(api): add endpoint documentation
```

### Pull Request Process

1. Create feature branch
2. Make changes and commit
3. Push to remote
4. Create pull request with:
   - Clear title and description
   - Link to issue (if applicable)
   - Screenshots (for UI changes)
   - Testing instructions
5. Address review comments
6. Merge when approved

## Debugging

### Frontend Debugging

**React DevTools**:
- Install React DevTools browser extension
- Inspect component tree
- View props and state
- Track re-renders

**TanStack Query DevTools**:
- Already included in dev mode
- View query cache
- See query state
- Debug stale/refetch behavior

**Console Logging**:
```typescript
// Conditional logging
if (import.meta.env.DEV) {
  console.log('Debug data:', data);
}
```

### Backend Debugging

**Console Logging**:
```typescript
console.log('Request received:', req.method, req.path);
console.error('Error occurred:', error);
```

**Database Query Debugging**:
```typescript
// Add .toSQL() to see generated SQL
const query = db.select().from(cases).where(eq(cases.id, id));
console.log(query.toSQL());
```

**Network Tab**:
- Open browser DevTools → Network
- Filter by "Fetch/XHR"
- Inspect request/response
- Check status codes

### Common Issues

**Database Connection Error**:
```bash
# Check DATABASE_URL is correct
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT 1;"
```

**Session Issues**:
```bash
# Clear session table
psql $DATABASE_URL -c "DELETE FROM sessions;"

# Check session store
psql $DATABASE_URL -c "SELECT * FROM sessions LIMIT 5;"
```

**Build Errors**:
```bash
# Clear node_modules and reinstall
rm -rf node_modules
npm install

# Clear Vite cache
rm -rf node_modules/.vite
```

## Common Tasks

### Adding a New Page

1. **Create Page Component** in `client/src/pages/`:
   ```typescript
   // NewPage.tsx
   export default function NewPage() {
     return <div>New Page</div>;
   }
   ```

2. **Add Route** in `client/src/App.tsx`:
   ```typescript
   <Route path="/new-page" component={NewPage} />
   ```

3. **Add Navigation** (if needed):
   ```tsx
   <Link to="/new-page">New Page</Link>
   ```

### Adding a New API Endpoint

1. **Define Route** in `server/routes.ts`:
   ```typescript
   app.get("/api/resource", requireAuth, async (req, res) => {
     try {
       const data = await storage.getResource();
       res.json({ data });
     } catch (error) {
       res.status(500).json({ error: "Failed to fetch" });
     }
   });
   ```

2. **Add Storage Method** in `server/storage.ts`:
   ```typescript
   async getResource(): Promise<Resource[]> {
     return await db.select().from(resources);
   }
   ```

3. **Update Frontend** to use endpoint:
   ```typescript
   const { data } = useQuery({
     queryKey: ['/api/resource']
   });
   ```

### Adding a Database Table

1. **Define Table** in `shared/schema.ts`:
   ```typescript
   export const myTable = pgTable("my_table", {
     id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
     name: text("name").notNull(),
     createdAt: timestamp("created_at").defaultNow()
   });

   // Insert schema
   export const insertMyTableSchema = createInsertSchema(myTable).omit({
     id: true,
     createdAt: true
   });

   // Types
   export type MyTable = typeof myTable.$inferSelect;
   export type InsertMyTable = z.infer<typeof insertMyTableSchema>;
   ```

2. **Push Schema**:
   ```bash
   npm run db:push
   ```

3. **Add Storage Methods**:
   ```typescript
   async getMyTable(id: string): Promise<MyTable | null> { }
   async createMyTable(data: InsertMyTable): Promise<MyTable> { }
   ```

### Adding a Business Rule Type

1. **Define Table** in `shared/schema.ts`
2. **Create Admin UI** component
3. **Add API Endpoints** in `server/routes.ts`
4. **Add Rule Evaluation** in `server/rule-engine.ts`
5. **Apply Rules** on case create/update

## Contributing

### Contribution Guidelines

1. **Check Existing Issues**:
   - Search for related issues
   - Comment if you plan to work on it

2. **Create Issue** (for new features):
   - Clear description
   - Use cases
   - Proposed approach

3. **Follow Code Standards**:
   - TypeScript strict mode
   - Zod validation
   - Proper error handling
   - Add data-testid attributes

4. **Test Thoroughly**:
   - Manual testing
   - Edge cases
   - Error scenarios

5. **Document Changes**:
   - Update relevant docs
   - Add inline comments for complex logic
   - Update API docs if changing endpoints

### Code Review Checklist

**Reviewer**:
- [ ] Code follows style guide
- [ ] No console errors
- [ ] Types are properly defined
- [ ] Error handling is appropriate
- [ ] Security concerns addressed
- [ ] Performance considerations
- [ ] Documentation updated

**Author**:
- [ ] Self-reviewed code
- [ ] Tested locally
- [ ] No debug code left
- [ ] Commits are meaningful
- [ ] PR description is clear

### Getting Help

- Check existing documentation
- Search codebase for examples
- Ask in team chat/slack
- Create issue for bugs
- Propose enhancements via issues

## Resources

### Documentation
- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Drizzle ORM Docs](https://orm.drizzle.team)
- [TanStack Query Docs](https://tanstack.com/query/latest)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)

### Tools
- [Replit Docs](https://docs.replit.com)
- [shadcn/ui Components](https://ui.shadcn.com)
- [Zod Documentation](https://zod.dev)
- [Wouter Routing](https://github.com/molefrog/wouter)

## License

Copyright © 2025. All rights reserved.
