import { 
  users, 
  customers, 
  cases, 
  checklistItems, 
  documents, 
  resolutions, 
  flags, 
  auditLogs,
  caseTypes,
  categories,
  checklistTemplates,
  documentRequirements,
  priorityRules,
  tagRules,
  resolutionConfigs,
  slaPolicies,
  valueSets,
  configAudits,
  featureFlags,
  webhooks,
  integrations,
  type User, 
  type InsertUser,
  type Customer,
  type InsertCustomer,
  type Case,
  type InsertCase,
  type ChecklistItem,
  type InsertChecklistItem,
  type Document,
  type InsertDocument,
  type Resolution,
  type InsertResolution,
  type Flag,
  type InsertFlag,
  type AuditLog,
  type InsertAuditLog,
  type CaseType,
  type InsertCaseType,
  type Category,
  type InsertCategory,
  type ChecklistTemplate,
  type InsertChecklistTemplate,
  type DocumentRequirement,
  type InsertDocumentRequirement,
  type PriorityRule,
  type InsertPriorityRule,
  type TagRule,
  type InsertTagRule,
  type ResolutionConfig,
  type InsertResolutionConfig,
  type SlaPolicy,
  type InsertSlaPolicy,
  type ValueSet,
  type InsertValueSet,
  type ConfigAudit,
  type InsertConfigAudit,
  type FeatureFlag,
  type InsertFeatureFlag,
  type Webhook,
  type InsertWebhook,
  type Integration,
  type InsertIntegration
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, ilike, or, sql, inArray } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<InsertUser>): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Customer methods
  getCustomer(id: string): Promise<Customer | undefined>;
  getCustomers(filters?: { limit?: number; offset?: number }): Promise<Customer[]>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  findCustomerByName(name: string): Promise<Customer[]>;
  
  // Case methods
  getCase(id: string): Promise<Case | undefined>;
  getCases(filters?: { 
    status?: string; 
    priorityValue?: string; 
    priorityRuleId?: string;
    caseTypeId?: string; 
    categoryId?: string;
    customerId?: string;
    limit?: number;
    offset?: number;
  }): Promise<Case[]>;
  createCase(caseData: InsertCase): Promise<Case>;
  updateCase(id: string, updates: Partial<InsertCase>): Promise<Case>;
  
  // Checklist methods
  getChecklistItems(caseId: string): Promise<ChecklistItem[]>;
  createChecklistItem(item: InsertChecklistItem): Promise<ChecklistItem>;
  updateChecklistItem(id: string, updates: Partial<InsertChecklistItem>): Promise<ChecklistItem>;
  
  // Document methods
  getDocuments(caseId: string): Promise<Document[]>;
  createDocument(document: InsertDocument): Promise<Document>;
  deleteDocument(id: string): Promise<void>;
  
  // Resolution methods
  getResolution(caseId: string): Promise<Resolution | undefined>;
  createResolution(resolution: InsertResolution): Promise<Resolution>;
  
  // Flag methods
  getFlags(caseId: string): Promise<Flag[]>;
  createFlag(flag: InsertFlag): Promise<Flag>;
  
  // Audit methods
  getAuditLogs(caseId?: string, limit?: number): Promise<AuditLog[]>;
  createAuditLog(auditLog: InsertAuditLog): Promise<AuditLog>;
  
  // Config methods - Case Types
  getCaseTypes(): Promise<CaseType[]>;
  getCaseType(id: string): Promise<CaseType | undefined>;
  createCaseType(caseType: InsertCaseType): Promise<CaseType>;
  updateCaseType(id: string, updates: Partial<InsertCaseType>): Promise<CaseType>;
  deleteCaseType(id: string): Promise<void>;
  
  // Config methods - Categories  
  getCategories(caseTypeId?: string): Promise<Category[]>;
  getCategory(id: string): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: string, updates: Partial<InsertCategory>): Promise<Category>;
  deleteCategory(id: string): Promise<void>;
  
  // Config methods - Templates & Requirements
  getChecklistTemplates(categoryId: string): Promise<ChecklistTemplate[]>;
  createChecklistTemplate(template: InsertChecklistTemplate): Promise<ChecklistTemplate>;
  updateChecklistTemplate(id: string, updates: Partial<InsertChecklistTemplate>): Promise<ChecklistTemplate>;
  deleteChecklistTemplate(id: string): Promise<void>;
  
  getDocumentRequirements(categoryId: string): Promise<DocumentRequirement[]>;
  createDocumentRequirement(requirement: InsertDocumentRequirement): Promise<DocumentRequirement>;
  updateDocumentRequirement(id: string, updates: Partial<InsertDocumentRequirement>): Promise<DocumentRequirement>;
  deleteDocumentRequirement(id: string): Promise<void>;
  
  // Config methods - Rules & Policies
  getPriorityRules(categoryId: string): Promise<PriorityRule[]>;
  createPriorityRule(rule: InsertPriorityRule): Promise<PriorityRule>;
  updatePriorityRule(id: string, updates: Partial<InsertPriorityRule>): Promise<PriorityRule>;
  deletePriorityRule(id: string): Promise<void>;
  
  getTagRules(categoryId: string): Promise<TagRule[]>;
  createTagRule(rule: InsertTagRule): Promise<TagRule>;
  updateTagRule(id: string, updates: Partial<InsertTagRule>): Promise<TagRule>;
  deleteTagRule(id: string): Promise<void>;
  
  getResolutionConfig(categoryId: string): Promise<ResolutionConfig | undefined>;
  createResolutionConfig(config: InsertResolutionConfig): Promise<ResolutionConfig>;
  updateResolutionConfig(id: string, updates: Partial<InsertResolutionConfig>): Promise<ResolutionConfig>;
  deleteResolutionConfig(id: string): Promise<void>;
  
  getSlaPolicies(categoryId: string): Promise<SlaPolicy[]>;
  createSlaPolicy(policy: InsertSlaPolicy): Promise<SlaPolicy>;
  updateSlaPolicy(id: string, updates: Partial<InsertSlaPolicy>): Promise<SlaPolicy>;
  deleteSlaPolicy(id: string): Promise<void>;
  
  // Config methods - Value Sets & Feature Flags
  getValueSets(): Promise<ValueSet[]>;
  getValueSet(key: string): Promise<ValueSet | undefined>;
  createValueSet(valueSet: InsertValueSet): Promise<ValueSet>;
  updateValueSet(id: string, updates: Partial<InsertValueSet>): Promise<ValueSet>;
  deleteValueSet(id: string): Promise<void>;
  
  getFeatureFlags(): Promise<FeatureFlag[]>;
  getFeatureFlag(key: string): Promise<FeatureFlag | undefined>;
  createFeatureFlag(flag: InsertFeatureFlag): Promise<FeatureFlag>;
  updateFeatureFlag(id: string, updates: Partial<InsertFeatureFlag>): Promise<FeatureFlag>;
  deleteFeatureFlag(id: string): Promise<void>;
  
  // Admin methods for getting all rules (not tied to categories)
  getAllPriorityRules(): Promise<PriorityRule[]>;
  getAllTagRules(): Promise<TagRule[]>;
  getAllSlaPolicies(): Promise<SlaPolicy[]>;
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        updatedAt: new Date()
      })
      .returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Customer methods
  async getCustomer(id: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    return customer || undefined;
  }

  async createCustomer(insertCustomer: InsertCustomer): Promise<Customer> {
    const [customer] = await db
      .insert(customers)
      .values({
        ...insertCustomer,
        updatedAt: new Date()
      })
      .returning();
    return customer;
  }

  async getCustomers(filters?: { limit?: number; offset?: number }): Promise<Customer[]> {
    let query = db.select().from(customers).orderBy(desc(customers.createdAt));
    
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }
    
    if (filters?.offset) {
      query = query.offset(filters.offset);
    }
    
    return await query.execute();
  }

  async findCustomerByName(name: string): Promise<Customer[]> {
    return await db.select().from(customers).where(ilike(customers.name, `%${name}%`));
  }

  // Case methods
  async getCase(id: string): Promise<Case | undefined> {
    const [caseRecord] = await db.select().from(cases).where(eq(cases.id, id));
    return caseRecord || undefined;
  }

  async getCases(filters?: { 
    status?: string; 
    priorityValue?: string; 
    priorityRuleId?: string;
    caseTypeId?: string; 
    categoryId?: string;
    customerId?: string;
    limit?: number;
    offset?: number;
  }): Promise<Case[]> {
    const conditions = [];
    
    if (filters?.status) conditions.push(eq(cases.status, filters.status as any));
    if (filters?.priorityRuleId) conditions.push(eq(cases.priorityRuleId, filters.priorityRuleId));
    if (filters?.caseTypeId) conditions.push(eq(cases.caseTypeId, filters.caseTypeId));
    if (filters?.categoryId) conditions.push(eq(cases.categoryId, filters.categoryId));
    if (filters?.customerId) conditions.push(eq(cases.customerId, filters.customerId));
    
    // If filtering by priority value, add condition using inArray with subquery
    if (filters?.priorityValue) {
      const priorityRuleIds = db.select({ id: priorityRules.id })
        .from(priorityRules)
        .where(eq(priorityRules.priorityValue, filters.priorityValue));
      conditions.push(inArray(cases.priorityRuleId, priorityRuleIds));
    }
    
    let baseQuery = db.select().from(cases);
    
    if (conditions.length > 0) {
      baseQuery = baseQuery.where(and(...conditions));
    }
    
    baseQuery = baseQuery.orderBy(desc(cases.createdAt));
    
    if (filters?.limit) {
      baseQuery = baseQuery.limit(filters.limit);
    }
    
    if (filters?.offset) {
      baseQuery = baseQuery.offset(filters.offset);
    }
    
    return await baseQuery.execute();
  }

  async createCase(insertCase: InsertCase): Promise<Case> {
    const [caseRecord] = await db
      .insert(cases)
      .values({
        ...insertCase,
        updatedAt: new Date()
      })
      .returning();
    return caseRecord;
  }

  async updateCase(id: string, updates: Partial<InsertCase>): Promise<Case> {
    const [caseRecord] = await db
      .update(cases)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(cases.id, id))
      .returning();
    return caseRecord;
  }

  // Checklist methods
  async getChecklistItems(caseId: string): Promise<ChecklistItem[]> {
    return await db.select().from(checklistItems)
      .where(eq(checklistItems.caseId, caseId))
      .orderBy(asc(checklistItems.key));
  }

  async createChecklistItem(insertItem: InsertChecklistItem): Promise<ChecklistItem> {
    const [item] = await db
      .insert(checklistItems)
      .values(insertItem)
      .returning();
    return item;
  }

  async updateChecklistItem(id: string, updates: Partial<InsertChecklistItem>): Promise<ChecklistItem> {
    const [item] = await db
      .update(checklistItems)
      .set(updates)
      .where(eq(checklistItems.id, id))
      .returning();
    return item;
  }

  // Document methods
  async getDocuments(caseId: string): Promise<Document[]> {
    return await db.select().from(documents)
      .where(eq(documents.caseId, caseId))
      .orderBy(desc(documents.uploadedAt));
  }

  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const [document] = await db
      .insert(documents)
      .values(insertDocument)
      .returning();
    return document;
  }

  async deleteDocument(id: string): Promise<void> {
    await db.delete(documents).where(eq(documents.id, id));
  }

  // Resolution methods
  async getResolution(caseId: string): Promise<Resolution | undefined> {
    const [resolution] = await db.select().from(resolutions).where(eq(resolutions.caseId, caseId));
    return resolution || undefined;
  }

  async createResolution(insertResolution: InsertResolution): Promise<Resolution> {
    const [resolution] = await db
      .insert(resolutions)
      .values(insertResolution)
      .returning();
    return resolution;
  }

  // Flag methods
  async getFlags(caseId: string): Promise<Flag[]> {
    return await db.select().from(flags)
      .where(eq(flags.caseId, caseId))
      .orderBy(desc(flags.appliedAt));
  }

  async createFlag(insertFlag: InsertFlag): Promise<Flag> {
    const [flag] = await db
      .insert(flags)
      .values(insertFlag)
      .returning();
    return flag;
  }

  // Audit methods
  async getAuditLogs(caseId?: string, limit: number = 50): Promise<AuditLog[]> {
    let baseQuery = db.select().from(auditLogs);
    
    if (caseId) {
      baseQuery = baseQuery.where(eq(auditLogs.caseId, caseId));
    }
    
    return await baseQuery
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);
  }

  async createAuditLog(insertAuditLog: InsertAuditLog): Promise<AuditLog> {
    const [auditLog] = await db
      .insert(auditLogs)
      .values(insertAuditLog)
      .returning();
    return auditLog;
  }

  // Config methods - Case Types
  async getCaseTypes(): Promise<CaseType[]> {
    return await db.select().from(caseTypes).where(eq(caseTypes.isActive, true));
  }

  async getCaseType(id: string): Promise<CaseType | undefined> {
    const [caseType] = await db.select().from(caseTypes).where(eq(caseTypes.id, id));
    return caseType || undefined;
  }

  async createCaseType(insertCaseType: InsertCaseType): Promise<CaseType> {
    const [caseType] = await db
      .insert(caseTypes)
      .values(insertCaseType)
      .returning();
    return caseType;
  }

  async updateCaseType(id: string, updates: Partial<InsertCaseType>): Promise<CaseType> {
    const [caseType] = await db
      .update(caseTypes)
      .set(updates)
      .where(eq(caseTypes.id, id))
      .returning();
    return caseType;
  }

  async deleteCaseType(id: string): Promise<void> {
    await db.delete(caseTypes).where(eq(caseTypes.id, id));
  }

  // Config methods - Categories
  async getCategories(caseTypeId?: string): Promise<Category[]> {
    const conditions = [eq(categories.isActive, true)];
    
    if (caseTypeId) {
      conditions.push(eq(categories.caseTypeId, caseTypeId));
    }
    
    return await db.select().from(categories)
      .where(and(...conditions))
      .orderBy(asc(categories.sortOrder));
  }

  async getCategory(id: string): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category || undefined;
  }

  async createCategory(insertCategory: InsertCategory): Promise<Category> {
    const [category] = await db
      .insert(categories)
      .values(insertCategory)
      .returning();
    return category;
  }

  async updateCategory(id: string, updates: Partial<InsertCategory>): Promise<Category> {
    const [category] = await db
      .update(categories)
      .set(updates)
      .where(eq(categories.id, id))
      .returning();
    return category;
  }

  async deleteCategory(id: string): Promise<void> {
    await db.delete(categories).where(eq(categories.id, id));
  }

  // Config methods - Checklist Templates
  async getChecklistTemplates(categoryId: string): Promise<ChecklistTemplate[]> {
    return await db.select().from(checklistTemplates)
      .where(eq(checklistTemplates.categoryId, categoryId))
      .orderBy(asc(checklistTemplates.sortOrder));
  }

  async createChecklistTemplate(insertTemplate: InsertChecklistTemplate): Promise<ChecklistTemplate> {
    const [template] = await db
      .insert(checklistTemplates)
      .values(insertTemplate)
      .returning();
    return template;
  }

  async updateChecklistTemplate(id: string, updates: Partial<InsertChecklistTemplate>): Promise<ChecklistTemplate> {
    const [template] = await db
      .update(checklistTemplates)
      .set(updates)
      .where(eq(checklistTemplates.id, id))
      .returning();
    return template;
  }

  async deleteChecklistTemplate(id: string): Promise<void> {
    await db.delete(checklistTemplates).where(eq(checklistTemplates.id, id));
  }

  // Config methods - Document Requirements
  async getDocumentRequirements(categoryId: string): Promise<DocumentRequirement[]> {
    return await db.select().from(documentRequirements)
      .where(eq(documentRequirements.categoryId, categoryId));
  }

  async createDocumentRequirement(insertRequirement: InsertDocumentRequirement): Promise<DocumentRequirement> {
    const [requirement] = await db
      .insert(documentRequirements)
      .values(insertRequirement)
      .returning();
    return requirement;
  }

  async updateDocumentRequirement(id: string, updates: Partial<InsertDocumentRequirement>): Promise<DocumentRequirement> {
    const [requirement] = await db
      .update(documentRequirements)
      .set(updates)
      .where(eq(documentRequirements.id, id))
      .returning();
    return requirement;
  }

  async deleteDocumentRequirement(id: string): Promise<void> {
    await db.delete(documentRequirements).where(eq(documentRequirements.id, id));
  }

  // Config methods - Priority Rules
  async getPriorityRules(categoryId: string): Promise<PriorityRule[]> {
    return await db.select().from(priorityRules)
      .where(eq(priorityRules.categoryId, categoryId));
  }

  async createPriorityRule(insertRule: InsertPriorityRule): Promise<PriorityRule> {
    const [rule] = await db
      .insert(priorityRules)
      .values(insertRule)
      .returning();
    return rule;
  }

  async updatePriorityRule(id: string, updates: Partial<InsertPriorityRule>): Promise<PriorityRule> {
    const [rule] = await db
      .update(priorityRules)
      .set(updates)
      .where(eq(priorityRules.id, id))
      .returning();
    return rule;
  }

  async deletePriorityRule(id: string): Promise<void> {
    await db.delete(priorityRules).where(eq(priorityRules.id, id));
  }

  // Config methods - Tag Rules
  async getTagRules(categoryId: string): Promise<TagRule[]> {
    return await db.select().from(tagRules)
      .where(eq(tagRules.categoryId, categoryId));
  }

  async createTagRule(insertRule: InsertTagRule): Promise<TagRule> {
    const [rule] = await db
      .insert(tagRules)
      .values(insertRule)
      .returning();
    return rule;
  }

  async updateTagRule(id: string, updates: Partial<InsertTagRule>): Promise<TagRule> {
    const [rule] = await db
      .update(tagRules)
      .set(updates)
      .where(eq(tagRules.id, id))
      .returning();
    return rule;
  }

  async deleteTagRule(id: string): Promise<void> {
    await db.delete(tagRules).where(eq(tagRules.id, id));
  }

  // Config methods - Resolution Config
  async getResolutionConfig(categoryId: string): Promise<ResolutionConfig | undefined> {
    const [config] = await db.select().from(resolutionConfigs)
      .where(eq(resolutionConfigs.categoryId, categoryId));
    return config || undefined;
  }

  async createResolutionConfig(insertConfig: InsertResolutionConfig): Promise<ResolutionConfig> {
    const [config] = await db
      .insert(resolutionConfigs)
      .values(insertConfig)
      .returning();
    return config;
  }

  async updateResolutionConfig(id: string, updates: Partial<InsertResolutionConfig>): Promise<ResolutionConfig> {
    const [config] = await db
      .update(resolutionConfigs)
      .set(updates)
      .where(eq(resolutionConfigs.id, id))
      .returning();
    return config;
  }

  async deleteResolutionConfig(id: string): Promise<void> {
    await db.delete(resolutionConfigs).where(eq(resolutionConfigs.id, id));
  }

  // Config methods - SLA Policies
  async getSlaPolicies(categoryId: string): Promise<SlaPolicy[]> {
    return await db.select().from(slaPolicies)
      .where(eq(slaPolicies.categoryId, categoryId));
  }

  async createSlaPolicy(insertPolicy: InsertSlaPolicy): Promise<SlaPolicy> {
    const [policy] = await db
      .insert(slaPolicies)
      .values(insertPolicy)
      .returning();
    return policy;
  }

  async updateSlaPolicy(id: string, updates: Partial<InsertSlaPolicy>): Promise<SlaPolicy> {
    const [policy] = await db
      .update(slaPolicies)
      .set(updates)
      .where(eq(slaPolicies.id, id))
      .returning();
    return policy;
  }

  async deleteSlaPolicy(id: string): Promise<void> {
    await db.delete(slaPolicies).where(eq(slaPolicies.id, id));
  }

  // Config methods - Value Sets
  async getValueSets(): Promise<ValueSet[]> {
    return await db.select().from(valueSets);
  }

  async getValueSet(key: string): Promise<ValueSet | undefined> {
    const [valueSet] = await db.select().from(valueSets).where(eq(valueSets.key, key));
    return valueSet || undefined;
  }

  async createValueSet(insertValueSet: InsertValueSet): Promise<ValueSet> {
    const [valueSet] = await db
      .insert(valueSets)
      .values(insertValueSet)
      .returning();
    return valueSet;
  }

  async updateValueSet(id: string, updates: Partial<InsertValueSet>): Promise<ValueSet> {
    const [valueSet] = await db
      .update(valueSets)
      .set(updates)
      .where(eq(valueSets.id, id))
      .returning();
    return valueSet;
  }

  async deleteValueSet(id: string): Promise<void> {
    await db.delete(valueSets).where(eq(valueSets.id, id));
  }

  // Config methods - Feature Flags
  async getFeatureFlags(): Promise<FeatureFlag[]> {
    return await db.select().from(featureFlags);
  }

  async getFeatureFlag(key: string): Promise<FeatureFlag | undefined> {
    const [flag] = await db.select().from(featureFlags).where(eq(featureFlags.key, key));
    return flag || undefined;
  }

  async createFeatureFlag(insertFlag: InsertFeatureFlag): Promise<FeatureFlag> {
    const [flag] = await db
      .insert(featureFlags)
      .values(insertFlag)
      .returning();
    return flag;
  }

  async updateFeatureFlag(id: string, updates: Partial<InsertFeatureFlag>): Promise<FeatureFlag> {
    const [flag] = await db
      .update(featureFlags)
      .set(updates)
      .where(eq(featureFlags.id, id))
      .returning();
    return flag;
  }

  async deleteFeatureFlag(id: string): Promise<void> {
    await db.delete(featureFlags).where(eq(featureFlags.id, id));
  }

  // Admin methods for getting all rules (not tied to categories)
  async getAllPriorityRules(): Promise<PriorityRule[]> {
    return await db.select().from(priorityRules).orderBy(asc(priorityRules.name));
  }

  async getAllTagRules(): Promise<TagRule[]> {
    return await db.select().from(tagRules).orderBy(asc(tagRules.name));
  }

  async getAllSlaPolicies(): Promise<SlaPolicy[]> {
    return await db.select().from(slaPolicies).orderBy(asc(slaPolicies.name));
  }
}

export const storage = new DatabaseStorage();
