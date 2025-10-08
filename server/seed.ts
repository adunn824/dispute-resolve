import { db } from "./db";
import { eq } from "drizzle-orm";
import { hashPassword } from "./auth";
import { 
  users, 
  customers, 
  cases, 
  caseNotes,
  checklistItems, 
  documents, 
  resolutions, 
  flags, 
  auditLogs,
  caseTypes,
  categories,
  categoryCaseTypes,
  checklistTemplates,
  documentRequirements,
  priorityRules,
  tagRules,
  resolutionConfigs,
  slaPolicies,
  valueSets,
  featureFlags,
  kbCategories,
  kbArticles,
  kbArticleVersions,
  kbChangeEvents,
  kbArticleLinks
} from "@shared/schema";

async function seed() {
  console.log("🌱 Starting database seeding...");

  // Clear existing data
  await db.delete(auditLogs);
  await db.delete(resolutions);
  await db.delete(documents);
  await db.delete(checklistItems);
  await db.delete(flags);
  await db.delete(caseNotes);
  await db.delete(cases);
  await db.delete(customers);
  await db.delete(kbChangeEvents);
  await db.delete(kbArticleLinks);
  await db.delete(kbArticleVersions);
  await db.delete(kbArticles);
  await db.delete(kbCategories);
  await db.delete(users);
  await db.delete(checklistTemplates);
  await db.delete(documentRequirements);
  await db.delete(priorityRules);
  await db.delete(tagRules);
  await db.delete(resolutionConfigs);
  await db.delete(slaPolicies);
  await db.delete(categoryCaseTypes);
  await db.delete(categories);
  await db.delete(caseTypes);
  await db.delete(valueSets);
  await db.delete(featureFlags);

  // 1. Create Case Types
  console.log("Creating case types...");
  const caseTypeRecords = await db.insert(caseTypes).values([
    { name: "Mail" },
    { name: "Complaint" },
    { name: "Dispute" },
  ]).returning();

  const mailType = caseTypeRecords.find(ct => ct.name === "Mail")!;
  const complaintType = caseTypeRecords.find(ct => ct.name === "Complaint")!;
  const disputeType = caseTypeRecords.find(ct => ct.name === "Dispute")!;

  // 2. Create Categories
  console.log("Creating categories...");
  const categoryRecords = await db.insert(categories).values([
    // Mail categories
    { name: "General Inquiry", code: "MAIL_GEN", description: "General mail inquiries", sortOrder: 1, version: 1 },
    { name: "Account Information", code: "MAIL_ACCT", description: "Account-related mail", sortOrder: 2, version: 1 },
    
    // Complaint categories
    { name: "Service Quality", code: "COMP_SVC", description: "Service quality complaints", sortOrder: 1, version: 1 },
    { name: "Billing Issues", code: "COMP_BILL", description: "Billing-related complaints", sortOrder: 2, version: 1 },
    { name: "Staff Conduct", code: "COMP_STAFF", description: "Staff conduct complaints", sortOrder: 3, version: 1 },
    
    // Dispute categories  
    { name: "Transaction Dispute", code: "DISP_TXN", description: "Transaction disputes", sortOrder: 1, version: 1 },
    { name: "Billing Dispute", code: "DISP_BILL", description: "Billing disputes", sortOrder: 2, version: 1 },
    { name: "Service Dispute", code: "DISP_SVC", description: "Service disputes", sortOrder: 3, version: 1 },
  ]).returning();
  
  // Link categories to case types via junction table
  const mailCategories = categoryRecords.filter(c => c.code.startsWith("MAIL_"));
  const complaintCategories = categoryRecords.filter(c => c.code.startsWith("COMP_"));
  const disputeCategories = categoryRecords.filter(c => c.code.startsWith("DISP_"));
  
  await db.insert(categoryCaseTypes).values([
    ...mailCategories.map(cat => ({ categoryId: cat.id, caseTypeId: mailType.id })),
    ...complaintCategories.map(cat => ({ categoryId: cat.id, caseTypeId: complaintType.id })),
    ...disputeCategories.map(cat => ({ categoryId: cat.id, caseTypeId: disputeType.id })),
  ]);

  // 3. Create Users
  console.log("Creating users...");
  const userRecords = await db.insert(users).values([
    { username: "admin", password: await hashPassword("admin123"), email: "admin@company.com", name: "Admin User", role: "admin", status: "active" },
    { username: "jane.smith", password: await hashPassword("password123"), email: "jane.smith@company.com", name: "Jane Smith", role: "compliance", status: "active" },
    { username: "mike.johnson", password: await hashPassword("password123"), email: "mike.johnson@company.com", name: "Mike Johnson", role: "agent", status: "active" },
    { username: "sarah.wilson", password: await hashPassword("password123"), email: "sarah.wilson@company.com", name: "Sarah Wilson", role: "agent", status: "active" },
    { username: "david.brown", password: await hashPassword("password123"), email: "david.brown@company.com", name: "David Brown", role: "compliance", status: "active" },
  ]).returning();

  const adminUser = userRecords.find(u => u.role === "admin")!;
  const agentUser = userRecords.find(u => u.name === "Mike Johnson")!;
  const complianceUser = userRecords.find(u => u.name === "Jane Smith")!;

  // 4. Create Customers
  console.log("Creating customers...");
  const customerRecords = await db.insert(customers).values([
    { externalId: "CUST001", name: "Acme Corporation", state: "CA" },
    { externalId: "CUST002", name: "Tech Solutions Inc", state: "NY" },
    { externalId: "CUST003", name: "Global Enterprises", state: "TX" },
    { externalId: "CUST004", name: "Innovation Labs", state: "WA" },
    { externalId: "CUST005", name: "Future Systems", state: "FL" },
    { externalId: "CUST006", name: "Digital Dynamics", state: "IL" },
  ]).returning();

  // 5. Create Checklist Templates
  console.log("Creating checklist templates...");
  for (const category of categoryRecords) {
    const templates = [];
    
    if (category.code.startsWith("MAIL_")) {
      templates.push(
        { categoryId: category.id, key: "acknowledge_receipt", label: "Acknowledge receipt of mail", sortOrder: 1, isRequired: true, helpText: "Send acknowledgment within 24 hours" },
        { categoryId: category.id, key: "route_to_dept", label: "Route to appropriate department", sortOrder: 2, isRequired: true, helpText: "Ensure correct department assignment" },
        { categoryId: category.id, key: "respond_to_customer", label: "Provide response to customer", sortOrder: 3, isRequired: true, helpText: "Complete response within SLA" }
      );
    } else if (category.code.startsWith("COMP_")) {
      templates.push(
        { categoryId: category.id, key: "investigate_complaint", label: "Investigate complaint details", sortOrder: 1, isRequired: true, helpText: "Thoroughly review all complaint details" },
        { categoryId: category.id, key: "gather_evidence", label: "Gather supporting evidence", sortOrder: 2, isRequired: true, helpText: "Collect relevant documentation" },
        { categoryId: category.id, key: "determine_resolution", label: "Determine appropriate resolution", sortOrder: 3, isRequired: true, helpText: "Based on policy and evidence" },
        { categoryId: category.id, key: "communicate_outcome", label: "Communicate outcome to customer", sortOrder: 4, isRequired: true, helpText: "Provide clear resolution communication" }
      );
    } else if (category.code.startsWith("DISP_")) {
      templates.push(
        { categoryId: category.id, key: "review_dispute_claim", label: "Review dispute claim", sortOrder: 1, isRequired: true, helpText: "Analyze dispute validity" },
        { categoryId: category.id, key: "collect_documentation", label: "Collect required documentation", sortOrder: 2, isRequired: true, helpText: "Gather all supporting docs" },
        { categoryId: category.id, key: "conduct_investigation", label: "Conduct thorough investigation", sortOrder: 3, isRequired: true, helpText: "Follow investigation protocols" },
        { categoryId: category.id, key: "make_determination", label: "Make final determination", sortOrder: 4, isRequired: true, helpText: "Document decision rationale" },
        { categoryId: category.id, key: "process_adjustment", label: "Process any adjustments", sortOrder: 5, isRequired: false, helpText: "If applicable, process refunds/credits" }
      );
    }
    
    if (templates.length > 0) {
      await db.insert(checklistTemplates).values(templates);
    }
  }

  // 6. Create Document Requirements
  console.log("Creating document requirements...");
  for (const category of categoryRecords) {
    const docReqs = [];
    
    if (category.code.startsWith("COMP_") || category.code.startsWith("DISP_")) {
      docReqs.push(
        { categoryId: category.id, key: "customer_statement", label: "Customer Statement", isRequired: true, mimeWhitelist: ["application/pdf", "image/jpeg", "image/png"] },
        { categoryId: category.id, key: "supporting_evidence", label: "Supporting Evidence", isRequired: false, mimeWhitelist: ["application/pdf", "image/jpeg", "image/png", "text/plain"] }
      );
    }
    
    if (category.code.startsWith("DISP_")) {
      docReqs.push(
        { categoryId: category.id, key: "transaction_proof", label: "Transaction Proof", isRequired: true, mimeWhitelist: ["application/pdf", "image/jpeg", "image/png"] },
        { categoryId: category.id, key: "correspondence", label: "Previous Correspondence", isRequired: false, mimeWhitelist: ["application/pdf", "text/plain", "message/rfc822"] }
      );
    }
    
    if (docReqs.length > 0) {
      await db.insert(documentRequirements).values(docReqs);
    }
  }

  // 7. Create Priority Rules
  console.log("Creating priority rules...");
  for (const category of categoryRecords) {
    const rules: Array<{
      categoryId: string;
      name: string;
      description: string;
      priority: "critical" | "high" | "medium" | "low";
      conditions: any;
      ruleJson?: any;
      priorityValue: string;
      isActive: boolean;
    }> = [];
    
    if (category.code.includes("BILL")) {
      rules.push(
        { categoryId: category.id, name: "Critical Billing", description: "High value billing issues", priority: "critical" as const, conditions: "amount > 10000", ruleJson: { conditions: [{ field: "amount", operator: ">", value: 10000 }] }, priorityValue: "Critical", isActive: true },
        { categoryId: category.id, name: "High Priority Billing", description: "Medium value billing issues", priority: "high" as const, conditions: "amount > 1000", ruleJson: { conditions: [{ field: "amount", operator: ">", value: 1000 }] }, priorityValue: "High", isActive: true }
      );
    }
    
    if (category.code.includes("DISP")) {
      rules.push(
        { categoryId: category.id, name: "BK24 Priority", description: "Urgent dispute cases", priority: "high" as const, conditions: "daysOld > 30", ruleJson: { conditions: [{ field: "daysOld", operator: ">", value: 30 }] }, priorityValue: "BK24", isActive: true },
        { categoryId: category.id, name: "BK48 Priority", description: "Moderate dispute cases", priority: "medium" as const, conditions: "daysOld > 14", ruleJson: { conditions: [{ field: "daysOld", operator: ">", value: 14 }] }, priorityValue: "BK48", isActive: true }
      );
    }
    
    // Default rule
    rules.push(
      { categoryId: category.id, name: "Default Priority", description: "Default medium priority for all cases", priority: "medium" as const, conditions: "default", ruleJson: { conditions: [], default: true }, priorityValue: "Medium", isActive: true }
    );
    
    await db.insert(priorityRules).values(rules);
  }

  // 8. Create SLA Policies
  console.log("Creating SLA policies...");
  for (const category of categoryRecords) {
    let targetHours = 72; // Default 3 days
    let responseHours = 24; // Default 1 day response
    let priority: "critical" | "high" | "medium" | "low" = "medium";
    
    if (category.code.startsWith("MAIL_")) {
      targetHours = 24; // 1 day for mail
      responseHours = 8;
      priority = "medium";
    }
    if (category.code.startsWith("COMP_")) {
      targetHours = 48; // 2 days for complaints
      responseHours = 12;
      priority = "high";
    }
    if (category.code.startsWith("DISP_")) {
      targetHours = 120; // 5 days for disputes
      responseHours = 24;
      priority = "critical";
    }
    
    await db.insert(slaPolicies).values([{
      categoryId: category.id,
      name: `SLA for ${category.name}`,
      description: `SLA policy for ${category.name} category`,
      priority: priority,
      responseTimeHours: responseHours,
      resolutionTimeHours: targetHours,
      conditions: { default: true },
      targetHours: targetHours,
      clockStartsOn: "case_created",
      pauseOnStatus: ["in_progress"]
    }]);
  }

  // 9. Create Resolution Configs
  console.log("Creating resolution configs...");
  for (const category of categoryRecords) {
    let fieldsConfig: any = {
      disposition: { required: true, type: "select", options: ["Resolved", "Rejected", "Escalated"] },
      notes: { required: true, type: "textarea", maxLength: 1000 }
    };
    
    if (category.code.includes("BILL") || category.code.includes("DISP")) {
      fieldsConfig.settlementAmount = { required: false, type: "currency", min: 0, max: 50000 };
      fieldsConfig.forgivenAmount = { required: false, type: "currency", min: 0, max: 10000 };
    }
    
    if (category.code.includes("COMP") || category.code.includes("DISP")) {
      fieldsConfig.policyViolation = { required: true, type: "select", options: ["Yes", "No", "N/A"] };
    }
    
    await db.insert(resolutionConfigs).values([{
      categoryId: category.id,
      fieldsJson: fieldsConfig
    }]);
  }

  // 10. Create Value Sets
  console.log("Creating value sets...");
  await db.insert(valueSets).values([
    { key: "states", valuesJson: ["AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"] },
    { key: "dispositions", valuesJson: ["Resolved", "Rejected", "Escalated", "Withdrawn", "Transferred"] },
    { key: "flag_types", valuesJson: ["Urgent", "Legal Review", "Executive Escalation", "Compliance Review", "Quality Assurance"] }
  ]);

  // 11. Create Feature Flags
  console.log("Creating feature flags...");
  await db.insert(featureFlags).values([
    { key: "auto_priority_assignment", on: true, audienceJson: { roles: ["agent", "compliance", "admin"] } },
    { key: "sla_monitoring", on: true, audienceJson: { roles: ["compliance", "admin"] } },
    { key: "advanced_reporting", on: true, audienceJson: { roles: ["admin"] } },
    { key: "document_ocr", on: false, audienceJson: { roles: ["agent", "compliance"] } }
  ]);

  // Get the priority rules created for each category to link cases
  const allPriorityRules = await db.select().from(priorityRules);

  // 12. Create Sample Cases
  console.log("Creating sample cases...");
  const sampleCases = await db.insert(cases).values([
    {
      caseTypeId: complaintType.id,
      categoryId: categoryRecords.find(c => c.code === "COMP_SVC")!.id,
      priorityRuleId: allPriorityRules.find(pr => pr.categoryId === categoryRecords.find(c => c.code === "COMP_SVC")!.id && pr.priorityValue === "Medium")!.id,
      customerId: customerRecords[0].id,
      loanId: "LOAN001",
      state: "CA",
      details: "Customer reports poor service quality during recent interaction. Multiple representatives were unable to resolve the issue efficiently.",
      status: "open"
    },
    {
      caseTypeId: disputeType.id,
      categoryId: categoryRecords.find(c => c.code === "DISP_TXN")!.id,
      priorityRuleId: allPriorityRules.find(pr => pr.categoryId === categoryRecords.find(c => c.code === "DISP_TXN")!.id && pr.priorityValue === "BK24")!.id,
      customerId: customerRecords[1].id,
      loanId: "LOAN002",
      state: "NY",
      details: "Customer disputes unauthorized transaction on account. Claims no knowledge of the charge and requests immediate investigation.",
      status: "in_progress"
    },
    {
      caseTypeId: mailType.id,
      categoryId: categoryRecords.find(c => c.code === "MAIL_GEN")!.id,
      priorityRuleId: allPriorityRules.find(pr => pr.categoryId === categoryRecords.find(c => c.code === "MAIL_GEN")!.id && pr.priorityValue === "Medium")!.id,
      customerId: customerRecords[2].id,
      state: "TX",
      details: "General inquiry about account terms and conditions. Customer seeks clarification on recent policy changes.",
      status: "open"
    },
    {
      caseTypeId: complaintType.id,
      categoryId: categoryRecords.find(c => c.code === "COMP_BILL")!.id,
      priorityRuleId: allPriorityRules.find(pr => pr.categoryId === categoryRecords.find(c => c.code === "COMP_BILL")!.id && pr.priorityValue === "High")!.id,
      customerId: customerRecords[3].id,
      loanId: "LOAN003",
      state: "WA",
      details: "Customer received incorrect billing statement. Charges do not match agreed terms from contract.",
      status: "resolved"
    },
    {
      caseTypeId: disputeType.id,
      categoryId: categoryRecords.find(c => c.code === "DISP_BILL")!.id,
      priorityRuleId: allPriorityRules.find(pr => pr.categoryId === categoryRecords.find(c => c.code === "DISP_BILL")!.id && pr.priorityValue === "High")!.id,
      customerId: customerRecords[4].id,
      loanId: "LOAN004",
      state: "FL",
      details: "Customer disputes late fees applied to account. Claims payment was made on time with supporting documentation.",
      status: "open"
    }
  ]).returning();

  // 13. Create Checklist Items for Cases
  console.log("Creating checklist items...");
  for (const caseRecord of sampleCases) {
    const templates = await db.select().from(checklistTemplates)
      .where(eq(checklistTemplates.categoryId, caseRecord.categoryId));
    
    for (const template of templates) {
      await db.insert(checklistItems).values({
        caseId: caseRecord.id,
        key: template.key,
        label: template.label,
        isRequired: template.isRequired,
        status: Math.random() > 0.5 ? "complete" : "open",
        assignedToUserId: Math.random() > 0.5 ? agentUser.id : undefined,
        completedAt: Math.random() > 0.5 ? new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) : undefined
      });
    }
  }

  // 14. Create Sample Documents
  console.log("Creating sample documents...");
  for (let i = 0; i < sampleCases.length; i++) {
    const caseRecord = sampleCases[i];
    await db.insert(documents).values([
      {
        caseId: caseRecord.id,
        key: "customer_statement",
        label: "Customer Statement",
        fileType: "pdf",
        mime: "application/pdf",
        storageKey: `cases/${caseRecord.id}/customer_statement_${Date.now()}.pdf`,
        uploadedByUserId: agentUser.id
      },
      {
        caseId: caseRecord.id,
        key: "supporting_evidence",
        label: "Supporting Evidence",
        fileType: "jpg",
        mime: "image/jpeg",
        storageKey: `cases/${caseRecord.id}/evidence_${Date.now()}.jpg`,
        uploadedByUserId: agentUser.id
      }
    ]);
  }

  // 15. Create Resolutions for resolved cases
  console.log("Creating resolutions...");
  const resolvedCases = sampleCases.filter(c => c.status === "resolved");
  for (const caseRecord of resolvedCases) {
    await db.insert(resolutions).values({
      caseId: caseRecord.id,
      disposition: "Resolved",
      notes: "Issue has been successfully resolved. Customer satisfied with outcome.",
      settlementAmount: "150.00",
      policyViolation: "No"
    });
  }

  // 16. Create Sample Flags
  console.log("Creating flags...");
  await db.insert(flags).values([
    {
      caseId: sampleCases[0].id,
      flagType: "Urgent",
      appliedByUserId: complianceUser.id
    },
    {
      caseId: sampleCases[1].id,
      flagType: "Legal Review",
      appliedByUserId: complianceUser.id
    }
  ]);

  // 17. Create Audit Logs
  console.log("Creating audit logs...");
  for (const caseRecord of sampleCases) {
    await db.insert(auditLogs).values([
      {
        caseId: caseRecord.id,
        actorUserId: agentUser.id,
        action: "case_created",
        details: { 
          message: "Case created and assigned", 
          category: caseRecord.categoryId,
          status: caseRecord.status
        }
      },
      {
        caseId: caseRecord.id,
        actorUserId: complianceUser.id,
        action: "case_reviewed",
        details: { 
          message: "Case reviewed by compliance team",
          notes: "Initial review completed"
        }
      }
    ]);
  }

  console.log("✅ Database seeding completed successfully!");
  console.log(`Created:
    - ${caseTypeRecords.length} case types
    - ${categoryRecords.length} categories
    - ${userRecords.length} users
    - ${customerRecords.length} customers
    - ${sampleCases.length} sample cases
    - Checklist templates, document requirements, and configuration data
    - Sample checklist items, documents, and audit logs
  `);
}

// Run seeding if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seed()
    .then(() => {
      console.log("Seeding complete!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Seeding failed:", error);
      process.exit(1);
    });
}

export { seed };