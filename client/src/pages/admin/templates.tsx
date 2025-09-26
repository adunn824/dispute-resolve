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
import { Plus, Edit, Trash2, FileCheck, FileX, ArrowUp, ArrowDown } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Form schemas
const checklistTemplateSchema = z.object({
  key: z.string().min(1, "Key is required").max(50, "Key must be 50 characters or less"),
  label: z.string().min(1, "Label is required").max(100, "Label must be 100 characters or less"),
  sortOrder: z.number().min(0, "Sort order must be 0 or greater"),
  isRequired: z.boolean().default(false),
  helpText: z.string().optional(),
  conditionJson: z.string().optional().transform((val) => val ? JSON.parse(val) : null),
});

const documentRequirementSchema = z.object({
  key: z.string().min(1, "Key is required").max(50, "Key must be 50 characters or less"),
  label: z.string().min(1, "Label is required").max(100, "Label must be 100 characters or less"),
  isRequired: z.boolean().default(false),
  mimeWhitelist: z.string().optional(),
  conditionJson: z.string().optional(),
});

type ChecklistTemplateForm = z.infer<typeof checklistTemplateSchema>;
type DocumentRequirementForm = z.infer<typeof documentRequirementSchema>;

type ChecklistTemplate = {
  id: string;
  categoryId: string;
  key: string;
  label: string;
  sortOrder: number;
  isRequired: boolean;
  conditionJson: any;
  helpText: string;
};

type DocumentRequirement = {
  id: string;
  categoryId: string;
  key: string;
  label: string;
  isRequired: boolean;
  mimeWhitelist: string[];
  conditionJson: any;
};

type Category = {
  id: string;
  name: string;
  description: string;
  caseTypeId: string;
};

export default function TemplatesManagement() {
  const [activeTab, setActiveTab] = useState("checklist");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [editingRequirement, setEditingRequirement] = useState<any>(null);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showRequirementDialog, setShowRequirementDialog] = useState(false);
  const { toast } = useToast();

  // Fetch categories
  const { data: categories = [], isLoading: loadingCategories } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
    select: (response: any) => response.data || [],
  });

  // Fetch checklist templates for selected category
  const { data: checklistTemplates = [], isLoading: loadingTemplates, refetch: refetchTemplates } = useQuery<ChecklistTemplate[]>({
    queryKey: ["/api/categories", selectedCategoryId, "checklist-templates"],
    enabled: !!selectedCategoryId,
    select: (response: any) => response.data || [],
  });

  // Fetch document requirements for selected category
  const { data: documentRequirements = [], isLoading: loadingRequirements, refetch: refetchRequirements } = useQuery<DocumentRequirement[]>({
    queryKey: ["/api/categories", selectedCategoryId, "document-requirements"],
    enabled: !!selectedCategoryId,
    select: (response: any) => response.data || [],
  });

  // Forms
  const templateForm = useForm<ChecklistTemplateForm>({
    resolver: zodResolver(checklistTemplateSchema),
    defaultValues: {
      key: "",
      label: "",
      sortOrder: 0,
      isRequired: false,
      helpText: "",
      conditionJson: "",
    },
  });

  const requirementForm = useForm<DocumentRequirementForm>({
    resolver: zodResolver(documentRequirementSchema),
    defaultValues: {
      key: "",
      label: "",
      isRequired: false,
      mimeWhitelist: "",
      conditionJson: "",
    },
  });

  // Checklist Template mutations
  const createTemplateMutation = useMutation({
    mutationFn: (data: ChecklistTemplateForm & { categoryId: string }) => 
      apiRequest(`/api/categories/${data.categoryId}/checklist-templates`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories", selectedCategoryId, "checklist-templates"] });
      setShowTemplateDialog(false);
      templateForm.reset();
      toast({ title: "Success", description: "Checklist template created successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create checklist template", variant: "destructive" });
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ChecklistTemplateForm }) => 
      apiRequest(`/api/checklist-templates/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories", selectedCategoryId, "checklist-templates"] });
      setShowTemplateDialog(false);
      setEditingTemplate(null);
      templateForm.reset();
      toast({ title: "Success", description: "Checklist template updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update checklist template", variant: "destructive" });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id: string) => 
      apiRequest(`/api/checklist-templates/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories", selectedCategoryId, "checklist-templates"] });
      toast({ title: "Success", description: "Checklist template deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete checklist template", variant: "destructive" });
    },
  });

  // Document Requirement mutations
  const createRequirementMutation = useMutation({
    mutationFn: (data: DocumentRequirementForm & { categoryId: string }) => 
      apiRequest(`/api/categories/${data.categoryId}/document-requirements`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories", selectedCategoryId, "document-requirements"] });
      setShowRequirementDialog(false);
      requirementForm.reset();
      toast({ title: "Success", description: "Document requirement created successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create document requirement", variant: "destructive" });
    },
  });

  const updateRequirementMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: DocumentRequirementForm }) => 
      apiRequest(`/api/document-requirements/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories", selectedCategoryId, "document-requirements"] });
      setShowRequirementDialog(false);
      setEditingRequirement(null);
      requirementForm.reset();
      toast({ title: "Success", description: "Document requirement updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update document requirement", variant: "destructive" });
    },
  });

  const deleteRequirementMutation = useMutation({
    mutationFn: (id: string) => 
      apiRequest(`/api/document-requirements/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories", selectedCategoryId, "document-requirements"] });
      toast({ title: "Success", description: "Document requirement deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete document requirement", variant: "destructive" });
    },
  });

  // Handlers
  const handleEditTemplate = (template: ChecklistTemplate) => {
    setEditingTemplate(template);
    templateForm.reset({
      key: template.key,
      label: template.label,
      sortOrder: template.sortOrder,
      isRequired: template.isRequired,
      helpText: template.helpText || "",
      conditionJson: template.conditionJson ? JSON.stringify(template.conditionJson) : "",
    });
    setShowTemplateDialog(true);
  };

  const handleEditRequirement = (requirement: DocumentRequirement) => {
    setEditingRequirement(requirement);
    requirementForm.reset({
      key: requirement.key,
      label: requirement.label,
      isRequired: requirement.isRequired,
      mimeWhitelist: requirement.mimeWhitelist ? requirement.mimeWhitelist.join(', ') : "",
      conditionJson: requirement.conditionJson ? JSON.stringify(requirement.conditionJson) : "",
    });
    setShowRequirementDialog(true);
  };

  const onSubmitTemplate = (data: ChecklistTemplateForm) => {
    if (editingTemplate) {
      updateTemplateMutation.mutate({ id: editingTemplate.id, data });
    } else {
      createTemplateMutation.mutate({ ...data, categoryId: selectedCategoryId });
    }
  };

  const onSubmitRequirement = (data: DocumentRequirementForm) => {
    const processedData = {
      ...data,
      mimeWhitelist: data.mimeWhitelist ? data.mimeWhitelist.split(',').map(s => s.trim()) : [],
    };
    if (editingRequirement) {
      updateRequirementMutation.mutate({ id: editingRequirement.id, data: processedData });
    } else {
      createRequirementMutation.mutate({ ...processedData, categoryId: selectedCategoryId });
    }
  };

  const selectedCategory = categories.find(c => c.id === selectedCategoryId);

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="templates-management">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Template Management</h1>
          <p className="text-muted-foreground">Configure checklist templates and document requirements for case categories</p>
        </div>
      </div>

      {/* Category Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <Label htmlFor="category-select">Category:</Label>
            <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
              <SelectTrigger className="w-72" data-testid="select-category">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedCategory && (
              <Badge variant="outline">{selectedCategory.description}</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedCategoryId && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="checklist" data-testid="tab-checklist">Checklist Templates</TabsTrigger>
            <TabsTrigger value="documents" data-testid="tab-documents">Document Requirements</TabsTrigger>
          </TabsList>

          {/* Checklist Templates Tab */}
          <TabsContent value="checklist" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div>
                  <CardTitle>Checklist Templates</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Define the steps required for processing cases in this category
                  </p>
                </div>
                <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-add-checklist-template">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Template
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>
                        {editingTemplate ? "Edit Checklist Template" : "Create Checklist Template"}
                      </DialogTitle>
                    </DialogHeader>
                    <Form {...templateForm}>
                      <form onSubmit={templateForm.handleSubmit(onSubmitTemplate)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={templateForm.control}
                            name="key"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Key</FormLabel>
                                <FormControl>
                                  <Input placeholder="unique_key" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={templateForm.control}
                            name="sortOrder"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Sort Order</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    placeholder="0" 
                                    {...field} 
                                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormField
                          control={templateForm.control}
                          name="label"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Label</FormLabel>
                              <FormControl>
                                <Input placeholder="Step description" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={templateForm.control}
                          name="helpText"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Help Text</FormLabel>
                              <FormControl>
                                <Textarea placeholder="Additional instructions for this step" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={templateForm.control}
                          name="isRequired"
                          render={({ field }) => (
                            <FormItem className="flex items-center space-x-2">
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <FormLabel>Required Step</FormLabel>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={templateForm.control}
                          name="conditionJson"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Conditions (JSON)</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder='{"when": "status", "equals": "pending"}'
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="flex justify-end space-x-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setShowTemplateDialog(false);
                              setEditingTemplate(null);
                              templateForm.reset();
                            }}
                          >
                            Cancel
                          </Button>
                          <Button type="submit">
                            {editingTemplate ? "Update" : "Create"} Template
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {loadingTemplates ? (
                  <div className="text-center py-8">Loading templates...</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order</TableHead>
                        <TableHead>Key</TableHead>
                        <TableHead>Label</TableHead>
                        <TableHead>Required</TableHead>
                        <TableHead>Help Text</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {checklistTemplates
                        .sort((a, b) => a.sortOrder - b.sortOrder)
                        .map((template) => (
                        <TableRow key={template.id}>
                          <TableCell>{template.sortOrder}</TableCell>
                          <TableCell className="font-mono text-sm">{template.key}</TableCell>
                          <TableCell>{template.label}</TableCell>
                          <TableCell>
                            {template.isRequired ? (
                              <Badge variant="destructive">Required</Badge>
                            ) : (
                              <Badge variant="secondary">Optional</Badge>
                            )}
                          </TableCell>
                          <TableCell className="max-w-xs truncate">{template.helpText}</TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditTemplate(template)}
                                data-testid={`button-edit-template-${template.id}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteTemplateMutation.mutate(template.id)}
                                data-testid={`button-delete-template-${template.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {checklistTemplates.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            No checklist templates configured for this category
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Document Requirements Tab */}
          <TabsContent value="documents" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div>
                  <CardTitle>Document Requirements</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Define the documents required for this category
                  </p>
                </div>
                <Dialog open={showRequirementDialog} onOpenChange={setShowRequirementDialog}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-add-document-requirement">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Requirement
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>
                        {editingRequirement ? "Edit Document Requirement" : "Create Document Requirement"}
                      </DialogTitle>
                    </DialogHeader>
                    <Form {...requirementForm}>
                      <form onSubmit={requirementForm.handleSubmit(onSubmitRequirement)} className="space-y-4">
                        <FormField
                          control={requirementForm.control}
                          name="key"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Key</FormLabel>
                              <FormControl>
                                <Input placeholder="document_type_key" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={requirementForm.control}
                          name="label"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Label</FormLabel>
                              <FormControl>
                                <Input placeholder="Document name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={requirementForm.control}
                          name="mimeWhitelist"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Allowed File Types</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="application/pdf, image/jpeg, image/png" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={requirementForm.control}
                          name="isRequired"
                          render={({ field }) => (
                            <FormItem className="flex items-center space-x-2">
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <FormLabel>Required Document</FormLabel>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={requirementForm.control}
                          name="conditionJson"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Conditions (JSON)</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder='{"when": "case_type", "equals": "dispute"}'
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="flex justify-end space-x-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setShowRequirementDialog(false);
                              setEditingRequirement(null);
                              requirementForm.reset();
                            }}
                          >
                            Cancel
                          </Button>
                          <Button type="submit">
                            {editingRequirement ? "Update" : "Create"} Requirement
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {loadingRequirements ? (
                  <div className="text-center py-8">Loading requirements...</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Key</TableHead>
                        <TableHead>Label</TableHead>
                        <TableHead>Required</TableHead>
                        <TableHead>File Types</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {documentRequirements.map((requirement) => (
                        <TableRow key={requirement.id}>
                          <TableCell className="font-mono text-sm">{requirement.key}</TableCell>
                          <TableCell>{requirement.label}</TableCell>
                          <TableCell>
                            {requirement.isRequired ? (
                              <Badge variant="destructive">Required</Badge>
                            ) : (
                              <Badge variant="secondary">Optional</Badge>
                            )}
                          </TableCell>
                          <TableCell className="max-w-xs">
                            {requirement.mimeWhitelist?.length ? (
                              <div className="flex flex-wrap gap-1">
                                {requirement.mimeWhitelist.slice(0, 2).map((type, index) => (
                                  <Badge key={index} variant="outline" className="text-xs">
                                    {type.split('/')[1] || type}
                                  </Badge>
                                ))}
                                {requirement.mimeWhitelist.length > 2 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{requirement.mimeWhitelist.length - 2}
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">Any</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditRequirement(requirement)}
                                data-testid={`button-edit-requirement-${requirement.id}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteRequirementMutation.mutate(requirement.id)}
                                data-testid={`button-delete-requirement-${requirement.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {documentRequirements.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            No document requirements configured for this category
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {!selectedCategoryId && (
        <Card>
          <CardContent className="text-center py-12">
            <FileCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Select a Category</h3>
            <p className="text-muted-foreground">
              Choose a case category to configure its checklist templates and document requirements
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}