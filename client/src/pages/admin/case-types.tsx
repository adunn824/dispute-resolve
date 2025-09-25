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
import { Plus, Edit, Trash2, FileText, AlertCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Form schemas
const caseTypeSchema = z.object({
  name: z.string().min(1, "Name is required").max(50, "Name must be 50 characters or less"),
  description: z.string().min(1, "Description is required").max(255, "Description must be 255 characters or less"),
  color: z.string().min(1, "Color is required"),
  active: z.boolean().default(true),
});

const categorySchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be 100 characters or less"),
  description: z.string().min(1, "Description is required").max(255, "Description must be 255 characters or less"),
  caseTypeId: z.string().min(1, "Case type is required"),
  active: z.boolean().default(true),
});

type CaseTypeForm = z.infer<typeof caseTypeSchema>;
type CategoryForm = z.infer<typeof categorySchema>;

type CaseType = {
  id: string;
  name: string;
  description: string;
  color: string;
  active: boolean;
};

type Category = {
  id: string;
  name: string;
  description: string;
  caseTypeId: string;
  active: boolean;
};

export default function CaseTypesManagement() {
  const [activeTab, setActiveTab] = useState("case-types");
  const [editingCaseType, setEditingCaseType] = useState<any>(null);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [showCaseTypeDialog, setShowCaseTypeDialog] = useState(false);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const { toast } = useToast();

  // Fetch case types
  const { data: caseTypes = [], isLoading: loadingCaseTypes } = useQuery<CaseType[]>({
    queryKey: ["/api/case-types"],
  });

  // Fetch categories
  const { data: categories = [], isLoading: loadingCategories } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  // Case type form
  const caseTypeForm = useForm<CaseTypeForm>({
    resolver: zodResolver(caseTypeSchema),
    defaultValues: {
      name: "",
      description: "",
      color: "#2563eb",
      active: true,
    },
  });

  // Category form
  const categoryForm = useForm<CategoryForm>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
      description: "",
      caseTypeId: "",
      active: true,
    },
  });

  // Case type mutations
  const createCaseTypeMutation = useMutation({
    mutationFn: (data: CaseTypeForm) => 
      fetch("/api/case-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/case-types"] });
      setShowCaseTypeDialog(false);
      caseTypeForm.reset();
      toast({ title: "Success", description: "Case type created successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create case type", variant: "destructive" });
    },
  });

  const updateCaseTypeMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CaseTypeForm }) => 
      fetch(`/api/case-types/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/case-types"] });
      setShowCaseTypeDialog(false);
      setEditingCaseType(null);
      caseTypeForm.reset();
      toast({ title: "Success", description: "Case type updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update case type", variant: "destructive" });
    },
  });

  const deleteCaseTypeMutation = useMutation({
    mutationFn: (id: string) => 
      fetch(`/api/case-types/${id}`, { method: "DELETE" }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/case-types"] });
      toast({ title: "Success", description: "Case type deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete case type", variant: "destructive" });
    },
  });

  // Category mutations
  const createCategoryMutation = useMutation({
    mutationFn: (data: CategoryForm) => 
      fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      setShowCategoryDialog(false);
      categoryForm.reset();
      toast({ title: "Success", description: "Category created successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create category", variant: "destructive" });
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CategoryForm }) => 
      fetch(`/api/categories/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      setShowCategoryDialog(false);
      setEditingCategory(null);
      categoryForm.reset();
      toast({ title: "Success", description: "Category updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update category", variant: "destructive" });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: string) => 
      fetch(`/api/categories/${id}`, { method: "DELETE" }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({ title: "Success", description: "Category deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete category", variant: "destructive" });
    },
  });

  // Handlers
  const handleEditCaseType = (caseType: any) => {
    setEditingCaseType(caseType);
    caseTypeForm.reset({
      name: caseType.name,
      description: caseType.description,
      color: caseType.color,
      active: caseType.active,
    });
    setShowCaseTypeDialog(true);
  };

  const handleEditCategory = (category: any) => {
    setEditingCategory(category);
    categoryForm.reset({
      name: category.name,
      description: category.description,
      caseTypeId: category.caseTypeId,
      active: category.active,
    });
    setShowCategoryDialog(true);
  };

  const onCaseTypeSubmit = (data: CaseTypeForm) => {
    if (editingCaseType) {
      updateCaseTypeMutation.mutate({ id: editingCaseType.id, data });
    } else {
      createCaseTypeMutation.mutate(data);
    }
  };

  const onCategorySubmit = (data: CategoryForm) => {
    if (editingCategory) {
      updateCategoryMutation.mutate({ id: editingCategory.id, data });
    } else {
      createCategoryMutation.mutate(data);
    }
  };

  const getCaseTypeName = (caseTypeId: string) => {
    const caseType = caseTypes.find((ct: any) => ct.id === caseTypeId);
    return caseType?.name || "Unknown";
  };

  return (
    <div className="space-y-6" data-testid="case-types-management">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Case Types & Categories</h1>
          <p className="text-muted-foreground">Manage case types and their associated categories</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="case-types" data-testid="tab-case-types">Case Types</TabsTrigger>
          <TabsTrigger value="categories" data-testid="tab-categories">Categories</TabsTrigger>
        </TabsList>

        <TabsContent value="case-types" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Case Types</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Configure the main case types: Mail, Complaint, and Dispute
                </p>
              </div>
              <Dialog open={showCaseTypeDialog} onOpenChange={setShowCaseTypeDialog}>
                <DialogTrigger asChild>
                  <Button data-testid="button-add-case-type">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Case Type
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingCaseType ? "Edit Case Type" : "Create Case Type"}
                    </DialogTitle>
                  </DialogHeader>
                  <Form {...caseTypeForm}>
                    <form onSubmit={caseTypeForm.handleSubmit(onCaseTypeSubmit)} className="space-y-4">
                      <FormField
                        control={caseTypeForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Mail, Complaint, Dispute..." {...field} data-testid="input-case-type-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={caseTypeForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Brief description of this case type..." 
                                {...field}
                                data-testid="input-case-type-description"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={caseTypeForm.control}
                        name="color"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Color</FormLabel>
                            <FormControl>
                              <Input type="color" {...field} data-testid="input-case-type-color" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={caseTypeForm.control}
                        name="active"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between">
                            <FormLabel>Active</FormLabel>
                            <FormControl>
                              <Switch 
                                checked={field.value} 
                                onCheckedChange={field.onChange}
                                data-testid="switch-case-type-active"
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
                            setShowCaseTypeDialog(false);
                            setEditingCaseType(null);
                            caseTypeForm.reset();
                          }}
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="submit" 
                          disabled={createCaseTypeMutation.isPending || updateCaseTypeMutation.isPending}
                          data-testid="button-save-case-type"
                        >
                          {editingCaseType ? "Update" : "Create"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {loadingCaseTypes ? (
                <div>Loading case types...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Color</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Categories</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {caseTypes.map((caseType: any) => (
                      <TableRow key={caseType.id}>
                        <TableCell className="font-medium">{caseType.name}</TableCell>
                        <TableCell>{caseType.description}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-4 h-4 rounded border" 
                              style={{ backgroundColor: caseType.color }}
                            />
                            <span className="text-sm text-muted-foreground">{caseType.color}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={caseType.active ? "default" : "secondary"}>
                            {caseType.active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {categories.filter((cat: any) => cat.caseTypeId === caseType.id).length} categories
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditCaseType(caseType)}
                              data-testid={`button-edit-case-type-${caseType.id}`}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => deleteCaseTypeMutation.mutate(caseType.id)}
                              disabled={deleteCaseTypeMutation.isPending}
                              data-testid={`button-delete-case-type-${caseType.id}`}
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

        <TabsContent value="categories" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Categories</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Manage categories within each case type
                </p>
              </div>
              <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
                <DialogTrigger asChild>
                  <Button data-testid="button-add-category">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Category
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingCategory ? "Edit Category" : "Create Category"}
                    </DialogTitle>
                  </DialogHeader>
                  <Form {...categoryForm}>
                    <form onSubmit={categoryForm.handleSubmit(onCategorySubmit)} className="space-y-4">
                      <FormField
                        control={categoryForm.control}
                        name="caseTypeId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Case Type</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-case-type">
                                  <SelectValue placeholder="Select a case type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {caseTypes.map((caseType: any) => (
                                  <SelectItem key={caseType.id} value={caseType.id}>
                                    {caseType.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={categoryForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Category name..." {...field} data-testid="input-category-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={categoryForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Brief description of this category..." 
                                {...field}
                                data-testid="input-category-description"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={categoryForm.control}
                        name="active"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between">
                            <FormLabel>Active</FormLabel>
                            <FormControl>
                              <Switch 
                                checked={field.value} 
                                onCheckedChange={field.onChange}
                                data-testid="switch-category-active"
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
                            setShowCategoryDialog(false);
                            setEditingCategory(null);
                            categoryForm.reset();
                          }}
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="submit" 
                          disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}
                          data-testid="button-save-category"
                        >
                          {editingCategory ? "Update" : "Create"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {loadingCategories ? (
                <div>Loading categories...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Case Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categories.map((category: any) => (
                      <TableRow key={category.id}>
                        <TableCell className="font-medium">{category.name}</TableCell>
                        <TableCell>{category.description}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {getCaseTypeName(category.caseTypeId)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={category.active ? "default" : "secondary"}>
                            {category.active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditCategory(category)}
                              data-testid={`button-edit-category-${category.id}`}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => deleteCategoryMutation.mutate(category.id)}
                              disabled={deleteCategoryMutation.isPending}
                              data-testid={`button-delete-category-${category.id}`}
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
      </Tabs>
    </div>
  );
}