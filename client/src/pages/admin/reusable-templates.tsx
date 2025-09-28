import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
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
});

type ReusableTemplateForm = z.infer<typeof reusableTemplateSchema>;
type ReusableItemForm = z.infer<typeof reusableItemSchema>;

type ReusableTemplate = {
  id: string;
  name: string;
  description: string | null;
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
};

export default function ReusableTemplatesManagement() {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [editingTemplate, setEditingTemplate] = useState<ReusableTemplate | null>(null);
  const [editingItem, setEditingItem] = useState<ReusableItem | null>(null);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("templates");
  const { toast } = useToast();

  // Fetch all reusable templates
  const { data: templates = [], isLoading: loadingTemplates, refetch: refetchTemplates } = useQuery<ReusableTemplate[]>({
    queryKey: ["/api/reusable-checklist-templates"],
    select: (response: any) => response || [],
  });

  // Fetch items for selected template
  const { data: templateItems = [], isLoading: loadingItems, refetch: refetchItems } = useQuery<ReusableItem[]>({
    queryKey: ["/api/reusable-checklist-templates", selectedTemplateId, "items"],
    enabled: !!selectedTemplateId,
    select: (response: any) => response || [],
  });

  // Forms
  const templateForm = useForm<ReusableTemplateForm>({
    resolver: zodResolver(reusableTemplateSchema),
    defaultValues: {
      name: "",
      description: "",
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
    },
  });

  // Template mutations
  const createTemplateMutation = useMutation({
    mutationFn: async (data: ReusableTemplateForm) => 
      await apiRequest("/api/reusable-checklist-templates", {
        method: "POST",
        body: JSON.stringify(data),
      }),
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
      await apiRequest(`/api/reusable-checklist-templates/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
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
      await apiRequest(`/api/reusable-checklist-templates/${id}`, { method: "DELETE" }),
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
    mutationFn: async (data: ReusableItemForm) => 
      await apiRequest(`/api/reusable-checklist-templates/${selectedTemplateId}/items`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reusable-checklist-templates", selectedTemplateId, "items"] });
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
      await apiRequest(`/api/reusable-checklist-items/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reusable-checklist-templates", selectedTemplateId, "items"] });
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
      await apiRequest(`/api/reusable-checklist-items/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reusable-checklist-templates", selectedTemplateId, "items"] });
      toast({ title: "Success", description: "Checklist item deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete checklist item", variant: "destructive" });
    },
  });

  // Handlers
  const handleEditTemplate = (template: ReusableTemplate) => {
    setEditingTemplate(template);
    templateForm.reset({
      name: template.name,
      description: template.description || "",
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
    if (editingTemplate) {
      updateTemplateMutation.mutate({ id: editingTemplate.id, data });
    } else {
      createTemplateMutation.mutate(data);
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
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? "Edit Reusable Template" : "Create Reusable Template"}
              </DialogTitle>
            </DialogHeader>
            <Form {...templateForm}>
              <form onSubmit={templateForm.handleSubmit(onSubmitTemplate)} className="space-y-4">
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