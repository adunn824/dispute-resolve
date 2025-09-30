import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit, Trash2, Zap, Clock, Tag, TestTube, ListChecks } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { RuleBuilder, type RuleCondition } from "@/components/RuleBuilder";
import { RuleTester } from "@/components/RuleTester";

// Form schemas
const priorityRuleSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be 100 characters or less"),
  description: z.string().min(1, "Description is required").max(255, "Description must be 255 characters or less"),
  priority: z.enum(["critical", "high", "medium", "low"]),
  conditions: z.array(z.object({
    field: z.string(),
    operator: z.string(),
    value: z.any().optional()
  })).min(1, "At least one condition is required"),
  active: z.boolean().default(true),
});

const tagRuleSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be 100 characters or less"),
  description: z.string().min(1, "Description is required").max(255, "Description must be 255 characters or less"),
  tag: z.string().min(1, "Tag is required").max(50, "Tag must be 50 characters or less"),
  conditions: z.array(z.object({
    field: z.string(),
    operator: z.string(),
    value: z.any().optional()
  })).min(1, "At least one condition is required"),
  active: z.boolean().default(true),
});

const slaPolicySchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be 100 characters or less"),
  description: z.string().min(1, "Description is required").max(255, "Description must be 255 characters or less"),
  priority: z.enum(["critical", "high", "medium", "low"]),
  responseTimeHours: z.number().min(1, "Response time must be at least 1 hour").max(168, "Response time cannot exceed 1 week"),
  resolutionTimeHours: z.number().min(1, "Resolution time must be at least 1 hour").max(720, "Resolution time cannot exceed 1 month"),
  conditions: z.array(z.object({
    field: z.string(),
    operator: z.string(),
    value: z.any().optional()
  })).min(1, "At least one condition is required"),
  active: z.boolean().default(true),
});

const checklistAssignmentRuleSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be 100 characters or less"),
  description: z.string().min(1, "Description is required").max(255, "Description must be 255 characters or less"),
  templateId: z.string().min(1, "Template is required"),
  conditions: z.array(z.object({
    field: z.string(),
    operator: z.string(),
    value: z.any().optional()
  })).min(1, "At least one condition is required"),
  active: z.boolean().default(true),
});

type PriorityRuleForm = z.infer<typeof priorityRuleSchema>;
type TagRuleForm = z.infer<typeof tagRuleSchema>;
type SLAPolicyForm = z.infer<typeof slaPolicySchema>;
type ChecklistAssignmentRuleForm = z.infer<typeof checklistAssignmentRuleSchema>;

type PriorityRule = {
  id: string;
  name: string;
  description: string;
  priority: "critical" | "high" | "medium" | "low";
  conditions: string;
  active: boolean;
};

type TagRule = {
  id: string;
  name: string;
  description: string;
  tag: string;
  conditions: string;
  active: boolean;
};

type SLAPolicy = {
  id: string;
  name: string;
  description: string;
  priority: "critical" | "high" | "medium" | "low";
  responseTimeHours: number;
  resolutionTimeHours: number;
  active: boolean;
};

type ChecklistAssignmentRule = {
  id: string;
  name: string;
  description: string;
  templateId: string;
  conditions: string;
  active: boolean;
};

type ReusableTemplate = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
};

export default function BusinessRulesManagement() {
  const [activeTab, setActiveTab] = useState("priority");
  const [editingPriorityRule, setEditingPriorityRule] = useState<any>(null);
  const [editingTagRule, setEditingTagRule] = useState<any>(null);
  const [editingSLAPolicy, setEditingSLAPolicy] = useState<any>(null);
  const [editingChecklistRule, setEditingChecklistRule] = useState<any>(null);
  const [showPriorityDialog, setShowPriorityDialog] = useState(false);
  const [showTagDialog, setShowTagDialog] = useState(false);
  const [showSLADialog, setShowSLADialog] = useState(false);
  const [showChecklistDialog, setShowChecklistDialog] = useState(false);
  const { toast } = useToast();

  // Fetch data
  const { data: priorityRules = [], isLoading: loadingPriorityRules } = useQuery<PriorityRule[]>({
    queryKey: ["/api/priority-rules"],
    select: (response: any) => response.data || [],
  });

  const { data: tagRules = [], isLoading: loadingTagRules } = useQuery<TagRule[]>({
    queryKey: ["/api/tag-rules"],
    select: (response: any) => response.data || [],
  });

  const { data: slaPolicies = [], isLoading: loadingSLAPolicies } = useQuery<SLAPolicy[]>({
    queryKey: ["/api/sla-policies"],
    select: (response: any) => response.data || [],
  });

  const { data: checklistAssignmentRules = [], isLoading: loadingChecklistRules } = useQuery<ChecklistAssignmentRule[]>({
    queryKey: ["/api/checklist-assignment-rules"],
    select: (response: any) => response.data || [],
  });

  const { data: reusableTemplates = [], isLoading: loadingTemplates } = useQuery<ReusableTemplate[]>({
    queryKey: ["/api/reusable-checklist-templates"],
    select: (response: any) => response.data || response || [],
  });

  // Forms
  const priorityRuleForm = useForm<PriorityRuleForm>({
    resolver: zodResolver(priorityRuleSchema),
    defaultValues: {
      name: "",
      description: "",
      priority: "medium",
      conditions: [{ field: "details", operator: "contains", value: "" }],
      active: true,
    },
  });

  const tagRuleForm = useForm<TagRuleForm>({
    resolver: zodResolver(tagRuleSchema),
    defaultValues: {
      name: "",
      description: "",
      tag: "",
      conditions: [{ field: "details", operator: "contains", value: "" }],
      active: true,
    },
  });

  const slaPolicyForm = useForm<SLAPolicyForm>({
    resolver: zodResolver(slaPolicySchema),
    defaultValues: {
      name: "",
      description: "",
      priority: "medium",
      responseTimeHours: 24,
      resolutionTimeHours: 72,
      conditions: [{ field: "caseOriginationName", operator: "equals", value: "" }],
      active: true,
    },
  });

  const checklistRuleForm = useForm<ChecklistAssignmentRuleForm>({
    resolver: zodResolver(checklistAssignmentRuleSchema),
    defaultValues: {
      name: "",
      description: "",
      templateId: "",
      conditions: [{ field: "details", operator: "contains", value: "" }],
      active: true,
    },
  });

  // Priority Rule mutations
  const createPriorityRuleMutation = useMutation({
    mutationFn: (data: PriorityRuleForm) => 
      apiRequest("POST", "/api/priority-rules", {
        ...data,
        conditions: JSON.stringify(data.conditions)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/priority-rules"] });
      setShowPriorityDialog(false);
      priorityRuleForm.reset();
      toast({ title: "Success", description: "Priority rule created successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create priority rule", variant: "destructive" });
    },
  });

  const updatePriorityRuleMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: PriorityRuleForm }) => 
      apiRequest("PUT", `/api/priority-rules/${id}`, {
        ...data,
        conditions: JSON.stringify(data.conditions)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/priority-rules"] });
      setShowPriorityDialog(false);
      setEditingPriorityRule(null);
      priorityRuleForm.reset();
      toast({ title: "Success", description: "Priority rule updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update priority rule", variant: "destructive" });
    },
  });

  const deletePriorityRuleMutation = useMutation({
    mutationFn: (id: string) => 
      apiRequest("DELETE", `/api/priority-rules/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/priority-rules"] });
      toast({ title: "Success", description: "Priority rule deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete priority rule", variant: "destructive" });
    },
  });

  // Tag Rule mutations
  const createTagRuleMutation = useMutation({
    mutationFn: (data: TagRuleForm) => 
      apiRequest("POST", "/api/tag-rules", {
        ...data,
        conditions: JSON.stringify(data.conditions)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tag-rules"] });
      setShowTagDialog(false);
      tagRuleForm.reset();
      toast({ title: "Success", description: "Tag rule created successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create tag rule", variant: "destructive" });
    },
  });

  const updateTagRuleMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: TagRuleForm }) => 
      apiRequest("PUT", `/api/tag-rules/${id}`, {
        ...data,
        conditions: JSON.stringify(data.conditions)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tag-rules"] });
      setShowTagDialog(false);
      setEditingTagRule(null);
      tagRuleForm.reset();
      toast({ title: "Success", description: "Tag rule updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update tag rule", variant: "destructive" });
    },
  });

  const deleteTagRuleMutation = useMutation({
    mutationFn: (id: string) => 
      apiRequest("DELETE", `/api/tag-rules/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tag-rules"] });
      toast({ title: "Success", description: "Tag rule deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete tag rule", variant: "destructive" });
    },
  });

  // SLA Policy mutations
  const createSLAPolicyMutation = useMutation({
    mutationFn: (data: SLAPolicyForm) => 
      apiRequest("POST", "/api/sla-policies", {
        ...data,
        conditions: JSON.stringify(data.conditions)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sla-policies"] });
      setShowSLADialog(false);
      slaPolicyForm.reset();
      toast({ title: "Success", description: "SLA policy created successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create SLA policy", variant: "destructive" });
    },
  });

  const updateSLAPolicyMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: SLAPolicyForm }) => 
      apiRequest("PUT", `/api/sla-policies/${id}`, {
        ...data,
        conditions: JSON.stringify(data.conditions)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sla-policies"] });
      setShowSLADialog(false);
      setEditingSLAPolicy(null);
      slaPolicyForm.reset();
      toast({ title: "Success", description: "SLA policy updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update SLA policy", variant: "destructive" });
    },
  });

  const deleteSLAPolicyMutation = useMutation({
    mutationFn: (id: string) => 
      apiRequest("DELETE", `/api/sla-policies/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sla-policies"] });
      toast({ title: "Success", description: "SLA policy deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete SLA policy", variant: "destructive" });
    },
  });

  // Checklist Assignment Rule mutations
  const createChecklistRuleMutation = useMutation({
    mutationFn: (data: ChecklistAssignmentRuleForm) => 
      apiRequest("POST", "/api/checklist-assignment-rules", {
        ...data,
        conditions: JSON.stringify(data.conditions)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/checklist-assignment-rules"] });
      setShowChecklistDialog(false);
      checklistRuleForm.reset();
      toast({ title: "Success", description: "Checklist assignment rule created successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create checklist assignment rule", variant: "destructive" });
    },
  });

  const updateChecklistRuleMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ChecklistAssignmentRuleForm }) => 
      apiRequest("PUT", `/api/checklist-assignment-rules/${id}`, {
        ...data,
        conditions: JSON.stringify(data.conditions)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/checklist-assignment-rules"] });
      setShowChecklistDialog(false);
      setEditingChecklistRule(null);
      checklistRuleForm.reset();
      toast({ title: "Success", description: "Checklist assignment rule updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update checklist assignment rule", variant: "destructive" });
    },
  });

  const deleteChecklistRuleMutation = useMutation({
    mutationFn: (id: string) => 
      apiRequest("DELETE", `/api/checklist-assignment-rules/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/checklist-assignment-rules"] });
      toast({ title: "Success", description: "Checklist assignment rule deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete checklist assignment rule", variant: "destructive" });
    },
  });

  // Handlers
  const handleEditPriorityRule = (rule: any) => {
    setEditingPriorityRule(rule);
    
    // Parse conditions from JSON string to array
    let parsedConditions;
    try {
      parsedConditions = typeof rule.conditions === 'string' 
        ? JSON.parse(rule.conditions) 
        : rule.conditions || [{ field: "details", operator: "contains", value: "" }];
    } catch (error) {
      console.error("Error parsing rule conditions:", error);
      parsedConditions = [{ field: "details", operator: "contains", value: "" }];
    }

    priorityRuleForm.reset({
      name: rule.name,
      description: rule.description,
      priority: rule.priority,
      conditions: parsedConditions,
      active: rule.active,
    });
    setShowPriorityDialog(true);
  };

  const handleEditTagRule = (rule: any) => {
    setEditingTagRule(rule);
    
    // Parse conditions from JSON string to array
    let parsedConditions;
    try {
      parsedConditions = typeof rule.conditions === 'string' 
        ? JSON.parse(rule.conditions) 
        : rule.conditions || [{ field: "details", operator: "contains", value: "" }];
    } catch (error) {
      console.error("Error parsing rule conditions:", error);
      parsedConditions = [{ field: "details", operator: "contains", value: "" }];
    }

    tagRuleForm.reset({
      name: rule.name,
      description: rule.description,
      tag: rule.tag,
      conditions: parsedConditions,
      active: rule.active,
    });
    setShowTagDialog(true);
  };

  const handleEditSLAPolicy = (policy: any) => {
    setEditingSLAPolicy(policy);
    
    // Parse conditions from JSON string
    let parsedConditions;
    try {
      parsedConditions = typeof policy.conditions === "string" 
        ? JSON.parse(policy.conditions) 
        : policy.conditions;
    } catch (error) {
      console.error("Error parsing policy conditions:", error);
      parsedConditions = [{ field: "caseOriginationName", operator: "equals", value: "" }];
    }
    
    slaPolicyForm.reset({
      name: policy.name,
      description: policy.description,
      priority: policy.priority,
      responseTimeHours: policy.responseTimeHours,
      resolutionTimeHours: policy.resolutionTimeHours,
      conditions: parsedConditions,
      active: policy.active,
    });
    setShowSLADialog(true);
  };

  const handleEditChecklistRule = (rule: any) => {
    setEditingChecklistRule(rule);
    
    // Parse conditions from JSON string to array
    let parsedConditions;
    try {
      parsedConditions = typeof rule.conditions === 'string' 
        ? JSON.parse(rule.conditions) 
        : rule.conditions || [{ field: "details", operator: "contains", value: "" }];
    } catch (error) {
      console.error("Error parsing rule conditions:", error);
      parsedConditions = [{ field: "details", operator: "contains", value: "" }];
    }

    checklistRuleForm.reset({
      name: rule.name,
      description: rule.description,
      templateId: rule.templateId,
      conditions: parsedConditions,
      active: rule.active,
    });
    setShowChecklistDialog(true);
  };

  const onPriorityRuleSubmit = (data: PriorityRuleForm) => {
    if (editingPriorityRule) {
      updatePriorityRuleMutation.mutate({ id: editingPriorityRule.id, data });
    } else {
      createPriorityRuleMutation.mutate(data);
    }
  };

  const onTagRuleSubmit = (data: TagRuleForm) => {
    if (editingTagRule) {
      updateTagRuleMutation.mutate({ id: editingTagRule.id, data });
    } else {
      createTagRuleMutation.mutate(data);
    }
  };

  const onSLAPolicySubmit = (data: SLAPolicyForm) => {
    if (editingSLAPolicy) {
      updateSLAPolicyMutation.mutate({ id: editingSLAPolicy.id, data });
    } else {
      createSLAPolicyMutation.mutate(data);
    }
  };

  const onChecklistRuleSubmit = (data: ChecklistAssignmentRuleForm) => {
    if (editingChecklistRule) {
      updateChecklistRuleMutation.mutate({ id: editingChecklistRule.id, data });
    } else {
      createChecklistRuleMutation.mutate(data);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical": return "destructive";
      case "high": return "secondary";
      case "medium": return "outline";
      case "low": return "default";
      default: return "outline";
    }
  };

  return (
    <div className="space-y-6" data-testid="business-rules-management">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Business Rules</h1>
          <p className="text-muted-foreground">Manage priority rules, tag automation, and SLA policies</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="priority" data-testid="tab-priority-rules">
            <Zap className="w-4 h-4 mr-2" />
            Priority Rules
          </TabsTrigger>
          <TabsTrigger value="tags" data-testid="tab-tag-rules">
            <Tag className="w-4 h-4 mr-2" />
            Tag Rules
          </TabsTrigger>
          <TabsTrigger value="checklists" data-testid="tab-checklist-rules">
            <ListChecks className="w-4 h-4 mr-2" />
            Checklist Rules
          </TabsTrigger>
          <TabsTrigger value="sla" data-testid="tab-sla-policies">
            <Clock className="w-4 h-4 mr-2" />
            SLA Policies
          </TabsTrigger>
          <TabsTrigger value="test" data-testid="tab-rule-testing">
            <TestTube className="w-4 h-4 mr-2" />
            Rule Testing
          </TabsTrigger>
        </TabsList>

        <TabsContent value="priority" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Priority Rules</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Configure automatic priority assignment based on case attributes
                </p>
              </div>
              <Dialog open={showPriorityDialog} onOpenChange={setShowPriorityDialog}>
                <DialogTrigger asChild>
                  <Button data-testid="button-add-priority-rule">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Priority Rule
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>
                      {editingPriorityRule ? "Edit Priority Rule" : "Create Priority Rule"}
                    </DialogTitle>
                  </DialogHeader>
                  <Form {...priorityRuleForm}>
                    <form onSubmit={priorityRuleForm.handleSubmit(onPriorityRuleSubmit)} className="space-y-4">
                      <FormField
                        control={priorityRuleForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Rule name..." {...field} data-testid="input-priority-rule-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={priorityRuleForm.control}
                        name="priority"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Priority Level</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-priority-level">
                                  <SelectValue placeholder="Select priority level" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="critical">Critical</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="low">Low</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={priorityRuleForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Brief description of this rule..." 
                                {...field}
                                data-testid="input-priority-rule-description"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={priorityRuleForm.control}
                        name="conditions"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <RuleBuilder
                                conditions={field.value || []}
                                onChange={field.onChange}
                                data-testid="rule-builder-priority-conditions"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={priorityRuleForm.control}
                        name="active"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between">
                            <FormLabel>Active</FormLabel>
                            <FormControl>
                              <Switch 
                                checked={field.value} 
                                onCheckedChange={field.onChange}
                                data-testid="switch-priority-rule-active"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <div className="flex justify-end gap-2">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => {
                            setShowPriorityDialog(false);
                            setEditingPriorityRule(null);
                            priorityRuleForm.reset();
                          }}
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="submit" 
                          disabled={createPriorityRuleMutation.isPending || updatePriorityRuleMutation.isPending}
                          data-testid="button-save-priority-rule"
                        >
                          {editingPriorityRule ? "Update" : "Create"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {loadingPriorityRules ? (
                <div>Loading priority rules...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {priorityRules.map((rule: any) => (
                      <TableRow key={rule.id}>
                        <TableCell className="font-medium">{rule.name}</TableCell>
                        <TableCell>
                          <Badge variant={getPriorityColor(rule.priority)}>
                            {rule.priority.charAt(0).toUpperCase() + rule.priority.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>{rule.description}</TableCell>
                        <TableCell>
                          <Badge variant={rule.active ? "default" : "secondary"}>
                            {rule.active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditPriorityRule(rule)}
                              data-testid={`button-edit-priority-rule-${rule.id}`}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => deletePriorityRuleMutation.mutate(rule.id)}
                              disabled={deletePriorityRuleMutation.isPending}
                              data-testid={`button-delete-priority-rule-${rule.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tags" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Tag Rules</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Configure automatic tagging based on case content
                </p>
              </div>
              <Dialog open={showTagDialog} onOpenChange={setShowTagDialog}>
                <DialogTrigger asChild>
                  <Button data-testid="button-add-tag-rule">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Tag Rule
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>
                      {editingTagRule ? "Edit Tag Rule" : "Create Tag Rule"}
                    </DialogTitle>
                  </DialogHeader>
                  <Form {...tagRuleForm}>
                    <form onSubmit={tagRuleForm.handleSubmit(onTagRuleSubmit)} className="space-y-4">
                      <FormField
                        control={tagRuleForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Rule name..." {...field} data-testid="input-tag-rule-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={tagRuleForm.control}
                        name="tag"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tag</FormLabel>
                            <FormControl>
                              <Input placeholder="do-not-contact, fraud-alert..." {...field} data-testid="input-tag-rule-tag" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={tagRuleForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Brief description of this rule..." 
                                {...field}
                                data-testid="input-tag-rule-description"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={tagRuleForm.control}
                        name="conditions"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <RuleBuilder
                                conditions={field.value || []}
                                onChange={field.onChange}
                                data-testid="rule-builder-tag-conditions"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={tagRuleForm.control}
                        name="active"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between">
                            <FormLabel>Active</FormLabel>
                            <FormControl>
                              <Switch 
                                checked={field.value} 
                                onCheckedChange={field.onChange}
                                data-testid="switch-tag-rule-active"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <div className="flex justify-end gap-2">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => {
                            setShowTagDialog(false);
                            setEditingTagRule(null);
                            tagRuleForm.reset();
                          }}
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="submit" 
                          disabled={createTagRuleMutation.isPending || updateTagRuleMutation.isPending}
                          data-testid="button-save-tag-rule"
                        >
                          {editingTagRule ? "Update" : "Create"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {loadingTagRules ? (
                <div>Loading tag rules...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Tag</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tagRules.map((rule: any) => (
                      <TableRow key={rule.id}>
                        <TableCell className="font-medium">{rule.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{rule.tag}</Badge>
                        </TableCell>
                        <TableCell>{rule.description}</TableCell>
                        <TableCell>
                          <Badge variant={rule.active ? "default" : "secondary"}>
                            {rule.active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditTagRule(rule)}
                              data-testid={`button-edit-tag-rule-${rule.id}`}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => deleteTagRuleMutation.mutate(rule.id)}
                              disabled={deleteTagRuleMutation.isPending}
                              data-testid={`button-delete-tag-rule-${rule.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="checklists" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Checklist Assignment Rules</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Automatically assign reusable checklist templates to cases based on conditions
                </p>
              </div>
              <Dialog open={showChecklistDialog} onOpenChange={setShowChecklistDialog}>
                <DialogTrigger asChild>
                  <Button data-testid="button-add-checklist-rule">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Checklist Rule
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingChecklistRule ? "Edit Checklist Assignment Rule" : "Create Checklist Assignment Rule"}
                    </DialogTitle>
                  </DialogHeader>
                  <Form {...checklistRuleForm}>
                    <form onSubmit={checklistRuleForm.handleSubmit(onChecklistRuleSubmit)} className="space-y-4">
                      <FormField
                        control={checklistRuleForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Rule Name</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., BBB Complaint Standard Checklist" {...field} data-testid="input-checklist-rule-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={checklistRuleForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Brief description of when this checklist should be assigned..." 
                                {...field}
                                data-testid="input-checklist-rule-description"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={checklistRuleForm.control}
                        name="templateId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Checklist Template</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-checklist-template">
                                  <SelectValue placeholder="Select a checklist template to assign" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {reusableTemplates.filter(t => t.isActive).map((template) => (
                                  <SelectItem key={template.id} value={template.id}>
                                    {template.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={checklistRuleForm.control}
                        name="conditions"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Conditions</FormLabel>
                            <FormControl>
                              <RuleBuilder
                                conditions={field.value}
                                onChange={field.onChange}
                                allowedFields={['caseOriginationName', 'caseTypeName', 'categoryName', 'state', 'lenderName']}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={checklistRuleForm.control}
                        name="active"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between">
                            <FormLabel>Active</FormLabel>
                            <FormControl>
                              <Switch 
                                checked={field.value} 
                                onCheckedChange={field.onChange}
                                data-testid="switch-checklist-rule-active"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <div className="flex justify-end gap-2">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => {
                            setShowChecklistDialog(false);
                            setEditingChecklistRule(null);
                            checklistRuleForm.reset();
                          }}
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="submit" 
                          data-testid="button-submit-checklist-rule"
                        >
                          {editingChecklistRule ? "Update" : "Create"} Rule
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {loadingChecklistRules ? (
                <div className="text-center py-4">Loading checklist assignment rules...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Template</TableHead>
                      <TableHead>Conditions</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {checklistAssignmentRules.map((rule) => {
                      const template = reusableTemplates.find(t => t.id === rule.templateId);
                      const conditionsArray = Array.isArray(rule.conditions) 
                        ? rule.conditions 
                        : (typeof rule.conditions === 'string' ? JSON.parse(rule.conditions || "[]") : []);
                      const conditionsCount = conditionsArray.length;
                      return (
                        <TableRow key={rule.id} data-testid={`row-checklist-rule-${rule.id}`}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{rule.name}</div>
                              <div className="text-sm text-muted-foreground">{rule.description}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {template ? (
                              <Badge variant="outline">{template.name}</Badge>
                            ) : (
                              <span className="text-muted-foreground">Unknown Template</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {conditionsCount} condition{conditionsCount !== 1 ? 's' : ''}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={rule.active ? "default" : "outline"}>
                              {rule.active ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditChecklistRule(rule)}
                                disabled={updateChecklistRuleMutation.isPending}
                                data-testid={`button-edit-checklist-rule-${rule.id}`}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => deleteChecklistRuleMutation.mutate(rule.id)}
                                disabled={deleteChecklistRuleMutation.isPending}
                                data-testid={`button-delete-checklist-rule-${rule.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
              {!loadingChecklistRules && checklistAssignmentRules.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No checklist assignment rules configured. Create your first rule to automatically assign checklists based on case attributes.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sla" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>SLA Policies</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Configure service level agreements and deadlines
                </p>
              </div>
              <Dialog open={showSLADialog} onOpenChange={setShowSLADialog}>
                <DialogTrigger asChild>
                  <Button data-testid="button-add-sla-policy">
                    <Plus className="w-4 h-4 mr-2" />
                    Add SLA Policy
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingSLAPolicy ? "Edit SLA Policy" : "Create SLA Policy"}
                    </DialogTitle>
                  </DialogHeader>
                  <Form {...slaPolicyForm}>
                    <form onSubmit={slaPolicyForm.handleSubmit(onSLAPolicySubmit)} className="space-y-4">
                      <FormField
                        control={slaPolicyForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Policy name..." {...field} data-testid="input-sla-policy-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={slaPolicyForm.control}
                        name="priority"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Priority Level</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-sla-priority">
                                  <SelectValue placeholder="Select priority level" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="critical">Critical</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="low">Low</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={slaPolicyForm.control}
                          name="responseTimeHours"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Response Time (Hours)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  placeholder="24" 
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                  data-testid="input-sla-response-time"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={slaPolicyForm.control}
                          name="resolutionTimeHours"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Resolution Time (Hours)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  placeholder="72" 
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                  data-testid="input-sla-resolution-time"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={slaPolicyForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Brief description of this policy..." 
                                {...field}
                                data-testid="input-sla-policy-description"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={slaPolicyForm.control}
                        name="conditions"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Conditions</FormLabel>
                            <FormControl>
                              <RuleBuilder
                                conditions={field.value}
                                onChange={field.onChange}
                                allowedFields={['caseOriginationName', 'caseTypeName', 'categoryName', 'state', 'lenderName']}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={slaPolicyForm.control}
                        name="active"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between">
                            <FormLabel>Active</FormLabel>
                            <FormControl>
                              <Switch 
                                checked={field.value} 
                                onCheckedChange={field.onChange}
                                data-testid="switch-sla-policy-active"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <div className="flex justify-end gap-2">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => {
                            setShowSLADialog(false);
                            setEditingSLAPolicy(null);
                            slaPolicyForm.reset();
                          }}
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="submit" 
                          disabled={createSLAPolicyMutation.isPending || updateSLAPolicyMutation.isPending}
                          data-testid="button-save-sla-policy"
                        >
                          {editingSLAPolicy ? "Update" : "Create"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {loadingSLAPolicies ? (
                <div>Loading SLA policies...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Response Time</TableHead>
                      <TableHead>Resolution Time</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {slaPolicies.map((policy: any) => (
                      <TableRow key={policy.id}>
                        <TableCell className="font-medium">{policy.name}</TableCell>
                        <TableCell>
                          <Badge variant={getPriorityColor(policy.priority)}>
                            {policy.priority.charAt(0).toUpperCase() + policy.priority.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>{policy.responseTimeHours}h</TableCell>
                        <TableCell>{policy.resolutionTimeHours}h</TableCell>
                        <TableCell>
                          <Badge variant={policy.active ? "default" : "secondary"}>
                            {policy.active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditSLAPolicy(policy)}
                              data-testid={`button-edit-sla-policy-${policy.id}`}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => deleteSLAPolicyMutation.mutate(policy.id)}
                              disabled={deleteSLAPolicyMutation.isPending}
                              data-testid={`button-delete-sla-policy-${policy.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="test" className="mt-6">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Rule Testing</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Test your rules against existing cases or mock data to validate behavior
                </p>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="priority" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="priority">Priority Rules</TabsTrigger>
                  <TabsTrigger value="tag">Tag Rules</TabsTrigger>
                </TabsList>
                <TabsContent value="priority">
                  <RuleTester ruleType="priority" />
                </TabsContent>
                <TabsContent value="tag">
                  <RuleTester ruleType="tag" />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}