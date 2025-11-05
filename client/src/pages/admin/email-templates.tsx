import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, Edit, Trash2, Mail, ChevronDown, Check, X, Info } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Template categories
const TEMPLATE_CATEGORIES = ["lender", "customer", "internal", "other"] as const;

// Form schema
const templateSchema = z.object({
  name: z.string().min(1, "Template name is required").max(255, "Name must be 255 characters or less"),
  description: z.string().optional(),
  category: z.enum(TEMPLATE_CATEGORIES, { required_error: "Category is required" }),
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(1, "Body is required"),
  isActive: z.boolean().default(true),
});

type TemplateForm = z.infer<typeof templateSchema>;

type EmailTemplate = {
  id: string;
  name: string;
  description?: string | null;
  category: "lender" | "customer" | "internal" | "other";
  subject: string;
  body: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

// Template variables available for use
const TEMPLATE_VARIABLES = [
  { variable: "{{caseNumber}}", description: "Case number" },
  { variable: "{{customerName}}", description: "Customer name" },
  { variable: "{{customerState}}", description: "Customer state" },
  { variable: "{{lenderName}}", description: "Lender name" },
  { variable: "{{caseType}}", description: "Case type" },
  { variable: "{{category}}", description: "Category" },
  { variable: "{{status}}", description: "Case status" },
  { variable: "{{priority}}", description: "Priority level" },
  { variable: "{{assignedTo}}", description: "Primary assignee name" },
  { variable: "{{secondaryAssignedTo}}", description: "Secondary assignee name" },
  { variable: "{{caseDetails}}", description: "Case details text" },
  { variable: "{{createdDate}}", description: "Case creation date" },
];

export default function EmailTemplatesManagement() {
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [variablesOpen, setVariablesOpen] = useState(false);
  const { toast } = useToast();

  // Fetch templates with filters
  const { data: templates = [], isLoading: loadingTemplates } = useQuery<EmailTemplate[]>({
    queryKey: ["/api/email-templates", categoryFilter, activeFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (categoryFilter !== "all") {
        params.append("category", categoryFilter);
      }
      if (activeFilter === "active") {
        params.append("isActive", "true");
      } else if (activeFilter === "inactive") {
        params.append("isActive", "false");
      }
      
      const url = `/api/email-templates${params.toString() ? `?${params.toString()}` : ""}`;
      const response = await fetch(url, {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch templates");
      }
      
      const result = await response.json();
      return result.data || [];
    },
  });

  // Form setup
  const form = useForm<TemplateForm>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: "",
      description: "",
      category: "other",
      subject: "",
      body: "",
      isActive: true,
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: TemplateForm) => apiRequest("POST", "/api/email-templates", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-templates"] });
      setShowDialog(false);
      form.reset();
      toast({
        title: "Success",
        description: "Email template created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create email template",
        variant: "destructive",
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: TemplateForm }) =>
      apiRequest("PUT", `/api/email-templates/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-templates"] });
      setShowDialog(false);
      setEditingTemplate(null);
      form.reset();
      toast({
        title: "Success",
        description: "Email template updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update email template",
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/email-templates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-templates"] });
      setDeleteConfirm(null);
      toast({
        title: "Success",
        description: "Email template deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete email template",
        variant: "destructive",
      });
    },
  });

  const handleCreate = () => {
    setEditingTemplate(null);
    form.reset({
      name: "",
      description: "",
      category: "other",
      subject: "",
      body: "",
      isActive: true,
    });
    setVariablesOpen(false);
    setShowDialog(true);
  };

  const handleEdit = (template: EmailTemplate) => {
    setEditingTemplate(template);
    form.reset({
      name: template.name,
      description: template.description || "",
      category: template.category,
      subject: template.subject,
      body: template.body,
      isActive: template.isActive,
    });
    setVariablesOpen(false);
    setShowDialog(true);
  };

  const handleSubmit = (data: TemplateForm) => {
    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (template: EmailTemplate) => {
    setDeleteConfirm({ id: template.id, name: template.name });
  };

  const confirmDelete = () => {
    if (deleteConfirm) {
      deleteMutation.mutate(deleteConfirm.id);
    }
  };

  const getCategoryBadgeVariant = (category: string) => {
    switch (category) {
      case "lender":
        return "default";
      case "customer":
        return "secondary";
      case "internal":
        return "outline";
      default:
        return "outline";
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="title-email-templates">
            Email Templates Management
          </h1>
          <p className="text-muted-foreground">
            Manage email templates with support for dynamic variables
          </p>
        </div>
        <Button onClick={handleCreate} data-testid="button-create-template">
          <Plus className="h-4 w-4 mr-2" />
          Create Template
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Category</label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger data-testid="select-category-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="lender">Lender</SelectItem>
                  <SelectItem value="customer">Customer</SelectItem>
                  <SelectItem value="internal">Internal</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={activeFilter} onValueChange={setActiveFilter}>
                <SelectTrigger data-testid="select-active-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Templates Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Templates
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingTemplates ? (
            <div className="text-center py-8">Loading templates...</div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No templates found. Create your first template to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => (
                  <TableRow key={template.id} data-testid={`row-template-${template.id}`}>
                    <TableCell className="font-medium" data-testid={`text-name-${template.id}`}>
                      {template.name}
                    </TableCell>
                    <TableCell className="max-w-xs truncate" data-testid={`text-description-${template.id}`}>
                      {template.description || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getCategoryBadgeVariant(template.category)} data-testid={`badge-category-${template.id}`}>
                        {template.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-sm truncate" data-testid={`text-subject-${template.id}`}>
                      {template.subject}
                    </TableCell>
                    <TableCell data-testid={`status-active-${template.id}`}>
                      {template.isActive ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(template)}
                          data-testid={`button-edit-${template.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(template)}
                          data-testid={`button-delete-${template.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
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

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle data-testid="dialog-title">
              {editingTemplate ? "Edit Email Template" : "Create Email Template"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g., Case Assignment Notification"
                        data-testid="input-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Brief description of when this template is used"
                        data-testid="input-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-category">
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="lender">Lender</SelectItem>
                        <SelectItem value="customer">Customer</SelectItem>
                        <SelectItem value="internal">Internal</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g., Case {{caseNumber}} - {{status}}"
                        data-testid="input-subject"
                      />
                    </FormControl>
                    <FormDescription>
                      Supports template variables (see below)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="body"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Body *</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Email body content with template variables..."
                        className="min-h-[500px] font-mono text-sm"
                        data-testid="textarea-body"
                      />
                    </FormControl>
                    <FormDescription>
                      Supports template variables (see below)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Active</FormLabel>
                      <FormDescription>
                        Enable this template for use in the system
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-active"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* Template Variables Help */}
              <Collapsible open={variablesOpen} onOpenChange={setVariablesOpen}>
                <CollapsibleTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-between"
                    data-testid="button-toggle-variables"
                  >
                    <span className="flex items-center gap-2">
                      <Info className="h-4 w-4" />
                      Available Template Variables
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${variablesOpen ? "rotate-180" : ""}`}
                    />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground mb-3">
                        Use these variables in the subject or body. They will be replaced with actual values when the email is sent:
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {TEMPLATE_VARIABLES.map(({ variable, description }) => (
                          <div key={variable} className="flex items-start gap-2 text-sm">
                            <code className="bg-muted px-2 py-0.5 rounded text-xs font-mono whitespace-nowrap">
                              {variable}
                            </code>
                            <span className="text-muted-foreground">- {description}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </CollapsibleContent>
              </Collapsible>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowDialog(false)}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-submit"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? "Saving..."
                    : editingTemplate
                    ? "Update Template"
                    : "Create Template"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Email Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the template "{deleteConfirm?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover-elevate"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
