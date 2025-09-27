import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { 
  insertCaseSchema, 
  insertCustomerSchema,
  type Case,
  type Customer 
} from "@shared/schema";
import { z } from "zod";
import multer from "multer";

// Simple authentication middleware that also populates req.dbUser
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  // Populate req.dbUser for backward compatibility with existing route handlers
  req.dbUser = req.user;
  next();
};

// Role hierarchy: admin > compliance > agent
const roleHierarchy = {
  'admin': 3,
  'compliance': 2,
  'agent': 1
};

// Role-based authorization middleware with proper hierarchy (admin can access agent-level endpoints)
const requireRole = (roles: string | string[]) => (req: any, res: any, next: any) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  const roleArray = Array.isArray(roles) ? roles : [roles];
  const userRoleLevel = roleHierarchy[req.user.role as keyof typeof roleHierarchy] || 0;
  
  // Check if user's role level meets or exceeds any of the required roles
  const hasPermission = roleArray.some(requiredRole => {
    const requiredLevel = roleHierarchy[requiredRole as keyof typeof roleHierarchy] || 0;
    return userRoleLevel >= requiredLevel;
  });
  
  if (!hasPermission) {
    return res.status(403).json({ message: "Forbidden" });
  }
  
  // Populate req.dbUser for backward compatibility with existing route handlers
  req.dbUser = req.user;
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Setup multer for file uploads
  const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
  });
  
  // Setup authentication (sets up /api/register, /api/login, /api/logout, /api/user)
  setupAuth(app);
  
  // Case Management API Endpoints
  
  // GET /api/cases - List cases with filtering and pagination
  app.get("/api/cases", requireAuth, async (req, res) => {
    try {
      const querySchema = z.object({
        status: z.string().optional(),
        priorityValue: z.string().optional(),
        priorityRuleId: z.string().optional(), 
        caseTypeId: z.string().optional(),
        categoryId: z.string().optional(),
        customerId: z.string().optional(),
        limit: z.coerce.number().min(1).max(100).default(20),
        offset: z.coerce.number().min(0).default(0)
      });

      const filters = querySchema.parse(req.query);
      const cases = await storage.getCases(filters);
      
      res.json({
        data: cases,
        pagination: {
          limit: filters.limit,
          offset: filters.offset,
          hasMore: cases.length === filters.limit
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid query parameters", details: error.errors });
      }
      console.error("Failed to fetch cases:", error);
      res.status(500).json({ error: "Failed to fetch cases" });
    }
  });

  // GET /api/cases/:id - Get single case by ID with detailed information
  app.get("/api/cases/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const caseRecord = await storage.getCaseWithDetails(id);
      
      if (!caseRecord) {
        return res.status(404).json({ error: "Case not found" });
      }
      
      res.json({ data: caseRecord });
    } catch (error) {
      console.error("Failed to fetch case:", error);
      res.status(500).json({ error: "Failed to fetch case" });
    }
  });

  // PATCH /api/cases/:id/status - Update case status
  app.patch("/api/cases/:id/status", requireAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      if (!status || !["open", "in_progress", "resolved"].includes(status)) {
        return res.status(400).json({ error: "Invalid status. Must be one of: open, in_progress, resolved" });
      }

      const updatedCase = await storage.updateCaseStatus(id, status, userId);
      res.json({ data: updatedCase });
    } catch (error) {
      console.error("Failed to update case status:", error);
      if (error instanceof Error && error.message === "Case not found") {
        return res.status(404).json({ error: "Case not found" });
      }
      res.status(500).json({ error: "Failed to update case status" });
    }
  });

  // PATCH /api/cases/:id/assign - Assign case to user (agents and above)
  app.patch("/api/cases/:id/assign", requireRole(['agent', 'compliance', 'admin']), async (req: any, res) => {
    try {
      const { id } = req.params;
      const { assignedToUserId } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      // Validate assignedToUserId if provided (can be null to unassign)
      if (assignedToUserId !== null && typeof assignedToUserId !== 'string') {
        return res.status(400).json({ error: "Invalid assignedToUserId. Must be a string or null." });
      }

      const updatedCase = await storage.assignCase(id, assignedToUserId, userId);
      res.json({ data: updatedCase });
    } catch (error) {
      console.error("Failed to assign case:", error);
      if (error instanceof Error && error.message === "Case not found") {
        return res.status(404).json({ error: "Case not found" });
      }
      res.status(500).json({ error: "Failed to assign case" });
    }
  });

  // GET /api/assignees - Get available users for case assignment
  app.get("/api/assignees", requireRole(['agent', 'compliance', 'admin']), async (req: any, res) => {
    try {
      const assignees = await storage.getAvailableAssignees();
      res.json({ data: assignees });
    } catch (error) {
      console.error("Failed to get assignees:", error);
      res.status(500).json({ error: "Failed to get assignees" });
    }
  });

  // POST /api/cases/create-intake - Simplified case creation from intake form (agents and above)
  app.post("/api/cases/create-intake", requireRole(['agent', 'admin']), async (req: any, res) => {
    try {
      // Define intake schema
      const intakeSchema = z.object({
        caseTypeId: z.string().min(1, "Case type is required"),
        categoryId: z.string().min(1, "Category is required"),
        customerName: z.string().min(1, "Customer name is required"),
        customerState: z.string().min(2, "State is required"),
        loanId: z.string().optional(),
        details: z.string().min(10, "Details must be at least 10 characters"),
      });

      const intakeData = intakeSchema.parse(req.body);
      
      // Step 1: Find or create customer
      let customer;
      const existingCustomers = await storage.findCustomerByName(intakeData.customerName);
      const matchingCustomer = existingCustomers.find(c => 
        c.name === intakeData.customerName && c.state === intakeData.customerState
      );
      
      if (matchingCustomer) {
        customer = matchingCustomer;
      } else {
        customer = await storage.createCustomer({
          name: intakeData.customerName,
          state: intakeData.customerState,
        });
      }
      
      // Step 2: Find appropriate priority rule for the category
      const priorityRules = await storage.getPriorityRules(intakeData.categoryId);
      let selectedPriorityRule = priorityRules.find(rule => 
        rule.ruleJson && typeof rule.ruleJson === 'object' && 
        'default' in rule.ruleJson && rule.ruleJson.default === true
      );
      
      // If no default rule found, use the first available rule
      if (!selectedPriorityRule && priorityRules.length > 0) {
        selectedPriorityRule = priorityRules[0];
      }
      
      // If still no rule found, create a default medium priority rule
      if (!selectedPriorityRule) {
        selectedPriorityRule = await storage.createPriorityRule({
          categoryId: intakeData.categoryId,
          name: "Default Priority",
          description: "Auto-generated default priority rule",
          priority: "medium",
          conditions: "default",
          ruleJson: { conditions: [], default: true },
          priorityValue: "Medium",
          isActive: true,
        });
      }
      
      // Step 3: Create the case
      const caseData = {
        caseTypeId: intakeData.caseTypeId,
        categoryId: intakeData.categoryId,
        priorityRuleId: selectedPriorityRule.id,
        customerId: customer.id,
        loanId: intakeData.loanId || null,
        state: intakeData.customerState,
        details: intakeData.details,
        status: "open" as const,
        configVersion: 1,
      };
      
      const newCase = await storage.createCase(caseData);
      
      // Create audit log for case creation
      await storage.createAuditLog({
        caseId: newCase.id,
        actorUserId: req.dbUser.id,
        action: "case_created",
        details: { 
          caseId: newCase.id, 
          initialStatus: newCase.status,
          customerName: intakeData.customerName,
          customerState: intakeData.customerState,
          priority: selectedPriorityRule.priorityValue
        }
      });
      
      res.status(201).json({ data: newCase });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid intake data", details: error.errors });
      }
      console.error("Failed to create case from intake:", error);
      res.status(500).json({ error: "Failed to create case from intake" });
    }
  });

  // POST /api/cases - Create new case (agents and above)
  app.post("/api/cases", requireRole(['agent', 'admin']), async (req: any, res) => {
    try {
      const caseData = insertCaseSchema.parse(req.body);
      const newCase = await storage.createCase(caseData);
      
      // Create audit log for case creation
      await storage.createAuditLog({
        caseId: newCase.id,
        actorUserId: req.dbUser.id,
        action: "case_created",
        details: { caseId: newCase.id, initialStatus: newCase.status }
      });
      
      res.status(201).json({ data: newCase });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid case data", details: error.errors });
      }
      console.error("Failed to create case:", error);
      res.status(500).json({ error: "Failed to create case" });
    }
  });

  // PUT /api/cases/:id - Update existing case (agents and above)
  app.put("/api/cases/:id", requireRole(['agent', 'admin']), async (req: any, res) => {
    try {
      const { id } = req.params;
      const updates = insertCaseSchema.partial().parse(req.body);
      
      // Check if case exists
      const existingCase = await storage.getCase(id);
      if (!existingCase) {
        return res.status(404).json({ error: "Case not found" });
      }
      
      const updatedCase = await storage.updateCase(id, updates);
      
      // Create audit log for case update
      await storage.createAuditLog({
        caseId: id,
        actorUserId: req.dbUser.id,
        action: "case_updated", 
        details: { updates, previousStatus: existingCase.status, newStatus: updatedCase.status }
      });
      
      res.json({ data: updatedCase });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid update data", details: error.errors });
      }
      console.error("Failed to update case:", error);
      res.status(500).json({ error: "Failed to update case" });
    }
  });

  // Customer Management API Endpoints
  
  // GET /api/customers - List customers
  app.get("/api/customers", requireAuth, async (req, res) => {
    try {
      const querySchema = z.object({
        name: z.string().optional(),
        limit: z.coerce.number().min(1).max(100).default(20),
        offset: z.coerce.number().min(0).default(0)
      });

      const { name, limit, offset } = querySchema.parse(req.query);
      
      let customers: Customer[];
      if (name) {
        customers = await storage.findCustomerByName(name);
        // Apply pagination to search results
        customers = customers.slice(offset, offset + limit);
      } else {
        customers = await storage.getCustomers({ limit, offset });
      }
      
      res.json({
        data: customers,
        pagination: {
          limit,
          offset,
          hasMore: customers.length === limit
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid query parameters", details: error.errors });
      }
      console.error("Failed to fetch customers:", error);
      res.status(500).json({ error: "Failed to fetch customers" });
    }
  });

  // GET /api/customers/:id - Get single customer by ID
  app.get("/api/customers/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const customer = await storage.getCustomer(id);
      
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }
      
      res.json({ data: customer });
    } catch (error) {
      console.error("Failed to fetch customer:", error);
      res.status(500).json({ error: "Failed to fetch customer" });
    }
  });

  // POST /api/customers - Create new customer (agents and above)
  app.post("/api/customers", requireRole(['agent', 'admin']), async (req, res) => {
    try {
      const customerData = insertCustomerSchema.parse(req.body);
      const newCustomer = await storage.createCustomer(customerData);
      
      res.status(201).json({ data: newCustomer });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid customer data", details: error.errors });
      }
      console.error("Failed to create customer:", error);
      res.status(500).json({ error: "Failed to create customer" });
    }
  });

  // Configuration API Endpoints (Read-only for now)
  
  // GET /api/dashboard - Dashboard statistics
  app.get("/api/dashboard", requireAuth, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json({ data: stats });
    } catch (error) {
      console.error("Failed to fetch dashboard stats:", error);
      res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
  });

  // GET /api/case-types - List case types  
  app.get("/api/case-types", requireAuth, async (req, res) => {
    try {
      const caseTypes = await storage.getCaseTypes();
      res.json({ data: caseTypes });
    } catch (error) {
      console.error("Failed to fetch case types:", error);
      res.status(500).json({ error: "Failed to fetch case types" });
    }
  });

  // GET /api/categories - List categories (optionally filtered by case type)
  app.get("/api/categories", requireAuth, async (req, res) => {
    try {
      const querySchema = z.object({
        caseTypeId: z.string().optional()
      });
      
      const { caseTypeId } = querySchema.parse(req.query);
      const categories = await storage.getCategories(caseTypeId);
      res.json({ data: categories });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid query parameters", details: error.errors });
      }
      console.error("Failed to fetch categories:", error);
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  // GET /api/categories/:categoryId/priority-rules - Get priority rules for category  
  app.get("/api/categories/:categoryId/priority-rules", requireRole('compliance'), async (req, res) => {
    try {
      const { categoryId } = req.params;
      const priorityRules = await storage.getPriorityRules(categoryId);
      res.json({ data: priorityRules });
    } catch (error) {
      console.error("Failed to fetch priority rules:", error);
      res.status(500).json({ error: "Failed to fetch priority rules" });
    }
  });

  // Admin Configuration APIs (Create, Update, Delete)
  
  // Case Types Admin Management  
  app.post("/api/case-types", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { name, description, color, active } = req.body;
      const caseType = await storage.createCaseType({
        name,
        description,
        color,
        isActive: active,
      });
      res.status(201).json(caseType);
    } catch (error) {
      console.error("Error creating case type:", error);
      res.status(500).json({ message: "Failed to create case type" });
    }
  });

  app.put("/api/case-types/:id", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, color, active } = req.body;
      const caseType = await storage.updateCaseType(id, {
        name,
        description,
        color,
        isActive: active,
      });
      res.json(caseType);
    } catch (error) {
      console.error("Error updating case type:", error);
      res.status(500).json({ message: "Failed to update case type" });
    }
  });

  app.delete("/api/case-types/:id", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteCaseType(id);
      res.json({ message: "Case type deleted successfully" });
    } catch (error) {
      console.error("Error deleting case type:", error);
      res.status(500).json({ message: "Failed to delete case type" });
    }
  });

  // Categories Admin Management
  app.post("/api/categories", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { name, description, caseTypeId, active } = req.body;
      const category = await storage.createCategory({
        name,
        description,
        caseTypeId,
        code: name.toUpperCase().replace(/\s+/g, '_'),
        isActive: active,
      });
      res.status(201).json(category);
    } catch (error) {
      console.error("Error creating category:", error);
      res.status(500).json({ message: "Failed to create category" });
    }
  });

  app.put("/api/categories/:id", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, caseTypeId, active } = req.body;
      const category = await storage.updateCategory(id, {
        name,
        description,
        caseTypeId,
        isActive: active,
      });
      res.json(category);
    } catch (error) {
      console.error("Error updating category:", error);
      res.status(500).json({ message: "Failed to update category" });
    }
  });

  app.delete("/api/categories/:id", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteCategory(id);
      res.json({ message: "Category deleted successfully" });
    } catch (error) {
      console.error("Error deleting category:", error);
      res.status(500).json({ message: "Failed to delete category" });
    }
  });

  // Business Rules Management
  app.get("/api/priority-rules", requireAuth, requireRole("compliance"), async (req, res) => {
    try {
      const rules = await storage.getAllPriorityRules();
      res.json(rules);
    } catch (error) {
      console.error("Error fetching priority rules:", error);
      res.status(500).json({ message: "Failed to fetch priority rules" });
    }
  });

  app.post("/api/priority-rules", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { name, description, priority, conditions, active } = req.body;
      const rule = await storage.createPriorityRule({
        name,
        description,
        priority,
        conditions,
        isActive: active,
      });
      res.status(201).json(rule);
    } catch (error) {
      console.error("Error creating priority rule:", error);
      res.status(500).json({ message: "Failed to create priority rule" });
    }
  });

  app.put("/api/priority-rules/:id", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, priority, conditions, active } = req.body;
      const rule = await storage.updatePriorityRule(id, {
        name,
        description,
        priority,
        conditions,
        isActive: active,
      });
      res.json(rule);
    } catch (error) {
      console.error("Error updating priority rule:", error);
      res.status(500).json({ message: "Failed to update priority rule" });
    }
  });

  app.delete("/api/priority-rules/:id", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deletePriorityRule(id);
      res.json({ message: "Priority rule deleted successfully" });
    } catch (error) {
      console.error("Error deleting priority rule:", error);
      res.status(500).json({ message: "Failed to delete priority rule" });
    }
  });

  // Tag Rules Management
  app.get("/api/tag-rules", requireAuth, requireRole("compliance"), async (req, res) => {
    try {
      const rules = await storage.getAllTagRules();
      res.json(rules);
    } catch (error) {
      console.error("Error fetching tag rules:", error);
      res.status(500).json({ message: "Failed to fetch tag rules" });
    }
  });

  app.post("/api/tag-rules", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { name, description, tag, conditions, active } = req.body;
      const rule = await storage.createTagRule({
        name,
        description,
        tag,
        conditions,
        isActive: active,
      });
      res.status(201).json(rule);
    } catch (error) {
      console.error("Error creating tag rule:", error);
      res.status(500).json({ message: "Failed to create tag rule" });
    }
  });

  app.put("/api/tag-rules/:id", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, tag, conditions, active } = req.body;
      const rule = await storage.updateTagRule(id, {
        name,
        description,
        tag,
        conditions,
        isActive: active,
      });
      res.json(rule);
    } catch (error) {
      console.error("Error updating tag rule:", error);
      res.status(500).json({ message: "Failed to update tag rule" });
    }
  });

  app.delete("/api/tag-rules/:id", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteTagRule(id);
      res.json({ message: "Tag rule deleted successfully" });
    } catch (error) {
      console.error("Error deleting tag rule:", error);
      res.status(500).json({ message: "Failed to delete tag rule" });
    }
  });

  // SLA Policies Management
  app.get("/api/sla-policies", requireAuth, requireRole("compliance"), async (req, res) => {
    try {
      const policies = await storage.getAllSlaPolicies();
      res.json(policies);
    } catch (error) {
      console.error("Error fetching SLA policies:", error);
      res.status(500).json({ message: "Failed to fetch SLA policies" });
    }
  });

  app.post("/api/sla-policies", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { name, description, priority, responseTimeHours, resolutionTimeHours, active } = req.body;
      const policy = await storage.createSlaPolicy({
        name,
        description,
        priority,
        responseTimeHours,
        resolutionTimeHours,
        isActive: active,
      });
      res.status(201).json(policy);
    } catch (error) {
      console.error("Error creating SLA policy:", error);
      res.status(500).json({ message: "Failed to create SLA policy" });
    }
  });

  app.put("/api/sla-policies/:id", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, priority, responseTimeHours, resolutionTimeHours, active } = req.body;
      const policy = await storage.updateSlaPolicy(id, {
        name,
        description,
        priority,
        responseTimeHours,
        resolutionTimeHours,
        isActive: active,
      });
      res.json(policy);
    } catch (error) {
      console.error("Error updating SLA policy:", error);
      res.status(500).json({ message: "Failed to update SLA policy" });
    }
  });

  app.delete("/api/sla-policies/:id", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteSlaPolicy(id);
      res.json({ message: "SLA policy deleted successfully" });
    } catch (error) {
      console.error("Error deleting SLA policy:", error);
      res.status(500).json({ message: "Failed to delete SLA policy" });
    }
  });

  // Checklist Templates Management
  app.get("/api/categories/:categoryId/checklist-templates", requireAuth, async (req, res) => {
    try {
      const { categoryId } = req.params;
      const templates = await storage.getChecklistTemplates(categoryId);
      res.json(templates);
    } catch (error) {
      console.error("Error fetching checklist templates:", error);
      res.status(500).json({ message: "Failed to fetch checklist templates" });
    }
  });

  app.post("/api/categories/:categoryId/checklist-templates", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { categoryId } = req.params;
      const { key, label, sortOrder, isRequired, conditionJson, helpText } = req.body;
      const template = await storage.createChecklistTemplate({
        categoryId,
        key,
        label,
        sortOrder: sortOrder || 0,
        isRequired: isRequired || false,
        conditionJson,
        helpText,
      });
      res.status(201).json(template);
    } catch (error) {
      console.error("Error creating checklist template:", error);
      res.status(500).json({ message: "Failed to create checklist template" });
    }
  });

  app.put("/api/checklist-templates/:id", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { id } = req.params;
      const { key, label, sortOrder, isRequired, conditionJson, helpText } = req.body;
      const template = await storage.updateChecklistTemplate(id, {
        key,
        label,
        sortOrder,
        isRequired,
        conditionJson,
        helpText,
      });
      res.json(template);
    } catch (error) {
      console.error("Error updating checklist template:", error);
      res.status(500).json({ message: "Failed to update checklist template" });
    }
  });

  app.delete("/api/checklist-templates/:id", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteChecklistTemplate(id);
      res.json({ message: "Checklist template deleted successfully" });
    } catch (error) {
      console.error("Error deleting checklist template:", error);
      res.status(500).json({ message: "Failed to delete checklist template" });
    }
  });

  // Document Requirements Management  
  app.get("/api/categories/:categoryId/document-requirements", requireAuth, async (req, res) => {
    try {
      const { categoryId } = req.params;
      const requirements = await storage.getDocumentRequirements(categoryId);
      res.json(requirements);
    } catch (error) {
      console.error("Error fetching document requirements:", error);
      res.status(500).json({ message: "Failed to fetch document requirements" });
    }
  });

  app.post("/api/categories/:categoryId/document-requirements", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { categoryId } = req.params;
      const { key, label, isRequired, mimeWhitelist, conditionJson } = req.body;
      const requirement = await storage.createDocumentRequirement({
        categoryId,
        key,
        label,
        isRequired: isRequired || false,
        mimeWhitelist,
        conditionJson,
      });
      res.status(201).json(requirement);
    } catch (error) {
      console.error("Error creating document requirement:", error);
      res.status(500).json({ message: "Failed to create document requirement" });
    }
  });

  app.put("/api/document-requirements/:id", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { id } = req.params;
      const { key, label, isRequired, mimeWhitelist, conditionJson } = req.body;
      const requirement = await storage.updateDocumentRequirement(id, {
        key,
        label,
        isRequired,
        mimeWhitelist,
        conditionJson,
      });
      res.json(requirement);
    } catch (error) {
      console.error("Error updating document requirement:", error);
      res.status(500).json({ message: "Failed to update document requirement" });
    }
  });

  app.delete("/api/document-requirements/:id", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteDocumentRequirement(id);
      res.json({ message: "Document requirement deleted successfully" });
    } catch (error) {
      console.error("Error deleting document requirement:", error);
      res.status(500).json({ message: "Failed to delete document requirement" });
    }
  });

  // Document Management
  app.get("/api/cases/:caseId/documents", requireAuth, async (req, res) => {
    try {
      const { caseId } = req.params;
      const documents = await storage.getDocuments(caseId);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  app.post("/api/cases/:caseId/documents/upload", requireAuth, upload.single('file'), async (req, res) => {
    try {
      const { caseId } = req.params;
      const { key, label } = req.body;
      const file = req.file;
      const userId = req.user!.id;

      if (!file) {
        return res.status(400).json({ message: "No file provided" });
      }

      // Generate unique storage key for object storage
      const timestamp = Date.now();
      const sanitizedFileName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
      const storageKey = `cases/${caseId}/documents/${timestamp}_${sanitizedFileName}`;

      // Determine file type from MIME type
      const getFileTypeFromMime = (mimeType: string): string => {
        if (mimeType.startsWith('image/')) return 'IMAGE';
        if (mimeType === 'application/pdf') return 'PDF';
        if (mimeType.includes('document') || mimeType.includes('word')) return 'DOCUMENT';
        if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'SPREADSHEET';
        return 'OTHER';
      };

      // TODO: In a real implementation, upload file.buffer to object storage
      // For now, we'll simulate storage by logging file info
      console.log(`Uploading file: ${file.originalname}, Size: ${file.size} bytes, Type: ${file.mimetype}`);
      console.log(`Storage path: ${process.env.PRIVATE_OBJECT_DIR}/${storageKey}`);

      // Create document record in database
      const document = await storage.createDocument({
        caseId,
        key: key || 'uploaded_document',
        label: label || file.originalname,
        fileType: getFileTypeFromMime(file.mimetype),
        mime: file.mimetype,
        storageKey,
        uploadedByUserId: userId,
      });

      res.status(201).json({
        document,
        message: "File uploaded successfully"
      });
    } catch (error) {
      console.error("Error uploading document:", error);
      res.status(500).json({ message: "Failed to upload document" });
    }
  });

  app.get("/api/documents/:id/download", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Get document from database to retrieve storage key
      const document = await storage.getDocument(id);
      
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      // Return download info (in a real implementation, this would generate presigned URL)
      res.json({
        downloadUrl: `${process.env.PRIVATE_OBJECT_DIR}/${document.storageKey}`,
        fileName: document.label,
        mimeType: document.mime,
      });
    } catch (error) {
      console.error("Error generating download URL:", error);
      res.status(500).json({ message: "Failed to generate download URL" });
    }
  });

  app.delete("/api/documents/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      // TODO: In real implementation, also delete from object storage
      await storage.deleteDocument(id);
      
      res.json({ message: "Document deleted successfully" });
    } catch (error) {
      console.error("Error deleting document:", error);
      res.status(500).json({ message: "Failed to delete document" });
    }
  });

  // Checklist Items Management
  app.get("/api/cases/:caseId/checklist-items", requireAuth, async (req, res) => {
    try {
      const { caseId } = req.params;
      const checklistItems = await storage.getChecklistItems(caseId);
      res.json(checklistItems);
    } catch (error) {
      console.error("Error fetching checklist items:", error);
      res.status(500).json({ message: "Failed to fetch checklist items" });
    }
  });

  app.post("/api/cases/:caseId/checklist-items/generate", requireAuth, async (req, res) => {
    try {
      const { caseId } = req.params;
      
      // Get case to determine category
      const caseRecord = await storage.getCase(caseId);
      if (!caseRecord) {
        return res.status(404).json({ message: "Case not found" });
      }

      // Get checklist templates for this category
      const templates = await storage.getChecklistTemplates(caseRecord.categoryId);
      
      // Generate checklist items from templates
      const checklistItems = [];
      for (const template of templates) {
        // TODO: Add condition evaluation here
        const item = await storage.createChecklistItem({
          caseId,
          key: template.key,
          label: template.label,
          isRequired: template.isRequired,
          status: "open",
        });
        checklistItems.push(item);
      }

      res.status(201).json({ 
        message: `Generated ${checklistItems.length} checklist items`,
        items: checklistItems
      });
    } catch (error) {
      console.error("Error generating checklist items:", error);
      res.status(500).json({ message: "Failed to generate checklist items" });
    }
  });

  app.put("/api/checklist-items/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { status, assignedToUserId } = req.body;
      const userId = req.user!.id;

      const updates: any = {};
      if (status !== undefined) {
        updates.status = status;
        if (status === "complete") {
          updates.completedAt = new Date();
        } else {
          updates.completedAt = null;
        }
      }
      if (assignedToUserId !== undefined) {
        updates.assignedToUserId = assignedToUserId;
      }

      const item = await storage.updateChecklistItem(id, updates);
      res.json(item);
    } catch (error) {
      console.error("Error updating checklist item:", error);
      res.status(500).json({ message: "Failed to update checklist item" });
    }
  });

  app.post("/api/checklist-items/:id/complete", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const item = await storage.updateChecklistItem(id, {
        status: "complete",
        completedAt: new Date(),
        assignedToUserId: userId,
      });

      res.json(item);
    } catch (error) {
      console.error("Error completing checklist item:", error);
      res.status(500).json({ message: "Failed to complete checklist item" });
    }
  });

  app.post("/api/checklist-items/:id/reopen", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;

      const item = await storage.updateChecklistItem(id, {
        status: "open",
        completedAt: null,
      });

      res.json(item);
    } catch (error) {
      console.error("Error reopening checklist item:", error);
      res.status(500).json({ message: "Failed to reopen checklist item" });
    }
  });

  // Get users for assignment
  app.get("/api/users", requireAuth, async (req, res) => {
    try {
      // For now, return current user + mock agents for assignment
      // TODO: Implement proper user listing when user management is added
      const mockUsers = [
        { id: req.user!.id, name: req.user!.name, email: req.user!.email, role: req.user!.role },
        { id: "agent-1", name: "Agent 1", email: "agent1@company.com", role: "agent" },
        { id: "agent-2", name: "Agent 2", email: "agent2@company.com", role: "agent" },
        { id: "compliance-1", name: "Compliance Officer", email: "compliance@company.com", role: "compliance" }
      ];
      res.json(mockUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
