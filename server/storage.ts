import { 
  users, 
  customers, 
  cases, 
  checklistItems, 
  documents, 
  resolutions, 
  flags, 
  auditLogs,
  caseNotes,
  caseOriginations,
  caseTypes,
  caseTypeOriginations,
  categories,
  categoryCaseTypes,
  checklistTemplates,
  reusableChecklistTemplates,
  reusableChecklistItems,
  checklistAssignmentRules,
  documentRequirements,
  priorityRules,
  tagRules,
  resolutionConfigs,
  dispositions,
  subDispositions,
  policyViolationOptions,
  slaPolicies,
  valueSets,
  configAudits,
  featureFlags,
  webhooks,
  integrations,
  kbCategories,
  kbArticles,
  kbArticleVersions,
  kbChangeEvents,
  kbArticleLinks,
  lenders,
  type User, 
  type InsertUser,
  type UpsertUser,
  type Customer,
  type InsertCustomer,
  type Lender,
  type InsertLender,
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
  type CaseNote,
  type InsertCaseNote,
  type CaseOrigination,
  type InsertCaseOrigination,
  type CaseType,
  type InsertCaseType,
  type CaseTypeOrigination,
  type InsertCaseTypeOrigination,
  type Category,
  type InsertCategory,
  type CategoryCaseType,
  type InsertCategoryCaseType,
  type ChecklistTemplate,
  type InsertChecklistTemplate,
  type ReusableChecklistTemplate,
  type InsertReusableChecklistTemplate,
  type ReusableChecklistItem,
  type InsertReusableChecklistItem,
  type ChecklistAssignmentRule,
  type InsertChecklistAssignmentRule,
  type DocumentRequirement,
  type InsertDocumentRequirement,
  type PriorityRule,
  type InsertPriorityRule,
  type TagRule,
  type InsertTagRule,
  type ResolutionConfig,
  type InsertResolutionConfig,
  type Disposition,
  type InsertDisposition,
  type SubDisposition,
  type InsertSubDisposition,
  type PolicyViolationOption,
  type InsertPolicyViolationOption,
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
  type InsertIntegration,
  type KbCategory,
  type InsertKbCategory,
  type KbArticle,
  type InsertKbArticle,
  type KbArticleVersion,
  type InsertKbArticleVersion,
  type KbChangeEvent,
  type InsertKbChangeEvent,
  type KbArticleLink,
  type InsertKbArticleLink
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, ilike, or, sql, inArray, gte } from "drizzle-orm";
import { RuleEvaluator, findMatchingPriorityRule, findMatchingTagRules, type CaseData } from "./rule-engine";
import session from "express-session";
import ConnectPgSession from "connect-pg-simple";

// Dashboard statistics interface
export interface DashboardStats {
  totalCases: number;
  openCases: number;
  inProgressCases: number;
  resolvedToday: number;
  slaBreaches: number;
  averageResolutionTime: string;
  recentCases: Case[];
  slaAlerts: { caseId: string; customerName: string; hoursRemaining: number; }[];
}

// Dynamic checklist item combining template item with completion state
export interface DynamicChecklistItem {
  key: string;
  label: string;
  description?: string | null;
  isRequired: boolean;
  sortOrder: number;
  helpText?: string | null;
  estimatedDuration?: number | null;
  templateId: string;
  templateName: string;
  // Field type support
  fieldType: 'checkbox' | 'dropdown' | 'text' | 'number' | 'date' | 'file';
  fieldOptions?: string[] | null;
  defaultValue?: string | null;
  // Completion state fields
  completed: boolean;
  completedAt?: Date | null;
  assignedToUserId?: string | null;
  checklistItemId?: string | null; // ID from checklistItems table if exists
  fieldValue?: string | null; // The actual value stored for this field
}

export interface IStorage {
  // Authentication
  sessionStore: session.SessionStore;
  
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<InsertUser>): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Customer methods
  getCustomer(id: string): Promise<Customer | undefined>;
  getCustomers(filters?: { limit?: number; offset?: number }): Promise<Customer[]>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  findCustomerByName(name: string): Promise<Customer[]>;
  
  // Lender methods
  getLenders(): Promise<Lender[]>;
  getLender(id: string): Promise<Lender | undefined>;
  createLender(lender: InsertLender): Promise<Lender>;
  updateLender(id: string, updates: Partial<InsertLender>): Promise<Lender>;
  deleteLender(id: string): Promise<void>;
  
  // Case methods
  getCase(id: string): Promise<Case | undefined>;
  getCases(filters?: { 
    status?: string; 
    priorityValue?: string; 
    priorityRuleId?: string;
    caseTypeId?: string; 
    categoryId?: string;
    customerId?: string;
    assignedToUserId?: string;
    limit?: number;
    offset?: number;
  }): Promise<Case[]>;
  createCase(caseData: InsertCase): Promise<Case>;
  updateCase(id: string, updates: Partial<InsertCase>): Promise<Case>;
  assignCase(id: string, assignedToUserId: string | null, actorUserId: string): Promise<Case>;
  getAvailableAssignees(): Promise<User[]>;
  
  // Case notes methods
  getCaseNotes(caseId: string): Promise<Array<CaseNote & { authorUser: { name: string; role: string } }>>;
  createCaseNote(noteData: InsertCaseNote): Promise<CaseNote>;
  updateCaseNote(id: string, updates: Partial<InsertCaseNote>): Promise<CaseNote>;
  
  // Checklist methods
  getChecklistItems(caseId: string): Promise<ChecklistItem[]>;
  createChecklistItem(item: InsertChecklistItem): Promise<ChecklistItem>;
  updateChecklistItem(id: string, updates: Partial<InsertChecklistItem>): Promise<ChecklistItem>;
  evaluateDynamicChecklist(caseId: string): Promise<DynamicChecklistItem[]>;
  
  // Document methods
  getDocuments(caseId: string): Promise<Document[]>;
  getDocument(id: string): Promise<Document | undefined>;
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
  
  // Config methods - Case Originations
  getCaseOriginations(): Promise<CaseOrigination[]>;
  getCaseOrigination(id: string): Promise<CaseOrigination | undefined>;
  createCaseOrigination(caseOrigination: InsertCaseOrigination): Promise<CaseOrigination>;
  updateCaseOrigination(id: string, updates: Partial<InsertCaseOrigination>): Promise<CaseOrigination>;
  deleteCaseOrigination(id: string): Promise<void>;

  // Config methods - Case Types
  getCaseTypes(caseOriginationId?: string): Promise<CaseType[]>;
  getCaseType(id: string): Promise<CaseType | undefined>;
  createCaseType(caseType: InsertCaseType, originationIds?: string[]): Promise<CaseType>;
  updateCaseType(id: string, updates: Partial<InsertCaseType>, originationIds?: string[]): Promise<CaseType>;
  deleteCaseType(id: string): Promise<void>;
  getCaseTypeWithOriginations(id: string): Promise<CaseType & { originations: CaseOrigination[] }>;
  
  // Config methods - Categories  
  getCategories(caseTypeId?: string): Promise<Category[]>;
  getCategory(id: string): Promise<Category | undefined>;
  createCategory(category: InsertCategory, caseTypeIds?: string[]): Promise<Category>;
  updateCategory(id: string, updates: Partial<InsertCategory>, caseTypeIds?: string[]): Promise<Category>;
  deleteCategory(id: string): Promise<void>;
  getCategoryWithCaseTypes(id: string): Promise<Category & { caseTypes: CaseType[] }>;
  
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
  
  // Config methods - Dispositions
  getDispositions(): Promise<Disposition[]>;
  getDisposition(id: string): Promise<Disposition | undefined>;
  createDisposition(disposition: InsertDisposition): Promise<Disposition>;
  updateDisposition(id: string, updates: Partial<InsertDisposition>): Promise<Disposition>;
  deleteDisposition(id: string): Promise<void>;
  
  // Config methods - Sub-Dispositions
  getSubDispositions(dispositionId?: string): Promise<SubDisposition[]>;
  getSubDisposition(id: string): Promise<SubDisposition | undefined>;
  createSubDisposition(subDisposition: InsertSubDisposition): Promise<SubDisposition>;
  updateSubDisposition(id: string, updates: Partial<InsertSubDisposition>): Promise<SubDisposition>;
  deleteSubDisposition(id: string): Promise<void>;
  
  // Config methods - Policy Violation Options
  getPolicyViolationOptions(): Promise<PolicyViolationOption[]>;
  getPolicyViolationOption(id: string): Promise<PolicyViolationOption | undefined>;
  createPolicyViolationOption(option: InsertPolicyViolationOption): Promise<PolicyViolationOption>;
  updatePolicyViolationOption(id: string, updates: Partial<InsertPolicyViolationOption>): Promise<PolicyViolationOption>;
  deletePolicyViolationOption(id: string): Promise<void>;
  
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
  
  // Dashboard methods
  getDashboardStats(): Promise<DashboardStats>;

  // Reporting methods
  getCaseVolumeReport(filters?: { startDate?: Date; endDate?: Date }): Promise<{
    byStatus: Array<{ status: string; count: number }>;
    byType: Array<{ typeName: string; typeId: string; count: number }>;
    byCategory: Array<{ categoryName: string; categoryId: string; count: number }>;
    byOrigination: Array<{ originationName: string; originationId: string; count: number }>;
    byPriority: Array<{ priorityValue: string; count: number }>;
    dailyTrend: Array<{ date: string; count: number }>;
    total: number;
  }>;
  
  getAgentPerformanceReport(filters?: { startDate?: Date; endDate?: Date }): Promise<Array<{
    userId: string;
    userName: string;
    role: string;
    totalAssigned: number;
    resolved: number;
    avgResolutionTimeHours: number | null;
    completionRate: number;
  }>>;
  
  getSlaComplianceReport(filters?: { startDate?: Date; endDate?: Date }): Promise<{
    totalCases: number;
    withinSla: number;
    breachedSla: number;
    complianceRate: number;
    avgResolutionTimeHours: number | null;
    casesByAge: Array<{ ageRange: string; count: number }>;
  }>;
  
  getResolutionPatternsReport(filters?: { startDate?: Date; endDate?: Date }): Promise<{
    byDisposition: Array<{ disposition: string; count: number; avgAmount: number | null }>;
    avgSettlementAmount: number | null;
    avgForgivenAmount: number | null;
    totalSettlementAmount: number | null;
    totalForgivenAmount: number | null;
    policyViolations: Array<{ type: string; count: number }>;
  }>;
  
  getLenderAnalyticsReport(filters?: { startDate?: Date; endDate?: Date }): Promise<Array<{
    lenderId: string;
    lenderName: string;
    totalCases: number;
    openCases: number;
    resolvedCases: number;
    avgResolutionTimeHours: number | null;
  }>>;

  // Knowledge Base methods
  // Categories
  getKbCategories(parentId?: string): Promise<KbCategory[]>;
  getKbCategory(id: string): Promise<KbCategory | undefined>;
  getKbCategoryBySlug(slug: string): Promise<KbCategory | undefined>;
  createKbCategory(category: InsertKbCategory): Promise<KbCategory>;
  updateKbCategory(id: string, updates: Partial<InsertKbCategory>): Promise<KbCategory>;
  deleteKbCategory(id: string): Promise<void>;
  
  // Articles
  getKbArticles(filters?: { 
    categoryId?: string; 
    status?: string; 
    visibility?: string; 
    tags?: string[];
    search?: string;
    limit?: number; 
    offset?: number; 
  }): Promise<Array<KbArticle & { categoryName?: string; authorName?: string }>>;
  getKbArticle(id: string): Promise<KbArticle | undefined>;
  getKbArticleBySlug(slug: string): Promise<KbArticle | undefined>;
  createKbArticle(article: InsertKbArticle): Promise<KbArticle>;
  updateKbArticle(id: string, updates: Partial<InsertKbArticle>): Promise<KbArticle>;
  deleteKbArticle(id: string): Promise<void>;
  publishKbArticle(id: string, publishedBy: string): Promise<KbArticle>;
  incrementKbArticleViews(id: string): Promise<void>;
  searchKbArticles(query: string, filters?: { visibility?: string; categoryId?: string }): Promise<Array<KbArticle & { categoryName?: string }>>;
  
  // Article Versions
  getKbArticleVersions(articleId: string): Promise<KbArticleVersion[]>;
  getKbArticleVersion(id: string): Promise<KbArticleVersion | undefined>;
  createKbArticleVersion(version: InsertKbArticleVersion): Promise<KbArticleVersion>;
  getLatestKbArticleVersion(articleId: string): Promise<KbArticleVersion | undefined>;
  
  // Change Events  
  getKbChangeEvents(filters?: { 
    eventType?: string; 
    entityType?: string; 
    isProcessed?: boolean;
    limit?: number; 
    offset?: number; 
  }): Promise<KbChangeEvent[]>;
  createKbChangeEvent(event: InsertKbChangeEvent): Promise<KbChangeEvent>;
  markKbChangeEventProcessed(id: string, relatedArticleId?: string): Promise<KbChangeEvent>;
  getUnprocessedKbChangeEvents(): Promise<KbChangeEvent[]>;
  
  // Article Links
  getKbArticleLinks(articleId: string): Promise<KbArticleLink[]>;
  getKbLinkedArticles(entityType: string, entityId: string): Promise<Array<KbArticleLink & { articleTitle: string; articleSlug: string }>>;
  createKbArticleLink(link: InsertKbArticleLink): Promise<KbArticleLink>;
  deleteKbArticleLink(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.SessionStore;

  constructor() {
    // Set up session store with PostgreSQL
    const PostgresSessionStore = ConnectPgSession(session);
    this.sessionStore = new PostgresSessionStore({
      conString: process.env.DATABASE_URL,
      tableName: "sessions",
      createTableIfMissing: false, // We already have the sessions table
    });
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
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

  // Lender methods
  async getLenders(): Promise<Lender[]> {
    return await db.select().from(lenders).orderBy(asc(lenders.name));
  }

  async getLender(id: string): Promise<Lender | undefined> {
    const [lender] = await db.select().from(lenders).where(eq(lenders.id, id));
    return lender || undefined;
  }

  async createLender(insertLender: InsertLender): Promise<Lender> {
    const [lender] = await db
      .insert(lenders)
      .values({
        ...insertLender,
        updatedAt: new Date()
      })
      .returning();
    return lender;
  }

  async updateLender(id: string, updates: Partial<InsertLender>): Promise<Lender> {
    const [lender] = await db
      .update(lenders)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(lenders.id, id))
      .returning();
    return lender;
  }

  async deleteLender(id: string): Promise<void> {
    await db.delete(lenders).where(eq(lenders.id, id));
  }

  // Case methods
  async getCase(id: string): Promise<Case | undefined> {
    const [caseRecord] = await db.select().from(cases).where(eq(cases.id, id));
    return caseRecord || undefined;
  }

  async getCaseWithDetails(id: string): Promise<any | undefined> {
    const result = await db
      .select({
        // Case fields
        id: cases.id,
        caseNumber: cases.caseNumber,
        caseTypeId: cases.caseTypeId,
        categoryId: cases.categoryId,
        priorityRuleId: cases.priorityRuleId,
        customerId: cases.customerId,
        assignedToUserId: cases.assignedToUserId,
        loanId: cases.loanId,
        lenderId: cases.lenderId,
        state: cases.state,
        details: cases.details,
        status: cases.status,
        hasRepresentative: cases.hasRepresentative,
        representativeCompanyName: cases.representativeCompanyName,
        representativePersonName: cases.representativePersonName,
        representativeAddress: cases.representativeAddress,
        representativeEmail: cases.representativeEmail,
        representativePhone: cases.representativePhone,
        createdAt: cases.createdAt,
        updatedAt: cases.updatedAt,
        
        // Customer fields
        customerName: customers.name,
        customerState: customers.state,
        
        // Lender fields
        lenderName: lenders.name,
        lenderDba: lenders.dba,
        lenderContactPerson: lenders.contactPerson,
        
        // Case type fields
        caseTypeName: caseTypes.name,
        caseTypeColor: caseTypes.color,
        
        // Case origination fields
        caseOriginationId: cases.caseOriginationId,
        caseOriginationName: caseOriginations.name,
        caseOriginationDescription: caseOriginations.description,
        
        // Category fields
        categoryName: categories.name,
        categoryCode: categories.code,
        
        // Priority rule fields
        priorityValue: priorityRules.priorityValue,
        priorityDescription: priorityRules.description,
        
        // Assigned user fields
        assignedUserName: users.name,
        assignedUserEmail: users.email,
        assignedUserRole: users.role,
      })
      .from(cases)
      .leftJoin(customers, eq(cases.customerId, customers.id))
      .leftJoin(lenders, eq(cases.lenderId, lenders.id))
      .leftJoin(caseTypes, eq(cases.caseTypeId, caseTypes.id))
      .leftJoin(caseOriginations, eq(cases.caseOriginationId, caseOriginations.id))
      .leftJoin(categories, eq(cases.categoryId, categories.id))
      .leftJoin(priorityRules, eq(cases.priorityRuleId, priorityRules.id))
      .leftJoin(users, eq(cases.assignedToUserId, users.id))
      .where(eq(cases.id, id))
      .limit(1);

    return result[0] || undefined;
  }

  async getCaseForRuleEvaluation(id: string): Promise<import("./rule-engine").CaseData | undefined> {
    const result = await db
      .select({
        details: cases.details,
        loanId: cases.loanId,
        lenderName: lenders.name,
        state: cases.state,
        status: cases.status,
        hasRepresentative: cases.hasRepresentative,
        representativeCompanyName: cases.representativeCompanyName,
        representativePersonName: cases.representativePersonName,
        representativeAddress: cases.representativeAddress,
        representativeEmail: cases.representativeEmail,
        representativePhone: cases.representativePhone,
        createdAt: cases.createdAt,
        updatedAt: cases.updatedAt,
        customerName: customers.name,
        customerState: customers.state,
        categoryCode: categories.code,
        categoryName: categories.name,
        caseTypeName: caseTypes.name,
        settlementAmount: sql<number | null>`NULL`,
        forgivenAmount: sql<number | null>`NULL`,
      })
      .from(cases)
      .leftJoin(customers, eq(cases.customerId, customers.id))
      .leftJoin(lenders, eq(cases.lenderId, lenders.id))
      .leftJoin(categories, eq(cases.categoryId, categories.id))
      .leftJoin(caseTypes, eq(cases.caseTypeId, caseTypes.id))
      .where(eq(cases.id, id))
      .limit(1);

    const row = result[0];
    if (!row) {
      return undefined;
    }

    // Map nullable fields to non-null values required by CaseData interface
    return {
      details: row.details,
      loanId: row.loanId ?? null,
      lenderName: row.lenderName ?? null,
      state: row.state,
      status: row.status,
      hasRepresentative: row.hasRepresentative,
      representativeCompanyName: row.representativeCompanyName ?? null,
      representativePersonName: row.representativePersonName ?? null,
      representativeAddress: row.representativeAddress ?? null,
      representativeEmail: row.representativeEmail ?? null,
      representativePhone: row.representativePhone ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      customerName: row.customerName || '',
      customerState: row.customerState || '',
      categoryCode: row.categoryCode || '',
      categoryName: row.categoryName || '',
      caseTypeName: row.caseTypeName || '',
      settlementAmount: row.settlementAmount ?? null,
      forgivenAmount: row.forgivenAmount ?? null,
    };
  }

  // Update case status
  async updateCaseStatus(caseId: string, status: "open" | "in_progress" | "resolved", actorUserId: string) {
    // First, update the case status
    const updatedCase = await db
      .update(cases)
      .set({ 
        status,
        updatedAt: new Date()
      })
      .where(eq(cases.id, caseId))
      .returning();

    if (updatedCase.length === 0) {
      throw new Error("Case not found");
    }

    // Log the status change in audit log
    await db.insert(auditLogs).values({
      caseId,
      actorUserId,
      action: "case_status_changed",
      details: {
        newStatus: status,
        timestamp: new Date().toISOString()
      }
    });

    return updatedCase[0];
  }

  async getCases(filters?: { 
    status?: string; 
    priorityValue?: string; 
    priorityRuleId?: string;
    caseTypeId?: string; 
    categoryId?: string;
    customerId?: string;
    assignedToUserId?: string;
    limit?: number;
    offset?: number;
  }): Promise<Case[]> {
    const conditions = [];
    
    if (filters?.status) conditions.push(eq(cases.status, filters.status as any));
    if (filters?.priorityRuleId) conditions.push(eq(cases.priorityRuleId, filters.priorityRuleId));
    if (filters?.caseTypeId) conditions.push(eq(cases.caseTypeId, filters.caseTypeId));
    if (filters?.categoryId) conditions.push(eq(cases.categoryId, filters.categoryId));
    if (filters?.customerId) conditions.push(eq(cases.customerId, filters.customerId));
    if (filters?.assignedToUserId) conditions.push(eq(cases.assignedToUserId, filters.assignedToUserId));
    
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

  async getCasesWithDetails(filters?: { 
    status?: string; 
    priorityValue?: string; 
    priorityRuleId?: string;
    caseTypeId?: string; 
    categoryId?: string;
    customerId?: string;
    assignedToUserId?: string;
    search?: string;
    sortField?: string;
    sortDirection?: string;
    limit?: number;
    offset?: number;
  }): Promise<any[]> {
    const conditions = [];
    
    if (filters?.status) conditions.push(eq(cases.status, filters.status as any));
    if (filters?.priorityRuleId) conditions.push(eq(cases.priorityRuleId, filters.priorityRuleId));
    if (filters?.caseTypeId) conditions.push(eq(cases.caseTypeId, filters.caseTypeId));
    if (filters?.categoryId) conditions.push(eq(cases.categoryId, filters.categoryId));
    if (filters?.customerId) conditions.push(eq(cases.customerId, filters.customerId));
    if (filters?.assignedToUserId) conditions.push(eq(cases.assignedToUserId, filters.assignedToUserId));
    
    // If filtering by priority value, add condition using inArray with subquery
    if (filters?.priorityValue) {
      const priorityRuleIds = db.select({ id: priorityRules.id })
        .from(priorityRules)
        .where(eq(priorityRules.priorityValue, filters.priorityValue));
      conditions.push(inArray(cases.priorityRuleId, priorityRuleIds));
    }

    // Add search functionality across multiple fields
    if (filters?.search) {
      const searchTerm = `%${filters.search.toLowerCase()}%`;
      conditions.push(
        or(
          sql`LOWER(${customers.name}) LIKE ${searchTerm}`,
          sql`LOWER(${cases.details}) LIKE ${searchTerm}`,
          sql`LOWER(${cases.loanId}) LIKE ${searchTerm}`,
          sql`LOWER(${caseTypes.name}) LIKE ${searchTerm}`,
          sql`LOWER(${categories.name}) LIKE ${searchTerm}`,
          sql`LOWER(${lenders.name}) LIKE ${searchTerm}`
        )
      );
    }
    
    let baseQuery = db
      .select({
        // Case fields
        id: cases.id,
        caseNumber: cases.caseNumber,
        caseTypeId: cases.caseTypeId,
        categoryId: cases.categoryId,
        priorityRuleId: cases.priorityRuleId,
        customerId: cases.customerId,
        assignedToUserId: cases.assignedToUserId,
        loanId: cases.loanId,
        lenderId: cases.lenderId,
        state: cases.state,
        details: cases.details,
        status: cases.status,
        createdAt: cases.createdAt,
        updatedAt: cases.updatedAt,
        
        // Customer fields
        customerName: customers.name,
        customerState: customers.state,
        
        // Lender fields
        lenderName: lenders.name,
        
        // Case type fields
        caseTypeName: caseTypes.name,
        caseTypeColor: caseTypes.color,
        
        // Category fields
        categoryName: categories.name,
        categoryCode: categories.code,
        
        // Priority rule fields
        priorityValue: priorityRules.priorityValue,
        priorityDescription: priorityRules.description,
        
        // Assigned user fields
        assignedUserName: users.name,
        assignedUserEmail: users.email,
        assignedUserRole: users.role,
      })
      .from(cases)
      .leftJoin(customers, eq(cases.customerId, customers.id))
      .leftJoin(lenders, eq(cases.lenderId, lenders.id))
      .leftJoin(caseTypes, eq(cases.caseTypeId, caseTypes.id))
      .leftJoin(categories, eq(cases.categoryId, categories.id))
      .leftJoin(priorityRules, eq(cases.priorityRuleId, priorityRules.id))
      .leftJoin(users, eq(cases.assignedToUserId, users.id));
    
    if (conditions.length > 0) {
      baseQuery = baseQuery.where(and(...conditions));
    }
    
    // Handle sorting
    const sortField = filters?.sortField || "createdAt";
    const sortDirection = filters?.sortDirection || "desc";
    
    let orderByClause;
    switch (sortField) {
      case "customerName":
        orderByClause = sortDirection === "asc" ? asc(customers.name) : desc(customers.name);
        break;
      case "status":
        orderByClause = sortDirection === "asc" ? asc(cases.status) : desc(cases.status);
        break;
      case "priorityValue":
        orderByClause = sortDirection === "asc" ? asc(priorityRules.priorityValue) : desc(priorityRules.priorityValue);
        break;
      case "updatedAt":
        orderByClause = sortDirection === "asc" ? asc(cases.updatedAt) : desc(cases.updatedAt);
        break;
      case "createdAt":
      default:
        orderByClause = sortDirection === "asc" ? asc(cases.createdAt) : desc(cases.createdAt);
        break;
    }
    
    baseQuery = baseQuery.orderBy(orderByClause);
    
    if (filters?.limit) {
      baseQuery = baseQuery.limit(filters.limit);
    }
    
    if (filters?.offset) {
      baseQuery = baseQuery.offset(filters.offset);
    }
    
    return await baseQuery.execute();
  }

  async createCase(insertCase: InsertCase): Promise<Case> {
    // First, get customer, category, case type, and optionally lender info for rule evaluation
    const customer = await db
      .select()
      .from(customers)
      .where(eq(customers.id, insertCase.customerId))
      .limit(1);
    
    const category = await db
      .select()
      .from(categories)
      .where(eq(categories.id, insertCase.categoryId))
      .limit(1);
    
    const caseType = await db
      .select()
      .from(caseTypes)
      .where(eq(caseTypes.id, insertCase.caseTypeId))
      .limit(1);

    if (customer.length === 0 || category.length === 0 || caseType.length === 0) {
      throw new Error("Customer, category, or case type not found");
    }

    // Fetch lender name if lenderId is provided
    let lenderName: string | null = null;
    if (insertCase.lenderId) {
      const lender = await db
        .select()
        .from(lenders)
        .where(eq(lenders.id, insertCase.lenderId))
        .limit(1);
      lenderName = lender.length > 0 ? lender[0].name : null;
    }

    // Prepare case data for rule evaluation
    const now = new Date();
    const caseData: CaseData = {
      details: insertCase.details,
      loanId: insertCase.loanId || null,
      lenderName: lenderName,
      state: insertCase.state,
      status: insertCase.status || 'open',
      hasRepresentative: insertCase.hasRepresentative || false,
      representativeCompanyName: insertCase.representativeCompanyName || null,
      representativePersonName: insertCase.representativePersonName || null,
      representativeAddress: insertCase.representativeAddress || null,
      representativeEmail: insertCase.representativeEmail || null,
      representativePhone: insertCase.representativePhone || null,
      createdAt: now,
      updatedAt: now,
      
      // Customer fields
      customerName: customer[0].name,
      customerState: customer[0].state,
      
      // Category/Type fields  
      categoryCode: category[0].code,
      categoryName: category[0].name,
      caseTypeName: caseType[0].name,
      
      // Resolution fields (null for new cases)
      settlementAmount: null,
      forgivenAmount: null
    };

    // Load and evaluate priority rules for this category
    const priorityRulesForCategory = await db
      .select()
      .from(priorityRules)
      .where(and(
        eq(priorityRules.categoryId, insertCase.categoryId),
        eq(priorityRules.isActive, true)
      ));

    let finalPriorityRuleId = insertCase.priorityRuleId;
    if (priorityRulesForCategory.length > 0) {
      const matchingPriorityRuleId = findMatchingPriorityRule(priorityRulesForCategory, caseData);
      if (matchingPriorityRuleId) {
        finalPriorityRuleId = matchingPriorityRuleId;
      }
    }

    // Load and evaluate tag rules for this category
    const tagRulesForCategory = await db
      .select()
      .from(tagRules)
      .where(and(
        eq(tagRules.categoryId, insertCase.categoryId),
        eq(tagRules.isActive, true)
      ));

    // Start with any user-provided tags
    let finalTags: string[] = insertCase.tags ? [...insertCase.tags] : [];
    
    // Add rule-derived tags
    if (tagRulesForCategory.length > 0) {
      const ruleDerivedTags = findMatchingTagRules(tagRulesForCategory, caseData);
      finalTags.push(...ruleDerivedTags);
    }
    
    // Remove duplicates
    finalTags = Array.from(new Set(finalTags));

    // Create the case with evaluated priority and tags
    const [caseRecord] = await db
      .insert(cases)
      .values({
        ...insertCase,
        priorityRuleId: finalPriorityRuleId,
        tags: finalTags,
        updatedAt: now
      })
      .returning();
    
    return caseRecord;
  }

  async updateCase(id: string, updates: Partial<InsertCase>): Promise<Case> {
    // First get the current case to check if we need rule re-evaluation
    const currentCase = await db
      .select()
      .from(cases)
      .where(eq(cases.id, id))
      .limit(1);

    if (currentCase.length === 0) {
      throw new Error("Case not found");
    }

    // Check if significant fields changed that might affect rule evaluation
    const significantFieldsChanged = [
      'details', 'state', 'status', 'hasRepresentative', 'representativeCompanyName',
      'lenderId', 'loanId', 'categoryId', 'customerId'
    ].some(field => updates[field as keyof InsertCase] !== undefined);

    let finalUpdates = { ...updates, updatedAt: new Date() };

    // Re-evaluate rules if significant fields changed
    if (significantFieldsChanged) {
      // Get updated case data for rule evaluation
      const mergedCaseData = { ...currentCase[0], ...updates };

      // Get customer, category, and case type info for rule evaluation
      const customer = await db
        .select()
        .from(customers)
        .where(eq(customers.id, mergedCaseData.customerId))
        .limit(1);
      
      const category = await db
        .select()
        .from(categories)
        .where(eq(categories.id, mergedCaseData.categoryId))
        .limit(1);
      
      const caseType = await db
        .select()
        .from(caseTypes)
        .where(eq(caseTypes.id, mergedCaseData.caseTypeId))
        .limit(1);

      if (customer.length > 0 && category.length > 0 && caseType.length > 0) {
        // Fetch lender name if lenderId is provided
        let lenderName = null;
        if (mergedCaseData.lenderId) {
          const lender = await db
            .select()
            .from(lenders)
            .where(eq(lenders.id, mergedCaseData.lenderId))
            .limit(1);
          if (lender.length > 0) {
            lenderName = lender[0].name;
          }
        }
        
        // Prepare case data for rule evaluation
        const caseData: CaseData = {
          details: mergedCaseData.details,
          loanId: mergedCaseData.loanId || null,
          lenderName: lenderName,
          state: mergedCaseData.state,
          status: mergedCaseData.status,
          hasRepresentative: mergedCaseData.hasRepresentative || false,
          representativeCompanyName: mergedCaseData.representativeCompanyName || null,
          representativePersonName: mergedCaseData.representativePersonName || null,
          representativeAddress: mergedCaseData.representativeAddress || null,
          representativeEmail: mergedCaseData.representativeEmail || null,
          representativePhone: mergedCaseData.representativePhone || null,
          createdAt: currentCase[0].createdAt,
          updatedAt: new Date(),
          
          // Customer fields
          customerName: customer[0].name,
          customerState: customer[0].state,
          
          // Category/Type fields  
          categoryCode: category[0].code,
          categoryName: category[0].name,
          caseTypeName: caseType[0].name,
          
          // Resolution fields (could be updated)
          settlementAmount: null, // TODO: Add settlement data if needed
          forgivenAmount: null
        };

        // Load and evaluate priority rules for this category
        const priorityRulesForCategory = await db
          .select()
          .from(priorityRules)
          .where(and(
            eq(priorityRules.categoryId, mergedCaseData.categoryId),
            eq(priorityRules.isActive, true)
          ));

        if (priorityRulesForCategory.length > 0) {
          const matchingPriorityRuleId = findMatchingPriorityRule(priorityRulesForCategory, caseData);
          if (matchingPriorityRuleId) {
            finalUpdates.priorityRuleId = matchingPriorityRuleId;
          }
        }

        // Load and evaluate tag rules for this category
        const tagRulesForCategory = await db
          .select()
          .from(tagRules)
          .where(and(
            eq(tagRules.categoryId, mergedCaseData.categoryId),
            eq(tagRules.isActive, true)
          ));

        if (tagRulesForCategory.length > 0) {
          const ruleDerivedTags = findMatchingTagRules(tagRulesForCategory, caseData);
          // Merge rule-derived tags with existing tags (don't overwrite)
          const existingTags = currentCase[0].tags || [];
          const userProvidedTags = updates.tags || [];
          const allTags = [...existingTags, ...userProvidedTags, ...ruleDerivedTags];
          finalUpdates.tags = Array.from(new Set(allTags)); // Remove duplicates
        }
      }
    }

    const [caseRecord] = await db
      .update(cases)
      .set(finalUpdates)
      .where(eq(cases.id, id))
      .returning();
    
    return caseRecord;
  }

  async assignCase(id: string, assignedToUserId: string | null, actorUserId: string): Promise<Case> {
    // Update the case assignment
    const updatedCases = await db
      .update(cases)
      .set({ 
        assignedToUserId,
        updatedAt: new Date()
      })
      .where(eq(cases.id, id))
      .returning();

    if (updatedCases.length === 0) {
      throw new Error("Case not found");
    }

    // Log the assignment change in audit log
    await db.insert(auditLogs).values({
      caseId: id,
      actorUserId,
      action: "case_assigned",
      details: {
        assignedToUserId,
        timestamp: new Date().toISOString()
      }
    });

    return updatedCases[0];
  }

  async getAvailableAssignees(): Promise<User[]> {
    // Return users with agent or compliance roles who are active
    return await db.select().from(users)
      .where(and(
        inArray(users.role, ["agent", "compliance"]),
        eq(users.status, "active")
      ))
      .orderBy(asc(users.name));
  }

  // Case notes methods
  async getCaseNotes(caseId: string): Promise<Array<CaseNote & { authorUser: { name: string; role: string } }>> {
    return await db.select({
      id: caseNotes.id,
      caseId: caseNotes.caseId,
      authorUserId: caseNotes.authorUserId,
      content: caseNotes.content,
      isPublic: caseNotes.isPublic,
      createdAt: caseNotes.createdAt,
      updatedAt: caseNotes.updatedAt,
      authorUser: {
        name: users.name,
        role: users.role,
      },
    })
    .from(caseNotes)
    .innerJoin(users, eq(caseNotes.authorUserId, users.id))
    .where(eq(caseNotes.caseId, caseId))
    .orderBy(desc(caseNotes.createdAt));
  }

  async createCaseNote(noteData: InsertCaseNote): Promise<CaseNote> {
    const [caseNote] = await db.insert(caseNotes).values(noteData).returning();
    return caseNote;
  }

  async updateCaseNote(id: string, updates: Partial<InsertCaseNote>): Promise<CaseNote> {
    const [caseNote] = await db
      .update(caseNotes)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(caseNotes.id, id))
      .returning();
    
    if (!caseNote) {
      throw new Error("Case note not found");
    }
    
    return caseNote;
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

  async evaluateDynamicChecklist(caseId: string): Promise<DynamicChecklistItem[]> {
    try {
      // Get the case with full details needed for rule evaluation
      const caseData = await this.getCaseForRuleEvaluation(caseId);
      if (!caseData) {
        console.warn(`Case ${caseId} not found for dynamic checklist evaluation`);
        return [];
      }

      // Get existing completion state from checklistItems table
      const completionState = await db.select().from(checklistItems)
        .where(eq(checklistItems.caseId, caseId));

      // Create a map of completion state by key
      const completionMap = new Map(
        completionState.map(item => [
          item.key,
          {
            completed: item.status === 'complete',
            completedAt: item.completedAt,
            assignedToUserId: item.assignedToUserId,
            checklistItemId: item.id,
            fieldValue: item.fieldValue
          }
        ])
      );

      // Track which templates have been assigned to avoid duplicates
      const assignedTemplateIds = new Set<string>();
      const dynamicItems: DynamicChecklistItem[] = [];
      const seenKeys = new Set<string>();

      // Helper function to add template items
      const addTemplateItems = (template: any) => {
        if (!template || !template.isActive || !template.items || template.items.length === 0) {
          return;
        }

        for (const templateItem of template.items) {
          // Skip if this key already exists
          if (seenKeys.has(templateItem.key)) {
            continue;
          }

          const completion = completionMap.get(templateItem.key);
          
          dynamicItems.push({
            key: templateItem.key,
            label: templateItem.label,
            description: templateItem.description,
            isRequired: templateItem.isRequired,
            sortOrder: templateItem.sortOrder,
            helpText: templateItem.helpText,
            estimatedDuration: templateItem.estimatedDuration,
            templateId: template.id,
            templateName: template.name,
            // Field type support
            fieldType: templateItem.fieldType || 'checkbox',
            fieldOptions: templateItem.fieldOptions || null,
            defaultValue: templateItem.defaultValue || null,
            // Completion state
            completed: completion?.completed ?? false,
            completedAt: completion?.completedAt ?? null,
            assignedToUserId: completion?.assignedToUserId ?? null,
            checklistItemId: completion?.checklistItemId ?? null,
            fieldValue: completion?.fieldValue ?? null
          });

          seenKeys.add(templateItem.key);
        }

        assignedTemplateIds.add(template.id);
      };

      // STEP 1: Load category-specific reusable templates (auto-apply templates)
      // These are templates with a categoryId that matches the case's category
      const categoryTemplates = await db.select().from(reusableChecklistTemplates)
        .where(and(
          eq(reusableChecklistTemplates.categoryId, caseData.categoryId),
          eq(reusableChecklistTemplates.isActive, true)
        ));

      for (const categoryTemplate of categoryTemplates) {
        if (assignedTemplateIds.has(categoryTemplate.id)) {
          continue;
        }

        try {
          const template = await this.getReusableChecklistTemplateWithItems(categoryTemplate.id);
          addTemplateItems(template);
        } catch (error) {
          console.error(`Error loading category template "${categoryTemplate.name}":`, error);
        }
      }

      // STEP 2: Evaluate business rules for additional templates
      const allRules = await this.getAllChecklistAssignmentRules();
      const activeRules = allRules.filter(rule => rule.isActive);

      for (const rule of activeRules) {
        if (!rule.conditions || !rule.reusableTemplateId || assignedTemplateIds.has(rule.reusableTemplateId)) {
          continue;
        }

        try {
          // Evaluate the rule conditions
          const matches = RuleEvaluator.evaluate(rule.conditions, caseData);

          if (matches) {
            const template = await this.getReusableChecklistTemplateWithItems(rule.reusableTemplateId);
            addTemplateItems(template);
          }
        } catch (error) {
          console.error(`Error evaluating checklist rule "${rule.name}":`, error);
        }
      }

      // Sort by sortOrder
      dynamicItems.sort((a, b) => a.sortOrder - b.sortOrder);

      return dynamicItems;
    } catch (error) {
      console.error(`Error evaluating dynamic checklist for case ${caseId}:`, error);
      throw error;
    }
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

  async getDocument(id: string): Promise<Document | undefined> {
    const [document] = await db.select().from(documents).where(eq(documents.id, id));
    return document || undefined;
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

  // Config methods - Case Originations
  async getCaseOriginations(): Promise<CaseOrigination[]> {
    return await db.select().from(caseOriginations).orderBy(caseOriginations.name);
  }

  async getCaseOrigination(id: string): Promise<CaseOrigination | undefined> {
    const [caseOrigination] = await db.select().from(caseOriginations).where(eq(caseOriginations.id, id));
    return caseOrigination || undefined;
  }

  async createCaseOrigination(insertCaseOrigination: InsertCaseOrigination): Promise<CaseOrigination> {
    const [caseOrigination] = await db
      .insert(caseOriginations)
      .values(insertCaseOrigination)
      .returning();
    return caseOrigination;
  }

  async updateCaseOrigination(id: string, updates: Partial<InsertCaseOrigination>): Promise<CaseOrigination> {
    const [caseOrigination] = await db
      .update(caseOriginations)
      .set(updates)
      .where(eq(caseOriginations.id, id))
      .returning();
    return caseOrigination;
  }

  async deleteCaseOrigination(id: string): Promise<void> {
    await db.delete(caseOriginations).where(eq(caseOriginations.id, id));
  }

  // Config methods - Case Types
  async getCaseTypes(caseOriginationId?: string): Promise<any[]> {
    if (caseOriginationId) {
      // Get case types filtered by origination
      const results = await db
        .select({
          id: caseTypes.id,
          name: caseTypes.name,
          description: caseTypes.description,
          color: caseTypes.color,
        })
        .from(caseTypes)
        .innerJoin(caseTypeOriginations, eq(caseTypes.id, caseTypeOriginations.caseTypeId))
        .where(eq(caseTypeOriginations.caseOriginationId, caseOriginationId));
      
      return results;
    }
    
    // Get all case types with their originations
    const allCaseTypes = await db.select().from(caseTypes);
    
    // For each case type, fetch its originations
    const caseTypesWithOriginations = await Promise.all(
      allCaseTypes.map(async (caseType) => {
        const originations = await db
          .select({
            id: caseOriginations.id,
            name: caseOriginations.name,
          })
          .from(caseOriginations)
          .innerJoin(caseTypeOriginations, eq(caseOriginations.id, caseTypeOriginations.caseOriginationId))
          .where(eq(caseTypeOriginations.caseTypeId, caseType.id));
        
        return {
          ...caseType,
          originations,
        };
      })
    );
    
    return caseTypesWithOriginations;
  }

  async getCaseType(id: string): Promise<CaseType | undefined> {
    const [caseType] = await db.select().from(caseTypes).where(eq(caseTypes.id, id));
    return caseType || undefined;
  }

  async getCaseTypeWithOriginations(id: string): Promise<CaseType & { originations: CaseOrigination[] }> {
    const caseType = await this.getCaseType(id);
    if (!caseType) {
      throw new Error("Case Type not found");
    }

    const originations = await db
      .select({
        id: caseOriginations.id,
        name: caseOriginations.name,
        description: caseOriginations.description,
        externalKey: caseOriginations.externalKey,
        createdAt: caseOriginations.createdAt,
        updatedAt: caseOriginations.updatedAt,
      })
      .from(caseOriginations)
      .innerJoin(caseTypeOriginations, eq(caseOriginations.id, caseTypeOriginations.caseOriginationId))
      .where(eq(caseTypeOriginations.caseTypeId, id));

    return { ...caseType, originations };
  }

  async createCaseType(insertCaseType: InsertCaseType, originationIds?: string[]): Promise<CaseType> {
    const [caseType] = await db
      .insert(caseTypes)
      .values(insertCaseType)
      .returning();
    
    // Create junction table entries if originationIds are provided
    if (originationIds && originationIds.length > 0) {
      await db.insert(caseTypeOriginations).values(
        originationIds.map(originationId => ({
          caseTypeId: caseType.id,
          caseOriginationId: originationId,
        }))
      );
    }
    
    return caseType;
  }

  async updateCaseType(id: string, updates: Partial<InsertCaseType>, originationIds?: string[]): Promise<CaseType> {
    const [caseType] = await db
      .update(caseTypes)
      .set(updates)
      .where(eq(caseTypes.id, id))
      .returning();
    
    // Update junction table entries if originationIds are provided
    if (originationIds !== undefined) {
      // Delete existing associations
      await db.delete(caseTypeOriginations).where(eq(caseTypeOriginations.caseTypeId, id));
      
      // Create new associations
      if (originationIds.length > 0) {
        await db.insert(caseTypeOriginations).values(
          originationIds.map(originationId => ({
            caseTypeId: id,
            caseOriginationId: originationId,
          }))
        );
      }
    }
    
    return caseType;
  }

  async getCasesCountByCaseType(caseTypeId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(cases)
      .where(eq(cases.caseTypeId, caseTypeId));
    return result[0]?.count || 0;
  }

  async getCategoriesCountByCaseType(caseTypeId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(categoryCaseTypes)
      .where(eq(categoryCaseTypes.caseTypeId, caseTypeId));
    return result[0]?.count || 0;
  }

  async getCaseTypeDependencies(caseTypeId: string): Promise<{casesCount: number, categoriesCount: number}> {
    const [casesResult, categoriesResult] = await Promise.all([
      db.select({ count: sql<number>`count(*)`.mapWith(Number) }).from(cases).where(eq(cases.caseTypeId, caseTypeId)),
      db.select({ count: sql<number>`count(*)`.mapWith(Number) }).from(categoryCaseTypes).where(eq(categoryCaseTypes.caseTypeId, caseTypeId))
    ]);
    
    return {
      casesCount: casesResult[0]?.count || 0,
      categoriesCount: categoriesResult[0]?.count || 0
    };
  }

  async deleteCaseType(id: string): Promise<void> {
    await db.delete(caseTypes).where(eq(caseTypes.id, id));
  }

  // Config methods - Categories
  async getCategories(caseTypeId?: string): Promise<Category[]> {
    if (caseTypeId) {
      // Get categories filtered by case type
      const results = await db
        .select({
          id: categories.id,
          name: categories.name,
          code: categories.code,
          description: categories.description,
          sortOrder: categories.sortOrder,
          version: categories.version,
          effectiveFrom: categories.effectiveFrom,
          effectiveTo: categories.effectiveTo,
        })
        .from(categories)
        .innerJoin(categoryCaseTypes, eq(categories.id, categoryCaseTypes.categoryId))
        .where(eq(categoryCaseTypes.caseTypeId, caseTypeId))
        .orderBy(asc(categories.sortOrder));
      
      return results;
    }
    
    // Get all categories
    return await db.select().from(categories)
      .orderBy(asc(categories.sortOrder));
  }

  async getCategory(id: string): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category || undefined;
  }

  async getCategoryWithCaseTypes(id: string): Promise<Category & { caseTypes: CaseType[] }> {
    const category = await this.getCategory(id);
    if (!category) {
      throw new Error("Category not found");
    }

    const caseTypesData = await db
      .select({
        id: caseTypes.id,
        name: caseTypes.name,
        description: caseTypes.description,
        color: caseTypes.color,
      })
      .from(caseTypes)
      .innerJoin(categoryCaseTypes, eq(caseTypes.id, categoryCaseTypes.caseTypeId))
      .where(eq(categoryCaseTypes.categoryId, id));

    return { ...category, caseTypes: caseTypesData };
  }

  async createCategory(insertCategory: InsertCategory, caseTypeIds?: string[]): Promise<Category> {
    const [category] = await db
      .insert(categories)
      .values(insertCategory)
      .returning();
    
    // Create junction table entries if caseTypeIds are provided
    if (caseTypeIds && caseTypeIds.length > 0) {
      await db.insert(categoryCaseTypes).values(
        caseTypeIds.map(caseTypeId => ({
          categoryId: category.id,
          caseTypeId: caseTypeId,
        }))
      );
    }
    
    return category;
  }

  async updateCategory(id: string, updates: Partial<InsertCategory>, caseTypeIds?: string[]): Promise<Category> {
    const [category] = await db
      .update(categories)
      .set(updates)
      .where(eq(categories.id, id))
      .returning();
    
    // Update junction table entries if caseTypeIds are provided
    if (caseTypeIds !== undefined) {
      // Delete existing associations
      await db.delete(categoryCaseTypes).where(eq(categoryCaseTypes.categoryId, id));
      
      // Create new associations
      if (caseTypeIds.length > 0) {
        await db.insert(categoryCaseTypes).values(
          caseTypeIds.map(caseTypeId => ({
            categoryId: id,
            caseTypeId: caseTypeId,
          }))
        );
      }
    }
    
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

  // Config methods - Reusable Checklist Templates
  async getReusableChecklistTemplates(): Promise<ReusableChecklistTemplate[]> {
    return await db.select().from(reusableChecklistTemplates)
      .orderBy(asc(reusableChecklistTemplates.name));
  }

  async getReusableChecklistTemplateWithItems(templateId: string): Promise<ReusableChecklistTemplate & { items: ReusableChecklistItem[] }> {
    const template = await db.select().from(reusableChecklistTemplates)
      .where(eq(reusableChecklistTemplates.id, templateId))
      .limit(1);
    
    if (!template[0]) {
      throw new Error("Template not found");
    }

    const items = await db.select().from(reusableChecklistItems)
      .where(eq(reusableChecklistItems.templateId, templateId))
      .orderBy(asc(reusableChecklistItems.sortOrder));

    return {
      ...template[0],
      items
    };
  }

  async createReusableChecklistTemplate(insertTemplate: InsertReusableChecklistTemplate): Promise<ReusableChecklistTemplate> {
    const [template] = await db
      .insert(reusableChecklistTemplates)
      .values(insertTemplate)
      .returning();
    return template;
  }

  async updateReusableChecklistTemplate(id: string, updates: Partial<InsertReusableChecklistTemplate>): Promise<ReusableChecklistTemplate> {
    const [template] = await db
      .update(reusableChecklistTemplates)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(reusableChecklistTemplates.id, id))
      .returning();
    return template;
  }

  async deleteReusableChecklistTemplate(id: string): Promise<void> {
    // Items will be cascade deleted due to foreign key constraint
    await db.delete(reusableChecklistTemplates).where(eq(reusableChecklistTemplates.id, id));
  }

  // Config methods - Reusable Checklist Items
  async getReusableChecklistItems(templateId: string): Promise<ReusableChecklistItem[]> {
    return await db.select().from(reusableChecklistItems)
      .where(eq(reusableChecklistItems.templateId, templateId))
      .orderBy(asc(reusableChecklistItems.sortOrder));
  }

  async createReusableChecklistItem(insertItem: InsertReusableChecklistItem): Promise<ReusableChecklistItem> {
    const [item] = await db
      .insert(reusableChecklistItems)
      .values(insertItem)
      .returning();
    return item;
  }

  async updateReusableChecklistItem(id: string, updates: Partial<InsertReusableChecklistItem>): Promise<ReusableChecklistItem> {
    const [item] = await db
      .update(reusableChecklistItems)
      .set(updates)
      .where(eq(reusableChecklistItems.id, id))
      .returning();
    return item;
  }

  async deleteReusableChecklistItem(id: string): Promise<void> {
    await db.delete(reusableChecklistItems).where(eq(reusableChecklistItems.id, id));
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

  // Config methods - Dispositions
  async getDispositions(): Promise<Disposition[]> {
    return await db.select().from(dispositions)
      .orderBy(asc(dispositions.sortOrder), asc(dispositions.name));
  }

  async getDisposition(id: string): Promise<Disposition | undefined> {
    const [disposition] = await db.select().from(dispositions).where(eq(dispositions.id, id));
    return disposition || undefined;
  }

  async createDisposition(insertDisposition: InsertDisposition): Promise<Disposition> {
    const [disposition] = await db
      .insert(dispositions)
      .values(insertDisposition)
      .returning();
    return disposition;
  }

  async updateDisposition(id: string, updates: Partial<InsertDisposition>): Promise<Disposition> {
    const [disposition] = await db
      .update(dispositions)
      .set(updates)
      .where(eq(dispositions.id, id))
      .returning();
    return disposition;
  }

  async deleteDisposition(id: string): Promise<void> {
    await db.delete(dispositions).where(eq(dispositions.id, id));
  }

  // Config methods - Sub-Dispositions
  async getSubDispositions(dispositionId?: string): Promise<SubDisposition[]> {
    if (dispositionId) {
      return await db.select().from(subDispositions)
        .where(eq(subDispositions.dispositionId, dispositionId))
        .orderBy(asc(subDispositions.sortOrder), asc(subDispositions.name));
    }
    return await db.select().from(subDispositions)
      .orderBy(asc(subDispositions.sortOrder), asc(subDispositions.name));
  }

  async getSubDisposition(id: string): Promise<SubDisposition | undefined> {
    const [subDisposition] = await db.select().from(subDispositions).where(eq(subDispositions.id, id));
    return subDisposition || undefined;
  }

  async createSubDisposition(insertSubDisposition: InsertSubDisposition): Promise<SubDisposition> {
    const [subDisposition] = await db
      .insert(subDispositions)
      .values(insertSubDisposition)
      .returning();
    return subDisposition;
  }

  async updateSubDisposition(id: string, updates: Partial<InsertSubDisposition>): Promise<SubDisposition> {
    const [subDisposition] = await db
      .update(subDispositions)
      .set(updates)
      .where(eq(subDispositions.id, id))
      .returning();
    return subDisposition;
  }

  async deleteSubDisposition(id: string): Promise<void> {
    await db.delete(subDispositions).where(eq(subDispositions.id, id));
  }

  // Config methods - Policy Violation Options
  async getPolicyViolationOptions(): Promise<PolicyViolationOption[]> {
    return await db.select().from(policyViolationOptions)
      .orderBy(asc(policyViolationOptions.sortOrder), asc(policyViolationOptions.label));
  }

  async getPolicyViolationOption(id: string): Promise<PolicyViolationOption | undefined> {
    const [option] = await db.select().from(policyViolationOptions).where(eq(policyViolationOptions.id, id));
    return option || undefined;
  }

  async createPolicyViolationOption(insertOption: InsertPolicyViolationOption): Promise<PolicyViolationOption> {
    const [option] = await db
      .insert(policyViolationOptions)
      .values(insertOption)
      .returning();
    return option;
  }

  async updatePolicyViolationOption(id: string, updates: Partial<InsertPolicyViolationOption>): Promise<PolicyViolationOption> {
    const [option] = await db
      .update(policyViolationOptions)
      .set(updates)
      .where(eq(policyViolationOptions.id, id))
      .returning();
    return option;
  }

  async deletePolicyViolationOption(id: string): Promise<void> {
    await db.delete(policyViolationOptions).where(eq(policyViolationOptions.id, id));
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

  async getAllChecklistAssignmentRules(): Promise<ChecklistAssignmentRule[]> {
    return await db.select().from(checklistAssignmentRules).orderBy(asc(checklistAssignmentRules.name));
  }

  async createChecklistAssignmentRule(insertRule: InsertChecklistAssignmentRule): Promise<ChecklistAssignmentRule> {
    const [rule] = await db
      .insert(checklistAssignmentRules)
      .values(insertRule)
      .returning();
    return rule;
  }

  async updateChecklistAssignmentRule(id: string, updates: Partial<InsertChecklistAssignmentRule>): Promise<ChecklistAssignmentRule> {
    const [rule] = await db
      .update(checklistAssignmentRules)
      .set(updates)
      .where(eq(checklistAssignmentRules.id, id))
      .returning();
    return rule;
  }

  async deleteChecklistAssignmentRule(id: string): Promise<void> {
    await db.delete(checklistAssignmentRules).where(eq(checklistAssignmentRules.id, id));
  }

  async getAllSlaPolicies(): Promise<SlaPolicy[]> {
    return await db.select().from(slaPolicies).orderBy(asc(slaPolicies.name));
  }

  // Dashboard methods
  async getDashboardStats(): Promise<DashboardStats> {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Get basic case counts
    const [
      totalCases,
      openCases,
      inProgressCases,
      resolvedToday,
    ] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(cases).then(r => r[0]?.count || 0),
      db.select({ count: sql<number>`count(*)::int` }).from(cases).where(eq(cases.status, 'open')).then(r => r[0]?.count || 0),
      db.select({ count: sql<number>`count(*)::int` }).from(cases).where(eq(cases.status, 'in_progress')).then(r => r[0]?.count || 0),
      db.select({ count: sql<number>`count(*)::int` }).from(cases)
        .where(and(eq(cases.status, 'resolved'), gte(cases.updatedAt, startOfToday)))
        .then(r => r[0]?.count || 0)
    ]);

    // Get recent cases (last 5)
    const recentCases = await db.select().from(cases)
      .orderBy(desc(cases.createdAt))
      .limit(5);

    // Mock SLA data for now (TODO: implement proper SLA calculation)
    const slaBreaches = 0;
    const averageResolutionTime = totalCases > 0 ? "2.1 days" : "0 days";
    const slaAlerts: { caseId: string; customerName: string; hoursRemaining: number; }[] = [];

    return {
      totalCases,
      openCases,
      inProgressCases,
      resolvedToday,
      slaBreaches,
      averageResolutionTime,
      recentCases,
      slaAlerts
    };
  }

  // Reporting Methods

  async getCaseVolumeReport(filters?: { startDate?: Date; endDate?: Date }) {
    const conditions = [];
    if (filters?.startDate) {
      conditions.push(gte(cases.createdAt, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(sql`${cases.createdAt} <= ${filters.endDate}`);
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get counts by status
    const byStatus = await db
      .select({
        status: cases.status,
        count: sql<number>`count(*)::int`
      })
      .from(cases)
      .where(whereClause)
      .groupBy(cases.status);

    // Get counts by type
    const byType = await db
      .select({
        typeId: caseTypes.id,
        typeName: caseTypes.name,
        count: sql<number>`count(*)::int`
      })
      .from(cases)
      .innerJoin(caseTypes, eq(cases.caseTypeId, caseTypes.id))
      .where(whereClause)
      .groupBy(caseTypes.id, caseTypes.name);

    // Get counts by category
    const byCategory = await db
      .select({
        categoryId: categories.id,
        categoryName: categories.name,
        count: sql<number>`count(*)::int`
      })
      .from(cases)
      .innerJoin(categories, eq(cases.categoryId, categories.id))
      .where(whereClause)
      .groupBy(categories.id, categories.name);

    // Get counts by origination
    const byOrigination = await db
      .select({
        originationId: sql<string>`COALESCE(${caseOriginations.id}, 'none')`,
        originationName: sql<string>`COALESCE(${caseOriginations.name}, 'No Origination')`,
        count: sql<number>`count(*)::int`
      })
      .from(cases)
      .leftJoin(caseOriginations, eq(cases.caseOriginationId, caseOriginations.id))
      .where(whereClause)
      .groupBy(caseOriginations.id, caseOriginations.name);

    // Get counts by priority
    const byPriority = await db
      .select({
        priorityValue: priorityRules.priorityValue,
        count: sql<number>`count(*)::int`
      })
      .from(cases)
      .innerJoin(priorityRules, eq(cases.priorityRuleId, priorityRules.id))
      .where(whereClause)
      .groupBy(priorityRules.priorityValue);

    // Get daily trend (last 30 days or filtered range)
    const dailyTrend = await db
      .select({
        date: sql<string>`TO_CHAR(${cases.createdAt}, 'YYYY-MM-DD')`,
        count: sql<number>`count(*)::int`
      })
      .from(cases)
      .where(whereClause)
      .groupBy(sql`TO_CHAR(${cases.createdAt}, 'YYYY-MM-DD')`)
      .orderBy(sql`TO_CHAR(${cases.createdAt}, 'YYYY-MM-DD')`);

    // Get total count
    const [totalResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(cases)
      .where(whereClause);

    return {
      byStatus,
      byType,
      byCategory,
      byOrigination,
      byPriority,
      dailyTrend,
      total: totalResult?.count || 0
    };
  }

  async getAgentPerformanceReport(filters?: { startDate?: Date; endDate?: Date }) {
    const conditions = [];
    if (filters?.startDate) {
      conditions.push(gte(cases.createdAt, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(sql`${cases.createdAt} <= ${filters.endDate}`);
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get performance metrics per user
    const performance = await db
      .select({
        userId: users.id,
        userName: users.name,
        role: users.role,
        totalAssigned: sql<number>`count(*)::int`,
        resolved: sql<number>`count(CASE WHEN ${cases.status} = 'resolved' THEN 1 END)::int`,
        avgResolutionTimeHours: sql<number>`AVG(CASE WHEN ${cases.status} = 'resolved' THEN EXTRACT(EPOCH FROM (${cases.updatedAt} - ${cases.createdAt})) / 3600 END)`,
      })
      .from(cases)
      .innerJoin(users, eq(cases.assignedToUserId, users.id))
      .where(whereClause)
      .groupBy(users.id, users.name, users.role);

    return performance.map(p => ({
      userId: p.userId,
      userName: p.userName,
      role: p.role,
      totalAssigned: p.totalAssigned,
      resolved: p.resolved,
      avgResolutionTimeHours: p.avgResolutionTimeHours ? Math.round(p.avgResolutionTimeHours * 10) / 10 : null,
      completionRate: p.totalAssigned > 0 ? Math.round((p.resolved / p.totalAssigned) * 100) : 0
    }));
  }

  async getSlaComplianceReport(filters?: { startDate?: Date; endDate?: Date }) {
    const conditions = [];
    if (filters?.startDate) {
      conditions.push(gte(cases.createdAt, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(sql`${cases.createdAt} <= ${filters.endDate}`);
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total cases count
    const [totals] = await db
      .select({
        totalCases: sql<number>`count(*)::int`,
        avgResolutionTimeHours: sql<number>`AVG(CASE WHEN ${cases.status} = 'resolved' THEN EXTRACT(EPOCH FROM (${cases.updatedAt} - ${cases.createdAt})) / 3600 END)`
      })
      .from(cases)
      .where(whereClause);

    // Get cases by age ranges - use raw SQL to avoid GROUP BY issues with column references
    const casesByAge = await db.execute<{ age_range: string; count: number }>(sql`
      SELECT 
        CASE 
          WHEN EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400 < 1 THEN '0-1 days'
          WHEN EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400 < 3 THEN '1-3 days'
          WHEN EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400 < 7 THEN '3-7 days'
          WHEN EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400 < 14 THEN '7-14 days'
          WHEN EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400 < 30 THEN '14-30 days'
          ELSE '30+ days'
        END as age_range,
        count(*)::int as count
      FROM cases
      ${whereClause ? sql`WHERE ${whereClause}` : sql``}
      GROUP BY 1
      ORDER BY 
        CASE 
          WHEN EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400 < 1 THEN 1
          WHEN EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400 < 3 THEN 2
          WHEN EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400 < 7 THEN 3
          WHEN EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400 < 14 THEN 4
          WHEN EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400 < 30 THEN 5
          ELSE 6
        END
    `);

    // Mock SLA compliance calculation (TODO: implement proper SLA policy evaluation)
    const totalCases = totals?.totalCases || 0;
    const withinSla = Math.floor(totalCases * 0.85); // Mock: assume 85% compliance
    const breachedSla = totalCases - withinSla;
    const complianceRate = totalCases > 0 ? Math.round((withinSla / totalCases) * 100) : 0;

    return {
      totalCases,
      withinSla,
      breachedSla,
      complianceRate,
      avgResolutionTimeHours: totals?.avgResolutionTimeHours ? Math.round(totals.avgResolutionTimeHours * 10) / 10 : null,
      casesByAge: casesByAge.rows.map(row => ({ ageRange: row.age_range, count: row.count }))
    };
  }

  async getResolutionPatternsReport(filters?: { startDate?: Date; endDate?: Date }) {
    const conditions = [eq(cases.status, 'resolved')];
    if (filters?.startDate) {
      conditions.push(gte(cases.updatedAt, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(sql`${cases.updatedAt} <= ${filters.endDate}`);
    }

    const whereClause = and(...conditions);

    // Get resolution patterns by disposition
    const byDisposition = await db
      .select({
        disposition: resolutions.disposition,
        count: sql<number>`count(*)::int`,
        avgAmount: sql<number>`AVG(CASE WHEN ${resolutions.settlementAmount} IS NOT NULL THEN ${resolutions.settlementAmount}::numeric END)`
      })
      .from(cases)
      .innerJoin(resolutions, eq(cases.id, resolutions.caseId))
      .where(whereClause)
      .groupBy(resolutions.disposition);

    // Get aggregate financial metrics
    const [financials] = await db
      .select({
        avgSettlementAmount: sql<number>`AVG(${resolutions.settlementAmount}::numeric)`,
        avgForgivenAmount: sql<number>`AVG(${resolutions.forgivenAmount}::numeric)`,
        totalSettlementAmount: sql<number>`SUM(${resolutions.settlementAmount}::numeric)`,
        totalForgivenAmount: sql<number>`SUM(${resolutions.forgivenAmount}::numeric)`
      })
      .from(cases)
      .innerJoin(resolutions, eq(cases.id, resolutions.caseId))
      .where(whereClause);

    // Get policy violations
    const policyViolations = await db
      .select({
        type: resolutions.policyViolation,
        count: sql<number>`count(*)::int`
      })
      .from(cases)
      .innerJoin(resolutions, eq(cases.id, resolutions.caseId))
      .where(whereClause)
      .groupBy(resolutions.policyViolation);

    return {
      byDisposition: byDisposition.map(d => ({
        disposition: d.disposition,
        count: d.count,
        avgAmount: d.avgAmount ? Math.round(d.avgAmount * 100) / 100 : null
      })),
      avgSettlementAmount: financials?.avgSettlementAmount ? Math.round(financials.avgSettlementAmount * 100) / 100 : null,
      avgForgivenAmount: financials?.avgForgivenAmount ? Math.round(financials.avgForgivenAmount * 100) / 100 : null,
      totalSettlementAmount: financials?.totalSettlementAmount ? Math.round(financials.totalSettlementAmount * 100) / 100 : null,
      totalForgivenAmount: financials?.totalForgivenAmount ? Math.round(financials.totalForgivenAmount * 100) / 100 : null,
      policyViolations
    };
  }

  async getLenderAnalyticsReport(filters?: { startDate?: Date; endDate?: Date }) {
    const conditions = [];
    if (filters?.startDate) {
      conditions.push(gte(cases.createdAt, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(sql`${cases.createdAt} <= ${filters.endDate}`);
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get metrics per lender
    const lenderMetrics = await db
      .select({
        lenderId: lenders.id,
        lenderName: lenders.name,
        totalCases: sql<number>`count(*)::int`,
        openCases: sql<number>`count(CASE WHEN ${cases.status} = 'open' THEN 1 END)::int`,
        resolvedCases: sql<number>`count(CASE WHEN ${cases.status} = 'resolved' THEN 1 END)::int`,
        avgResolutionTimeHours: sql<number>`AVG(CASE WHEN ${cases.status} = 'resolved' THEN EXTRACT(EPOCH FROM (${cases.updatedAt} - ${cases.createdAt})) / 3600 END)`
      })
      .from(cases)
      .innerJoin(lenders, eq(cases.lenderId, lenders.id))
      .where(whereClause)
      .groupBy(lenders.id, lenders.name)
      .orderBy(desc(sql`count(*)`));

    return lenderMetrics.map(m => ({
      lenderId: m.lenderId,
      lenderName: m.lenderName,
      totalCases: m.totalCases,
      openCases: m.openCases,
      resolvedCases: m.resolvedCases,
      avgResolutionTimeHours: m.avgResolutionTimeHours ? Math.round(m.avgResolutionTimeHours * 10) / 10 : null
    }));
  }

  // Knowledge Base Methods

  // Knowledge Base Categories
  async getKbCategories(parentId?: string): Promise<KbCategory[]> {
    const conditions = [];
    if (parentId !== undefined) {
      if (parentId === null) {
        conditions.push(sql`${kbCategories.parentId} IS NULL`);
      } else {
        conditions.push(eq(kbCategories.parentId, parentId));
      }
    }
    
    return await db
      .select()
      .from(kbCategories)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(kbCategories.displayOrder), asc(kbCategories.name));
  }

  async getKbCategory(id: string): Promise<KbCategory | undefined> {
    const [category] = await db.select().from(kbCategories).where(eq(kbCategories.id, id));
    return category || undefined;
  }

  async getKbCategoryBySlug(slug: string): Promise<KbCategory | undefined> {
    const [category] = await db.select().from(kbCategories).where(eq(kbCategories.slug, slug));
    return category || undefined;
  }

  async createKbCategory(category: InsertKbCategory): Promise<KbCategory> {
    const [newCategory] = await db
      .insert(kbCategories)
      .values({
        ...category,
        updatedAt: new Date()
      })
      .returning();
    return newCategory;
  }

  async updateKbCategory(id: string, updates: Partial<InsertKbCategory>): Promise<KbCategory> {
    const [category] = await db
      .update(kbCategories)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(kbCategories.id, id))
      .returning();
    return category;
  }

  async deleteKbCategory(id: string): Promise<void> {
    await db.delete(kbCategories).where(eq(kbCategories.id, id));
  }

  // Knowledge Base Articles
  async getKbArticles(filters?: { 
    categoryId?: string; 
    status?: string; 
    visibility?: string; 
    tags?: string[];
    search?: string;
    limit?: number; 
    offset?: number; 
  }): Promise<Array<KbArticle & { categoryName?: string; authorName?: string }>> {
    const conditions = [];
    
    if (filters?.categoryId) conditions.push(eq(kbArticles.categoryId, filters.categoryId));
    if (filters?.status) conditions.push(eq(kbArticles.status, filters.status as any));
    if (filters?.visibility) conditions.push(eq(kbArticles.visibility, filters.visibility as any));
    if (filters?.tags && filters.tags.length > 0) {
      conditions.push(sql`${kbArticles.tags} && ${filters.tags}`);
    }
    if (filters?.search) {
      conditions.push(or(
        ilike(kbArticles.title, `%${filters.search}%`),
        ilike(kbArticles.content, `%${filters.search}%`),
        ilike(kbArticles.summary, `%${filters.search}%`)
      ));
    }

    const query = db
      .select({
        id: kbArticles.id,
        title: kbArticles.title,
        slug: kbArticles.slug,
        summary: kbArticles.summary,
        content: kbArticles.content,
        categoryId: kbArticles.categoryId,
        authorId: kbArticles.authorId,
        lastModifiedBy: kbArticles.lastModifiedBy,
        status: kbArticles.status,
        visibility: kbArticles.visibility,
        tags: kbArticles.tags,
        searchVector: kbArticles.searchVector,
        viewCount: kbArticles.viewCount,
        publishedAt: kbArticles.publishedAt,
        createdAt: kbArticles.createdAt,
        updatedAt: kbArticles.updatedAt,
        categoryName: kbCategories.name,
        authorName: users.name,
      })
      .from(kbArticles)
      .leftJoin(kbCategories, eq(kbArticles.categoryId, kbCategories.id))
      .leftJoin(users, eq(kbArticles.authorId, users.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(kbArticles.updatedAt));

    if (filters?.limit) query.limit(filters.limit);
    if (filters?.offset) query.offset(filters.offset);

    return query;
  }

  async getKbArticle(id: string): Promise<KbArticle | undefined> {
    const [article] = await db.select().from(kbArticles).where(eq(kbArticles.id, id));
    return article || undefined;
  }

  async getKbArticleBySlug(slug: string): Promise<KbArticle | undefined> {
    const [article] = await db.select().from(kbArticles).where(eq(kbArticles.slug, slug));
    return article || undefined;
  }

  async createKbArticle(article: InsertKbArticle): Promise<KbArticle> {
    const [newArticle] = await db
      .insert(kbArticles)
      .values({
        ...article,
        updatedAt: new Date()
      })
      .returning();
    return newArticle;
  }

  async updateKbArticle(id: string, updates: Partial<InsertKbArticle>): Promise<KbArticle> {
    const [article] = await db
      .update(kbArticles)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(kbArticles.id, id))
      .returning();
    return article;
  }

  async deleteKbArticle(id: string): Promise<void> {
    await db.delete(kbArticles).where(eq(kbArticles.id, id));
  }

  async publishKbArticle(id: string, publishedBy: string): Promise<KbArticle> {
    const [article] = await db
      .update(kbArticles)
      .set({
        status: "published",
        lastModifiedBy: publishedBy,
        publishedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(kbArticles.id, id))
      .returning();
    return article;
  }

  async incrementKbArticleViews(id: string): Promise<void> {
    await db
      .update(kbArticles)
      .set({
        viewCount: sql`${kbArticles.viewCount} + 1`
      })
      .where(eq(kbArticles.id, id));
  }

  async searchKbArticles(query: string, filters?: { visibility?: string; categoryId?: string }): Promise<Array<KbArticle & { categoryName?: string }>> {
    const conditions = [
      eq(kbArticles.status, "published"),
      or(
        ilike(kbArticles.title, `%${query}%`),
        ilike(kbArticles.content, `%${query}%`),
        ilike(kbArticles.summary, `%${query}%`)
      )
    ];
    
    if (filters?.visibility) conditions.push(eq(kbArticles.visibility, filters.visibility as any));
    if (filters?.categoryId) conditions.push(eq(kbArticles.categoryId, filters.categoryId));

    return await db
      .select({
        id: kbArticles.id,
        title: kbArticles.title,
        slug: kbArticles.slug,
        summary: kbArticles.summary,
        content: kbArticles.content,
        categoryId: kbArticles.categoryId,
        authorId: kbArticles.authorId,
        lastModifiedBy: kbArticles.lastModifiedBy,
        status: kbArticles.status,
        visibility: kbArticles.visibility,
        tags: kbArticles.tags,
        searchVector: kbArticles.searchVector,
        viewCount: kbArticles.viewCount,
        publishedAt: kbArticles.publishedAt,
        createdAt: kbArticles.createdAt,
        updatedAt: kbArticles.updatedAt,
        categoryName: kbCategories.name,
      })
      .from(kbArticles)
      .leftJoin(kbCategories, eq(kbArticles.categoryId, kbCategories.id))
      .where(and(...conditions))
      .orderBy(desc(kbArticles.updatedAt));
  }

  // Knowledge Base Article Versions
  async getKbArticleVersions(articleId: string): Promise<KbArticleVersion[]> {
    return await db
      .select()
      .from(kbArticleVersions)
      .where(eq(kbArticleVersions.articleId, articleId))
      .orderBy(desc(kbArticleVersions.versionNumber));
  }

  async getKbArticleVersion(id: string): Promise<KbArticleVersion | undefined> {
    const [version] = await db.select().from(kbArticleVersions).where(eq(kbArticleVersions.id, id));
    return version || undefined;
  }

  async createKbArticleVersion(version: InsertKbArticleVersion): Promise<KbArticleVersion> {
    const [newVersion] = await db
      .insert(kbArticleVersions)
      .values(version)
      .returning();
    return newVersion;
  }

  async getLatestKbArticleVersion(articleId: string): Promise<KbArticleVersion | undefined> {
    const [version] = await db
      .select()
      .from(kbArticleVersions)
      .where(eq(kbArticleVersions.articleId, articleId))
      .orderBy(desc(kbArticleVersions.versionNumber))
      .limit(1);
    return version || undefined;
  }

  // Knowledge Base Change Events
  async getKbChangeEvents(filters?: { 
    eventType?: string; 
    entityType?: string; 
    isProcessed?: boolean;
    limit?: number; 
    offset?: number; 
  }): Promise<KbChangeEvent[]> {
    const conditions = [];
    
    if (filters?.eventType) conditions.push(eq(kbChangeEvents.eventType, filters.eventType));
    if (filters?.entityType) conditions.push(eq(kbChangeEvents.entityType, filters.entityType));
    if (filters?.isProcessed !== undefined) conditions.push(eq(kbChangeEvents.isProcessed, filters.isProcessed));

    const query = db
      .select()
      .from(kbChangeEvents)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(kbChangeEvents.createdAt));

    if (filters?.limit) query.limit(filters.limit);
    if (filters?.offset) query.offset(filters.offset);

    return query;
  }

  async createKbChangeEvent(event: InsertKbChangeEvent): Promise<KbChangeEvent> {
    const [newEvent] = await db
      .insert(kbChangeEvents)
      .values(event)
      .returning();
    return newEvent;
  }

  async markKbChangeEventProcessed(id: string, relatedArticleId?: string): Promise<KbChangeEvent> {
    const [event] = await db
      .update(kbChangeEvents)
      .set({
        isProcessed: true,
        relatedArticleId
      })
      .where(eq(kbChangeEvents.id, id))
      .returning();
    return event;
  }

  async getUnprocessedKbChangeEvents(): Promise<KbChangeEvent[]> {
    return await db
      .select()
      .from(kbChangeEvents)
      .where(eq(kbChangeEvents.isProcessed, false))
      .orderBy(desc(kbChangeEvents.createdAt));
  }

  // Knowledge Base Article Links
  async getKbArticleLinks(articleId: string): Promise<KbArticleLink[]> {
    return await db
      .select()
      .from(kbArticleLinks)
      .where(eq(kbArticleLinks.articleId, articleId))
      .orderBy(asc(kbArticleLinks.linkType));
  }

  async getKbLinkedArticles(entityType: string, entityId: string): Promise<Array<KbArticleLink & { articleTitle: string; articleSlug: string }>> {
    return await db
      .select({
        id: kbArticleLinks.id,
        articleId: kbArticleLinks.articleId,
        linkedEntityType: kbArticleLinks.linkedEntityType,
        linkedEntityId: kbArticleLinks.linkedEntityId,
        linkType: kbArticleLinks.linkType,
        contextDescription: kbArticleLinks.contextDescription,
        createdAt: kbArticleLinks.createdAt,
        articleTitle: kbArticles.title,
        articleSlug: kbArticles.slug,
      })
      .from(kbArticleLinks)
      .innerJoin(kbArticles, eq(kbArticleLinks.articleId, kbArticles.id))
      .where(and(
        eq(kbArticleLinks.linkedEntityType, entityType),
        eq(kbArticleLinks.linkedEntityId, entityId),
        eq(kbArticles.status, "published")
      ))
      .orderBy(asc(kbArticleLinks.linkType));
  }

  async createKbArticleLink(link: InsertKbArticleLink): Promise<KbArticleLink> {
    const [newLink] = await db
      .insert(kbArticleLinks)
      .values(link)
      .returning();
    return newLink;
  }

  async deleteKbArticleLink(id: string): Promise<void> {
    await db.delete(kbArticleLinks).where(eq(kbArticleLinks.id, id));
  }
}

export const storage = new DatabaseStorage();
