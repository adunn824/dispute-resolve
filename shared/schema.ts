import { sql, relations } from "drizzle-orm";
import { 
  pgTable, 
  text, 
  varchar, 
  integer, 
  timestamp, 
  boolean, 
  decimal, 
  json, 
  serial,
  unique,
  jsonb,
  index
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for authentication
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Runtime Tables

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  email: text("email").unique(),
  name: text("name").notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: text("role", { enum: ["agent", "compliance", "admin"] }).notNull().default("agent"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const customers = pgTable("customers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  externalId: text("external_id"),
  name: text("name").notNull(),
  state: text("state").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const cases = pgTable("cases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  caseTypeId: varchar("case_type_id").notNull().references(() => caseTypes.id),
  categoryId: varchar("category_id").notNull().references(() => categories.id),
  priorityRuleId: varchar("priority_rule_id").notNull().references(() => priorityRules.id),
  customerId: varchar("customer_id").notNull().references(() => customers.id),
  loanId: text("loan_id"),
  state: text("state").notNull(),
  details: text("details").notNull(),
  status: text("status", { enum: ["open", "pending", "resolved", "closed"] }).notNull().default("open"),
  configVersion: integer("config_version").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const checklistItems = pgTable("checklist_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  caseId: varchar("case_id").notNull().references(() => cases.id),
  key: text("key").notNull(),
  label: text("label").notNull(),
  isRequired: boolean("is_required").notNull().default(false),
  status: text("status", { enum: ["open", "complete"] }).notNull().default("open"),
  assignedToUserId: varchar("assigned_to_user_id").references(() => users.id),
  completedAt: timestamp("completed_at"),
});

export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  caseId: varchar("case_id").notNull().references(() => cases.id),
  key: text("key").notNull(),
  label: text("label").notNull(),
  fileType: text("file_type").notNull(),
  mime: text("mime").notNull(),
  storageKey: text("storage_key").notNull(),
  uploadedByUserId: varchar("uploaded_by_user_id").notNull().references(() => users.id),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
});

export const resolutions = pgTable("resolutions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  caseId: varchar("case_id").notNull().unique().references(() => cases.id),
  disposition: text("disposition").notNull(),
  subDisposition: text("sub_disposition"),
  notes: text("notes"),
  settlementAmount: decimal("settlement_amount", { precision: 10, scale: 2 }),
  forgivenAmount: decimal("forgiven_amount", { precision: 10, scale: 2 }),
  policyViolation: text("policy_violation", { enum: ["Yes", "No", "N/A"] }).notNull().default("N/A"),
  resolvedAt: timestamp("resolved_at").defaultNow().notNull(),
});

export const flags = pgTable("flags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  caseId: varchar("case_id").notNull().references(() => cases.id),
  flagType: text("flag_type").notNull(),
  appliedByUserId: varchar("applied_by_user_id").notNull().references(() => users.id),
  appliedAt: timestamp("applied_at").defaultNow().notNull(),
});

export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  caseId: varchar("case_id").references(() => cases.id),
  actorUserId: varchar("actor_user_id").references(() => users.id),
  action: text("action").notNull(),
  details: json("details"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Admin Config Tables

export const caseTypes = pgTable("case_types", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  description: text("description"),
  color: text("color").default("#2563eb"),
  isActive: boolean("is_active").notNull().default(true),
});

export const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  caseTypeId: varchar("case_type_id").notNull().references(() => caseTypes.id),
  name: text("name").notNull(),
  code: text("code").notNull(),
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  version: integer("version").notNull().default(1),
  effectiveFrom: timestamp("effective_from").defaultNow().notNull(),
  effectiveTo: timestamp("effective_to"),
});

export const checklistTemplates = pgTable("checklist_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  categoryId: varchar("category_id").notNull().references(() => categories.id),
  key: text("key").notNull(),
  label: text("label").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  isRequired: boolean("is_required").notNull().default(false),
  conditionJson: json("condition_json"),
  helpText: text("help_text"),
});

export const documentRequirements = pgTable("document_requirements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  categoryId: varchar("category_id").notNull().references(() => categories.id),
  key: text("key").notNull(),
  label: text("label").notNull(),
  isRequired: boolean("is_required").notNull().default(false),
  mimeWhitelist: json("mime_whitelist").$type<string[]>(),
  conditionJson: json("condition_json"),
});

export const priorityRules = pgTable("priority_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  categoryId: varchar("category_id").references(() => categories.id),
  name: text("name").notNull(),
  description: text("description"),
  priority: text("priority", { enum: ["critical", "high", "medium", "low"] }).notNull(),
  conditions: text("conditions").notNull(),
  ruleJson: json("rule_json"),
  priorityValue: text("priority_value"),
  isActive: boolean("is_active").notNull().default(true),
});

export const tagRules = pgTable("tag_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  categoryId: varchar("category_id").references(() => categories.id),
  name: text("name").notNull(),
  description: text("description"),
  tag: text("tag").notNull(),
  conditions: text("conditions").notNull(),
  ruleJson: json("rule_json"),
  tags: json("tags").$type<string[]>(),
  isActive: boolean("is_active").notNull().default(true),
});

export const resolutionConfigs = pgTable("resolution_configs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  categoryId: varchar("category_id").notNull().references(() => categories.id),
  fieldsJson: json("fields_json").notNull(),
});

export const slaPolicies = pgTable("sla_policies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  categoryId: varchar("category_id").references(() => categories.id),
  name: text("name").notNull(),
  description: text("description"),
  priority: text("priority", { enum: ["critical", "high", "medium", "low"] }).notNull(),
  responseTimeHours: integer("response_time_hours").notNull(),
  resolutionTimeHours: integer("resolution_time_hours").notNull(),
  targetHours: integer("target_hours"),
  clockStartsOn: text("clock_starts_on"),
  pauseOnStatus: json("pause_on_status").$type<string[]>(),
  isActive: boolean("is_active").notNull().default(true),
});

export const valueSets = pgTable("value_sets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(),
  valuesJson: json("values_json").notNull(),
});

export const configAudits = pgTable("config_audits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  entity: text("entity").notNull(),
  entityId: varchar("entity_id").notNull(),
  action: text("action").notNull(),
  beforeJson: json("before_json"),
  afterJson: json("after_json"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const featureFlags = pgTable("feature_flags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(),
  on: boolean("on").notNull().default(false),
  audienceJson: json("audience_json"),
});

export const webhooks = pgTable("webhooks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  eventKey: text("event_key").notNull(),
  url: text("url").notNull(),
  secret: text("secret"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const integrations = pgTable("integrations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  settingsJson: json("settings_json").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Relations

export const usersRelations = relations(users, ({ many }) => ({
  cases: many(cases),
  checklistItems: many(checklistItems),
  documents: many(documents),
  flags: many(flags),
  auditLogs: many(auditLogs),
  configAudits: many(configAudits),
}));

export const customersRelations = relations(customers, ({ many }) => ({
  cases: many(cases),
}));

export const casesRelations = relations(cases, ({ one, many }) => ({
  customer: one(customers, {
    fields: [cases.customerId],
    references: [customers.id],
  }),
  caseType: one(caseTypes, {
    fields: [cases.caseTypeId],
    references: [caseTypes.id],
  }),
  category: one(categories, {
    fields: [cases.categoryId],
    references: [categories.id],
  }),
  checklistItems: many(checklistItems),
  documents: many(documents),
  resolution: one(resolutions),
  flags: many(flags),
  auditLogs: many(auditLogs),
}));

export const checklistItemsRelations = relations(checklistItems, ({ one }) => ({
  case: one(cases, {
    fields: [checklistItems.caseId],
    references: [cases.id],
  }),
  assignedToUser: one(users, {
    fields: [checklistItems.assignedToUserId],
    references: [users.id],
  }),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  case: one(cases, {
    fields: [documents.caseId],
    references: [cases.id],
  }),
  uploadedByUser: one(users, {
    fields: [documents.uploadedByUserId],
    references: [users.id],
  }),
}));

export const resolutionsRelations = relations(resolutions, ({ one }) => ({
  case: one(cases, {
    fields: [resolutions.caseId],
    references: [cases.id],
  }),
}));

export const flagsRelations = relations(flags, ({ one }) => ({
  case: one(cases, {
    fields: [flags.caseId],
    references: [cases.id],
  }),
  appliedByUser: one(users, {
    fields: [flags.appliedByUserId],
    references: [users.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  case: one(cases, {
    fields: [auditLogs.caseId],
    references: [cases.id],
  }),
  actorUser: one(users, {
    fields: [auditLogs.actorUserId],
    references: [users.id],
  }),
}));

export const caseTypesRelations = relations(caseTypes, ({ many }) => ({
  categories: many(categories),
  cases: many(cases),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  caseType: one(caseTypes, {
    fields: [categories.caseTypeId],
    references: [caseTypes.id],
  }),
  cases: many(cases),
  checklistTemplates: many(checklistTemplates),
  documentRequirements: many(documentRequirements),
  priorityRules: many(priorityRules),
  tagRules: many(tagRules),
  resolutionConfigs: many(resolutionConfigs),
  slaPolicies: many(slaPolicies),
}));

export const checklistTemplatesRelations = relations(checklistTemplates, ({ one }) => ({
  category: one(categories, {
    fields: [checklistTemplates.categoryId],
    references: [categories.id],
  }),
}));

export const documentRequirementsRelations = relations(documentRequirements, ({ one }) => ({
  category: one(categories, {
    fields: [documentRequirements.categoryId],
    references: [categories.id],
  }),
}));

export const priorityRulesRelations = relations(priorityRules, ({ one }) => ({
  category: one(categories, {
    fields: [priorityRules.categoryId],
    references: [categories.id],
  }),
}));

export const tagRulesRelations = relations(tagRules, ({ one }) => ({
  category: one(categories, {
    fields: [tagRules.categoryId],
    references: [categories.id],
  }),
}));

export const resolutionConfigsRelations = relations(resolutionConfigs, ({ one }) => ({
  category: one(categories, {
    fields: [resolutionConfigs.categoryId],
    references: [categories.id],
  }),
}));

export const slaPoliciesRelations = relations(slaPolicies, ({ one }) => ({
  category: one(categories, {
    fields: [slaPolicies.categoryId],
    references: [categories.id],
  }),
}));

export const configAuditsRelations = relations(configAudits, ({ one }) => ({
  user: one(users, {
    fields: [configAudits.userId],
    references: [users.id],
  }),
}));

// Insert Schemas

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCaseSchema = createInsertSchema(cases).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertChecklistItemSchema = createInsertSchema(checklistItems).omit({
  id: true,
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  uploadedAt: true,
});

export const insertResolutionSchema = createInsertSchema(resolutions).omit({
  id: true,
  resolvedAt: true,
});

export const insertFlagSchema = createInsertSchema(flags).omit({
  id: true,
  appliedAt: true,
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
});

export const insertCaseTypeSchema = createInsertSchema(caseTypes).omit({
  id: true,
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
  effectiveFrom: true,
});

export const insertChecklistTemplateSchema = createInsertSchema(checklistTemplates).omit({
  id: true,
});

export const insertDocumentRequirementSchema = createInsertSchema(documentRequirements).omit({
  id: true,
});

export const insertPriorityRuleSchema = createInsertSchema(priorityRules).omit({
  id: true,
});

export const insertTagRuleSchema = createInsertSchema(tagRules).omit({
  id: true,
});

export const insertResolutionConfigSchema = createInsertSchema(resolutionConfigs).omit({
  id: true,
});

export const insertSlaPolicySchema = createInsertSchema(slaPolicies).omit({
  id: true,
});

export const insertValueSetSchema = createInsertSchema(valueSets).omit({
  id: true,
});

export const insertConfigAuditSchema = createInsertSchema(configAudits).omit({
  id: true,
  createdAt: true,
});

export const insertFeatureFlagSchema = createInsertSchema(featureFlags).omit({
  id: true,
});

export const insertWebhookSchema = createInsertSchema(webhooks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertIntegrationSchema = createInsertSchema(integrations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpsertUser = typeof users.$inferInsert;

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;

export type Case = typeof cases.$inferSelect;
export type InsertCase = z.infer<typeof insertCaseSchema>;

export type ChecklistItem = typeof checklistItems.$inferSelect;
export type InsertChecklistItem = z.infer<typeof insertChecklistItemSchema>;

export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;

export type Resolution = typeof resolutions.$inferSelect;
export type InsertResolution = z.infer<typeof insertResolutionSchema>;

export type Flag = typeof flags.$inferSelect;
export type InsertFlag = z.infer<typeof insertFlagSchema>;

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;

export type CaseType = typeof caseTypes.$inferSelect;
export type InsertCaseType = z.infer<typeof insertCaseTypeSchema>;

export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;

export type ChecklistTemplate = typeof checklistTemplates.$inferSelect;
export type InsertChecklistTemplate = z.infer<typeof insertChecklistTemplateSchema>;

export type DocumentRequirement = typeof documentRequirements.$inferSelect;
export type InsertDocumentRequirement = z.infer<typeof insertDocumentRequirementSchema>;

export type PriorityRule = typeof priorityRules.$inferSelect;
export type InsertPriorityRule = z.infer<typeof insertPriorityRuleSchema>;

export type TagRule = typeof tagRules.$inferSelect;
export type InsertTagRule = z.infer<typeof insertTagRuleSchema>;

export type ResolutionConfig = typeof resolutionConfigs.$inferSelect;
export type InsertResolutionConfig = z.infer<typeof insertResolutionConfigSchema>;

export type SlaPolicy = typeof slaPolicies.$inferSelect;
export type InsertSlaPolicy = z.infer<typeof insertSlaPolicySchema>;

export type ValueSet = typeof valueSets.$inferSelect;
export type InsertValueSet = z.infer<typeof insertValueSetSchema>;

export type ConfigAudit = typeof configAudits.$inferSelect;
export type InsertConfigAudit = z.infer<typeof insertConfigAuditSchema>;

export type FeatureFlag = typeof featureFlags.$inferSelect;
export type InsertFeatureFlag = z.infer<typeof insertFeatureFlagSchema>;

export type Webhook = typeof webhooks.$inferSelect;
export type InsertWebhook = z.infer<typeof insertWebhookSchema>;

export type Integration = typeof integrations.$inferSelect;
export type InsertIntegration = z.infer<typeof insertIntegrationSchema>;
