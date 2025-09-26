import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, requireRole } from "./replitAuth";
import { 
  insertCaseSchema, 
  insertCustomerSchema,
  type Case,
  type Customer 
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Setup authentication
  await setupAuth(app);

  // Auth endpoints
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
  
  // Case Management API Endpoints
  
  // GET /api/cases - List cases with filtering and pagination
  app.get("/api/cases", isAuthenticated, async (req, res) => {
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

  // GET /api/cases/:id - Get single case by ID
  app.get("/api/cases/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const caseRecord = await storage.getCase(id);
      
      if (!caseRecord) {
        return res.status(404).json({ error: "Case not found" });
      }
      
      res.json({ data: caseRecord });
    } catch (error) {
      console.error("Failed to fetch case:", error);
      res.status(500).json({ error: "Failed to fetch case" });
    }
  });

  // POST /api/cases - Create new case (agents and above)
  app.post("/api/cases", requireRole('agent'), async (req: any, res) => {
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
  app.put("/api/cases/:id", requireRole('agent'), async (req: any, res) => {
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
  app.get("/api/customers", isAuthenticated, async (req, res) => {
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
  app.get("/api/customers/:id", isAuthenticated, async (req, res) => {
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
  app.post("/api/customers", requireRole('agent'), async (req, res) => {
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
  
  // GET /api/case-types - List case types  
  app.get("/api/case-types", isAuthenticated, async (req, res) => {
    try {
      const caseTypes = await storage.getCaseTypes();
      res.json({ data: caseTypes });
    } catch (error) {
      console.error("Failed to fetch case types:", error);
      res.status(500).json({ error: "Failed to fetch case types" });
    }
  });

  // GET /api/categories - List categories (optionally filtered by case type)
  app.get("/api/categories", isAuthenticated, async (req, res) => {
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
  app.post("/api/case-types", isAuthenticated, requireRole("admin"), async (req, res) => {
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

  app.put("/api/case-types/:id", isAuthenticated, requireRole("admin"), async (req, res) => {
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

  app.delete("/api/case-types/:id", isAuthenticated, requireRole("admin"), async (req, res) => {
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
  app.post("/api/categories", isAuthenticated, requireRole("admin"), async (req, res) => {
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

  app.put("/api/categories/:id", isAuthenticated, requireRole("admin"), async (req, res) => {
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

  app.delete("/api/categories/:id", isAuthenticated, requireRole("admin"), async (req, res) => {
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
  app.get("/api/priority-rules", isAuthenticated, requireRole("compliance"), async (req, res) => {
    try {
      const rules = await storage.getAllPriorityRules();
      res.json(rules);
    } catch (error) {
      console.error("Error fetching priority rules:", error);
      res.status(500).json({ message: "Failed to fetch priority rules" });
    }
  });

  app.post("/api/priority-rules", isAuthenticated, requireRole("admin"), async (req, res) => {
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

  app.put("/api/priority-rules/:id", isAuthenticated, requireRole("admin"), async (req, res) => {
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

  app.delete("/api/priority-rules/:id", isAuthenticated, requireRole("admin"), async (req, res) => {
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
  app.get("/api/tag-rules", isAuthenticated, requireRole("compliance"), async (req, res) => {
    try {
      const rules = await storage.getAllTagRules();
      res.json(rules);
    } catch (error) {
      console.error("Error fetching tag rules:", error);
      res.status(500).json({ message: "Failed to fetch tag rules" });
    }
  });

  app.post("/api/tag-rules", isAuthenticated, requireRole("admin"), async (req, res) => {
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

  app.put("/api/tag-rules/:id", isAuthenticated, requireRole("admin"), async (req, res) => {
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

  app.delete("/api/tag-rules/:id", isAuthenticated, requireRole("admin"), async (req, res) => {
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
  app.get("/api/sla-policies", isAuthenticated, requireRole("compliance"), async (req, res) => {
    try {
      const policies = await storage.getAllSlaPolicies();
      res.json(policies);
    } catch (error) {
      console.error("Error fetching SLA policies:", error);
      res.status(500).json({ message: "Failed to fetch SLA policies" });
    }
  });

  app.post("/api/sla-policies", isAuthenticated, requireRole("admin"), async (req, res) => {
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

  app.put("/api/sla-policies/:id", isAuthenticated, requireRole("admin"), async (req, res) => {
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

  app.delete("/api/sla-policies/:id", isAuthenticated, requireRole("admin"), async (req, res) => {
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
  app.get("/api/categories/:categoryId/checklist-templates", isAuthenticated, async (req, res) => {
    try {
      const { categoryId } = req.params;
      const templates = await storage.getChecklistTemplates(categoryId);
      res.json(templates);
    } catch (error) {
      console.error("Error fetching checklist templates:", error);
      res.status(500).json({ message: "Failed to fetch checklist templates" });
    }
  });

  app.post("/api/categories/:categoryId/checklist-templates", isAuthenticated, requireRole("admin"), async (req, res) => {
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

  app.put("/api/checklist-templates/:id", isAuthenticated, requireRole("admin"), async (req, res) => {
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

  app.delete("/api/checklist-templates/:id", isAuthenticated, requireRole("admin"), async (req, res) => {
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
  app.get("/api/categories/:categoryId/document-requirements", isAuthenticated, async (req, res) => {
    try {
      const { categoryId } = req.params;
      const requirements = await storage.getDocumentRequirements(categoryId);
      res.json(requirements);
    } catch (error) {
      console.error("Error fetching document requirements:", error);
      res.status(500).json({ message: "Failed to fetch document requirements" });
    }
  });

  app.post("/api/categories/:categoryId/document-requirements", isAuthenticated, requireRole("admin"), async (req, res) => {
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

  app.put("/api/document-requirements/:id", isAuthenticated, requireRole("admin"), async (req, res) => {
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

  app.delete("/api/document-requirements/:id", isAuthenticated, requireRole("admin"), async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteDocumentRequirement(id);
      res.json({ message: "Document requirement deleted successfully" });
    } catch (error) {
      console.error("Error deleting document requirement:", error);
      res.status(500).json({ message: "Failed to delete document requirement" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
