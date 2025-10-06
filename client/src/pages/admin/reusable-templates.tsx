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
import { Plus, Edit, Trash2, CheckSquare, Clock, ListChecks, ArrowLeft } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Form schemas
const reusableTemplateSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be 100 characters or less"),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  isReusable: z.boolean().default(true),
  isActive: z.boolean().default(true),
});

const reusableItemSchema = z.object({
  key: z.string().min(1, "Key is required").max(50, "Key must be 50 characters or less"),
  label: z.string().min(1, "Label is required").max(100, "Label must be 100 characters or less"),
  description: z.string().optional(),
  isRequired: z.boolean().default(false),
  sortOrder: z.number().min(0, "Sort order must be 0 or greater"),
  helpText: z.string().optional(),
  estimatedDuration: z.number().min(0, "Duration must be 0 or greater").optional(),
  fieldType: z.enum(['checkbox', 'dropdown', 'text', 'number', 'date', 'file']).default('checkbox'),
  fieldOptions: z.array(z.string()).optional(),
  defaultValue: z.string().optional(),
});

type ReusableTemplateForm = z.infer<typeof reusableTemplateSchema>;
type ReusableItemForm = z.infer<typeof reusableItemSchema>;

type ReusableTemplate = {
  id: string;
  name: string;
  description: string | null;
  categoryId: string | null;
  isReusable: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type ReusableItem = {
  id: string;
  templateId: string;
  key: string;
  label: string;
  description: string | null;
  isRequired: boolean;
  sortOrder: number;
  helpText: string | null;
  estimatedDuration: number | null;
  fieldType: 'checkbox' | 'dropdown' | 'text' | 'number' | 'date' | 'file';
  fieldOptions: string[] | null;
  defaultValue: string | null;
};

type Category = {
  id: string;
  name: string;
  code: string;
  description: string | null;
};

export default function ReusableTemplatesManagement() {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [editingTemplate, setEditingTemplate] = useState<ReusableTemplate | null>(null);
  const [editingItem, setEditingItem] = useState<ReusableItem | null>(null);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("templates");
  const [dropdownOptions, setDropdownOptions] = useState<string[]>([]);
  const [newOption, setNewOption] = useState("");
  const { toast } = useToast();

  // Fetch categories
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
    select: (response: any) => response.data || [],
  });

  // Fetch all reusable templates
  const { data: templates = [], isLoading: loadingTemplates, refetch: refetchTemplates } = useQuery<ReusableTemplate[]>({
    queryKey: ["/api/reusable-checklist-templates"],
    select: (response: any) => response.data || response || [],
  });

  // Fetch items for selected template
  const { data: templateItems = [], isLoading: loadingItems, refetch: refetchItems } = useQuery<ReusableItem[]>({
    queryKey: ["/api/reusable-checklist-templates", selectedTemplateId, "items"],
    enabled: !!selectedTemplateId,
    select: (response: any) => response.data || response || [],
  });

  // Forms
  const templateForm = useForm<ReusableTemplateForm>({
    resolver: zodResolver(reusableTemplateSchema),
    defaultValues: {
      name: "",
      description: "",
      categoryId: "none",
      isReusable: true,
      isActive: true,
    },
  });

  const itemForm = useForm<ReusableItemForm>({
    resolver: zodResolver(reusableItemSchema),
    defaultValues: {
      key: "",
      label: "",
      description: "",
      isRequired: false,
      sortOrder: 0,
      helpText: "",
      estimatedDuration: undefined,
      fieldType: 'checkbox',
      fieldOptions: [],
      defaultValue: "",
    },
  });

  // Template mutations
  const createTemplateMutation = useMutation({
    mutationFn: async (data: ReusableTemplateForm) => 
      await apiRequest("POST", "/api/reusable-checklist-templates", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reusable-checklist-templates"] });
      setShowTemplateDialog(false);
      templateForm.reset();
      toast({ title: "Success", description: "Reusable template created successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create reusable template", variant: "destructive" });
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ReusableTemplateForm }) => 
      await apiRequest("PUT", `/api/reusable-checklist-templates/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reusable-checklist-templates"] });
      setShowTemplateDialog(false);
      setEditingTemplate(null);
      templateForm.reset();
      toast({ title: "Success", description: "Reusable template updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update reusable template", variant: "destructive" });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => 
      await apiRequest("DELETE", `/api/reusable-checklist-templates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reusable-checklist-templates"] });
      if (selectedTemplateId === editingTemplate?.id) {
        setSelectedTemplateId("");
      }
      toast({ title: "Success", description: "Reusable template deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete reusable template", variant: "destructive" });
    },
  });

  // Item mutations
  const createItemMutation = useMutation({
    mutationFn: async (data: ReusableItemForm) => {
      const templateId = selectedTemplateId || editingTemplate?.id;
      return await apiRequest("POST", `/api/reusable-checklist-templates/${templateId}/items`, data);
    },
    onSuccess: () => {
      const templateId = selectedTemplateId || editingTemplate?.id;
      queryClient.invalidateQueries({ queryKey: ["/api/reusable-checklist-templates", templateId, "items"] });
      setShowItemDialog(false);
      itemForm.reset();
      toast({ title: "Success", description: "Checklist item created successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create checklist item", variant: "destructive" });
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ReusableItemForm }) => 
      await apiRequest("PUT", `/api/reusable-checklist-items/${id}`, data),
    onSuccess: () => {
      const templateId = selectedTemplateId || editingTemplate?.id;
      queryClient.invalidateQueries({ queryKey: ["/api/reusable-checklist-templates", templateId, "items"] });
      setShowItemDialog(false);
      setEditingItem(null);
      itemForm.reset();
      toast({ title: "Success", description: "Checklist item updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update checklist item", variant: "destructive" });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (id: string) => 
      await apiRequest("DELETE", `/api/reusable-checklist-items/${id}`),
    onSuccess: () => {
      const templateId = selectedTemplateId || editingTemplate?.id;
      queryClient.invalidateQueries({ queryKey: ["/api/reusable-checklist-templates", templateId, "items"] });
      toast({ title: "Success", description: "Checklist item deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete checklist item", variant: "destructive" });
    },
  });

  // Fetch items for the template being edited
  const { data: editingTemplateItems = [] } = useQuery<ReusableItem[]>({
    queryKey: ["/api/reusable-checklist-templates", editingTemplate?.id, "items"],
    enabled: !!editingTemplate?.id,
    select: (response: any) => response.data || response || [],
  });

  // Handlers
  const handleEditTemplate = (template: ReusableTemplate) => {
    setEditingTemplate(template);
    templateForm.reset({
      name: template.name,
      description: template.description || "",
      categoryId: template.categoryId || "none",
      isReusable: template.isReusable,
      isActive: template.isActive,
    });
    setShowTemplateDialog(true);
  };

  const handleEditItem = (item: ReusableItem) => {
    setEditingItem(item);
    itemForm.reset({
      key: item.key,
      label: item.label,
      description: item.description || "",
      isRequired: item.isRequired,
      sortOrder: item.sortOrder,
      helpText: item.helpText || "",
      estimatedDuration: item.estimatedDuration || undefined,
    });
    setShowItemDialog(true);
  };

  const onSubmitTemplate = (data: ReusableTemplateForm) => {
    const submitData = {
      ...data,
      categoryId: data.categoryId === "none" ? undefined : data.categoryId,
    };
    if (editingTemplate) {
      updateTemplateMutation.mutate({ id: editingTemplate.id, data: submitData });
    } else {
      createTemplateMutation.mutate(submitData);
    }
  };

  const onSubmitItem = (data: ReusableItemForm) => {
    if (editingItem) {
      updateItemMutation.mutate({ id: editingItem.id, data });
    } else {
      createItemMutation.mutate(data);
    }
  };

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

  if (selectedTemplateId && selectedTemplate) {
    // Template detail view
    return (
      <div className="container mx-auto p-6 space-y-6" data-testid="reusable-templates-detail">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button 
              variant="outline" 
              onClick={() => setSelectedTemplateId("")}
              data-testid="button-back-to-templates"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Templates
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{selectedTemplate.name}</h1>
              <p className="text-muted-foreground">{selectedTemplate.description}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant={selectedTemplate.isActive ? "default" : "secondary"}>
              {selectedTemplate.isActive ? "Active" : "Inactive"}
            </Badge>
            <Button 
              onClick={() => handleEditTemplate(selectedTemplate)}
              data-testid="button-edit-template"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Template
            </Button>
          </div>
        </div>

        {/* Template Items */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <ListChecks className="w-5 h-5" />
                <span>Checklist Items</span>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Manage the individual steps in this checklist template
              </p>
            </div>
            <Dialog open={showItemDialog} onOpenChange={setShowItemDialog}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-checklist-item">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingItem ? "Edit Checklist Item" : "Create Checklist Item"}
                  </DialogTitle>
                </DialogHeader>
                <Form {...itemForm}>
                  <form onSubmit={itemForm.handleSubmit(onSubmitItem)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={itemForm.control}
                        name="key"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Key</FormLabel>
                            <FormControl>
                              <Input placeholder="unique_key" {...field} data-testid="input-item-key" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={itemForm.control}
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
                                data-testid="input-item-sort-order"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={itemForm.control}
                      name="label"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Label</FormLabel>
                          <FormControl>
                            <Input placeholder="Step description" {...field} data-testid="input-item-label" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={itemForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Detailed description of this step" {...field} data-testid="input-item-description" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={itemForm.control}
                      name="helpText"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Help Text</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Additional guidance for completing this step" {...field} data-testid="input-item-help-text" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={itemForm.control}
                        name="estimatedDuration"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Estimated Duration (minutes)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="30" 
                                {...field} 
                                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                                data-testid="input-item-duration"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={itemForm.control}
                        name="isRequired"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2 pt-6">
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="switch-item-required"
                              />
                            </FormControl>
                            <FormLabel>Required Step</FormLabel>
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowItemDialog(false);
                          setEditingItem(null);
                          itemForm.reset();
                        }}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" data-testid="button-submit-item">
                        {editingItem ? "Update" : "Create"} Item
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {loadingItems ? (
              <div className="text-center py-8">Loading items...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Key</TableHead>
                    <TableHead>Label</TableHead>
                    <TableHead>Required</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templateItems
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .map((item) => (
                    <TableRow key={item.id} data-testid={`row-item-${item.id}`}>
                      <TableCell>{item.sortOrder}</TableCell>
                      <TableCell className="font-mono text-sm">{item.key}</TableCell>
                      <TableCell>{item.label}</TableCell>
                      <TableCell>
                        {item.isRequired ? (
                          <Badge variant="destructive">Required</Badge>
                        ) : (
                          <Badge variant="secondary">Optional</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.estimatedDuration ? (
                          <div className="flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>{item.estimatedDuration}m</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditItem(item)}
                            data-testid={`button-edit-item-${item.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteItemMutation.mutate(item.id)}
                            data-testid={`button-delete-item-${item.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {templateItems.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No checklist items configured for this template
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Templates list view
  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="reusable-templates-management">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reusable Checklist Templates</h1>
          <p className="text-muted-foreground">
            Create reusable checklist templates that can be assigned to cases based on rules
          </p>
        </div>
        <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-template">
              <Plus className="h-4 w-4 mr-2" />
              Add Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? "Edit Reusable Template" : "Create Reusable Template"}
              </DialogTitle>
            </DialogHeader>
            <Form {...templateForm}>
              <form onSubmit={templateForm.handleSubmit(onSubmitTemplate)} className="space-y-6">
                <div className="space-y-4">
                  <FormField
                    control={templateForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Template name..." {...field} data-testid="input-template-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={templateForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Template description..." {...field} data-testid="input-template-description" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={templateForm.control}
                    name="categoryId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category (Optional)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || "none"}>
                          <FormControl>
                            <SelectTrigger data-testid="select-template-category">
                              <SelectValue placeholder="Select category for auto-assignment..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">None (Library Template)</SelectItem>
                            {categories.map((category) => (
                              <SelectItem key={category.id} value={category.id}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          If selected, this template will auto-apply to all cases in this category
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={templateForm.control}
                    name="isReusable"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-template-reusable"
                          />
                        </FormControl>
                        <div className="space-y-1">
                          <FormLabel>Available in Library</FormLabel>
                          <p className="text-xs text-muted-foreground">
                            If enabled, this template can be assigned via business rules
                          </p>
                        </div>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={templateForm.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-template-active"
                          />
                        </FormControl>
                        <FormLabel>Active Template</FormLabel>
                      </FormItem>
                    )}
                  />
                </div>

                {editingTemplate && (
                  <div className="space-y-4 border-t pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          <ListChecks className="w-5 h-5" />
                          Checklist Items
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Individual steps in this checklist template
                        </p>
                      </div>
                      <Dialog open={showItemDialog} onOpenChange={setShowItemDialog}>
                        <DialogTrigger asChild>
                          <Button type="button" size="sm" data-testid="button-add-item-in-dialog">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Item
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl" onClick={(e) => e.stopPropagation()}>
                          <DialogHeader>
                            <DialogTitle>
                              {editingItem ? "Edit Checklist Item" : "Create Checklist Item"}
                            </DialogTitle>
                          </DialogHeader>
                          <Form {...itemForm}>
                            <form onSubmit={itemForm.handleSubmit(onSubmitItem)} className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <FormField
                                  control={itemForm.control}
                                  name="key"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Key</FormLabel>
                                      <FormControl>
                                        <Input placeholder="unique_key" {...field} data-testid="input-item-key" />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={itemForm.control}
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
                                          data-testid="input-item-sort-order"
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                              <FormField
                                control={itemForm.control}
                                name="label"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Label</FormLabel>
                                    <FormControl>
                                      <Input placeholder="Step description" {...field} data-testid="input-item-label" />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={itemForm.control}
                                name="description"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Description</FormLabel>
                                    <FormControl>
                                      <Textarea placeholder="Detailed description of this step" {...field} data-testid="input-item-description" />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={itemForm.control}
                                name="helpText"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Help Text / Instructions</FormLabel>
                                    <FormControl>
                                      <Textarea placeholder="Additional guidance for completing this step" {...field} data-testid="input-item-help-text" />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={itemForm.control}
                                name="fieldType"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Field Type</FormLabel>
                                    <Select 
                                      onValueChange={(value) => {
                                        field.onChange(value);
                                        if (value !== 'dropdown') {
                                          itemForm.setValue('fieldOptions', []);
                                          setDropdownOptions([]);
                                        }
                                      }} 
                                      value={field.value}
                                    >
                                      <FormControl>
                                        <SelectTrigger data-testid="select-field-type">
                                          <SelectValue />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        <SelectItem value="checkbox">Checkbox</SelectItem>
                                        <SelectItem value="dropdown">Dropdown</SelectItem>
                                        <SelectItem value="text">Text Input</SelectItem>
                                        <SelectItem value="number">Number Input</SelectItem>
                                        <SelectItem value="date">Date Picker</SelectItem>
                                        <SelectItem value="file">File Reference</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              {itemForm.watch('fieldType') === 'dropdown' && (
                                <div className="space-y-2">
                                  <Label>Dropdown Options</Label>
                                  <div className="flex gap-2">
                                    <Input
                                      placeholder="Enter option..."
                                      value={newOption}
                                      onChange={(e) => setNewOption(e.target.value)}
                                      onKeyPress={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          if (newOption.trim()) {
                                            const updated = [...(itemForm.getValues('fieldOptions') || []), newOption.trim()];
                                            itemForm.setValue('fieldOptions', updated);
                                            setDropdownOptions(updated);
                                            setNewOption("");
                                          }
                                        }
                                      }}
                                      data-testid="input-dropdown-option"
                                    />
                                    <Button
                                      type="button"
                                      variant="outline"
                                      onClick={() => {
                                        if (newOption.trim()) {
                                          const updated = [...(itemForm.getValues('fieldOptions') || []), newOption.trim()];
                                          itemForm.setValue('fieldOptions', updated);
                                          setDropdownOptions(updated);
                                          setNewOption("");
                                        }
                                      }}
                                      data-testid="button-add-option"
                                    >
                                      <Plus className="h-4 w-4" />
                                    </Button>
                                  </div>
                                  {(itemForm.watch('fieldOptions') || []).length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-2">
                                      {(itemForm.watch('fieldOptions') || []).map((option, index) => (
                                        <Badge key={index} variant="secondary" className="gap-1">
                                          {option}
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const updated = (itemForm.getValues('fieldOptions') || []).filter((_, i) => i !== index);
                                              itemForm.setValue('fieldOptions', updated);
                                              setDropdownOptions(updated);
                                            }}
                                            className="ml-1 hover:text-destructive"
                                          >
                                            ×
                                          </button>
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}

                              <FormField
                                control={itemForm.control}
                                name="defaultValue"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Default Value (Optional)</FormLabel>
                                    <FormControl>
                                      <Input placeholder="Default value for this field..." {...field} data-testid="input-default-value" />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <div className="grid grid-cols-2 gap-4">
                                <FormField
                                  control={itemForm.control}
                                  name="estimatedDuration"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Estimated Duration (minutes)</FormLabel>
                                      <FormControl>
                                        <Input 
                                          type="number" 
                                          placeholder="30" 
                                          {...field} 
                                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                                          data-testid="input-item-duration"
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={itemForm.control}
                                  name="isRequired"
                                  render={({ field }) => (
                                    <FormItem className="flex items-center space-x-2 pt-6">
                                      <FormControl>
                                        <Switch
                                          checked={field.value}
                                          onCheckedChange={field.onChange}
                                          data-testid="switch-item-required"
                                        />
                                      </FormControl>
                                      <FormLabel>Required Step</FormLabel>
                                    </FormItem>
                                  )}
                                />
                              </div>
                              <div className="flex justify-end space-x-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => {
                                    setShowItemDialog(false);
                                    setEditingItem(null);
                                    itemForm.reset();
                                  }}
                                >
                                  Cancel
                                </Button>
                                <Button type="submit" data-testid="button-submit-item">
                                  {editingItem ? "Update" : "Create"} Item
                                </Button>
                              </div>
                            </form>
                          </Form>
                        </DialogContent>
                      </Dialog>
                    </div>

                    {editingTemplateItems.length > 0 ? (
                      <div className="border rounded-lg">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-12">Order</TableHead>
                              <TableHead>Label</TableHead>
                              <TableHead>Description</TableHead>
                              <TableHead>Instructions</TableHead>
                              <TableHead className="w-24">Duration</TableHead>
                              <TableHead className="w-24">Required</TableHead>
                              <TableHead className="w-24">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {editingTemplateItems
                              .sort((a, b) => a.sortOrder - b.sortOrder)
                              .map((item) => (
                                <TableRow key={item.id}>
                                  <TableCell className="text-center">{item.sortOrder}</TableCell>
                                  <TableCell>
                                    <div>
                                      <p className="font-medium">{item.label}</p>
                                      <p className="text-xs text-muted-foreground">
                                        Key: <code className="bg-muted px-1 rounded">{item.key}</code>
                                      </p>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-sm">{item.description || "—"}</TableCell>
                                  <TableCell className="text-sm">{item.helpText || "—"}</TableCell>
                                  <TableCell className="text-center">
                                    {item.estimatedDuration ? `${item.estimatedDuration} min` : "—"}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Badge variant={item.isRequired ? "destructive" : "secondary"}>
                                      {item.isRequired ? "Required" : "Optional"}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center space-x-1">
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleEditItem(item);
                                        }}
                                        data-testid={`button-edit-item-${item.id}`}
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          deleteItemMutation.mutate(item.id);
                                        }}
                                        data-testid={`button-delete-item-${item.id}`}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="text-center py-8 border rounded-lg bg-muted/20">
                        <ListChecks className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                        <p className="text-muted-foreground">No checklist items yet</p>
                        <p className="text-sm text-muted-foreground">Click "Add Item" to create your first step</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-end space-x-2 pt-4 border-t">
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
                  <Button type="submit" data-testid="button-submit-template">
                    {editingTemplate ? "Update" : "Create"} Template
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CheckSquare className="w-5 h-5" />
            <span>Templates</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingTemplates ? (
            <div className="text-center py-8">Loading templates...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => (
                  <TableRow 
                    key={template.id} 
                    className={`cursor-pointer hover-elevate ${!template.isActive ? 'opacity-60' : ''}`}
                    onClick={() => setSelectedTemplateId(template.id)}
                    data-testid={`row-template-${template.id}`}
                  >
                    <TableCell className="font-medium">
                      {template.name}
                      {!template.isActive && <span className="text-muted-foreground ml-2 text-sm">(Inactive)</span>}
                    </TableCell>
                    <TableCell>{template.description}</TableCell>
                    <TableCell>
                      <Badge variant={template.isActive ? "default" : "outline"}>
                        {template.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(template.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
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
                {templates.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No reusable templates found. Create your first template to get started.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}