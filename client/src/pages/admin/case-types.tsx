import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Plus, Edit, Trash2, AlertCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Form schema
const caseTypeSchema = z.object({
  name: z.string().min(1, "Name is required").max(50, "Name must be 50 characters or less"),
  description: z.string().min(1, "Description is required").max(255, "Description must be 255 characters or less"),
  color: z.string().min(1, "Color is required"),
  originationIds: z.array(z.string()).default([]),
});

type CaseTypeForm = z.infer<typeof caseTypeSchema>;

type CaseType = {
  id: string;
  name: string;
  description: string;
  color: string;
  originations?: Array<{ id: string; name: string }>;
};

type CaseOrigination = {
  id: string;
  name: string;
};

export default function CaseTypesManagement() {
  const [editingCaseType, setEditingCaseType] = useState<any>(null);
  const [showCaseTypeDialog, setShowCaseTypeDialog] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{type: 'case-type', id: string, name: string} | null>(null);
  const { toast } = useToast();

  // Fetch case types
  const { data: caseTypes = [], isLoading: loadingCaseTypes } = useQuery<CaseType[]>({
    queryKey: ["/api/case-types"],
    select: (response: any) => response.data || [],
  });

  // Fetch case originations
  const { data: caseOriginations = [] } = useQuery<CaseOrigination[]>({
    queryKey: ["/api/case-originations"],
    select: (response: any) => response.data || [],
  });

  // Case type form
  const caseTypeForm = useForm<CaseTypeForm>({
    resolver: zodResolver(caseTypeSchema),
    defaultValues: {
      name: "",
      description: "",
      color: "#2563eb",
      originationIds: [],
    },
  });

  // Case type mutations
  const createCaseTypeMutation = useMutation({
    mutationFn: (data: CaseTypeForm) => 
      apiRequest("POST", "/api/case-types", data),
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
      apiRequest("PUT", `/api/case-types/${id}`, data),
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
      apiRequest("DELETE", `/api/case-types/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/case-types"] });
      setDeleteConfirm(null);
      toast({ title: "Success", description: "Case type deleted successfully" });
    },
    onError: (error: any) => {
      setDeleteConfirm(null);
      const errorMessage = error.message || "Failed to delete case type";
      toast({ 
        title: "Error", 
        description: errorMessage, 
        variant: "destructive" 
      });
    },
  });

  // Handlers
  const handleEditCaseType = async (caseType: any) => {
    // Fetch the case type with originations
    try {
      const fullCaseType = await apiRequest("GET", `/api/case-types/${caseType.id}`);
      setEditingCaseType(fullCaseType);
      caseTypeForm.reset({
        name: fullCaseType.name,
        description: fullCaseType.description,
        color: fullCaseType.color,
        originationIds: fullCaseType.originations?.map((o: any) => o.id) || [],
      });
      setShowCaseTypeDialog(true);
    } catch (error) {
      toast({ title: "Error", description: "Failed to load case type details", variant: "destructive" });
    }
  };

  const onCaseTypeSubmit = (data: CaseTypeForm) => {
    if (editingCaseType) {
      updateCaseTypeMutation.mutate({ id: editingCaseType.id, data });
    } else {
      createCaseTypeMutation.mutate(data);
    }
  };

  return (
    <div className="space-y-6" data-testid="case-types-management">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Case Types</h1>
          <p className="text-muted-foreground">Configure the main case types: Mail, Complaint, and Dispute</p>
        </div>
      </div>

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
                    name="originationIds"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Case Originations</FormLabel>
                        <div className="space-y-2">
                          {caseOriginations.map((origination) => (
                            <div key={origination.id} className="flex items-center space-x-2">
                              <Checkbox
                                data-testid={`checkbox-origination-${origination.id}`}
                                checked={field.value?.includes(origination.id)}
                                onCheckedChange={(checked) => {
                                  const currentValue = field.value || [];
                                  if (checked) {
                                    field.onChange([...currentValue, origination.id]);
                                  } else {
                                    field.onChange(currentValue.filter((id: string) => id !== origination.id));
                                  }
                                }}
                              />
                              <label className="text-sm cursor-pointer" onClick={() => {
                                const currentValue = field.value || [];
                                const isChecked = currentValue.includes(origination.id);
                                if (isChecked) {
                                  field.onChange(currentValue.filter((id: string) => id !== origination.id));
                                } else {
                                  field.onChange([...currentValue, origination.id]);
                                }
                              }}>
                                {origination.name}
                              </label>
                            </div>
                          ))}
                        </div>
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
                  <TableHead>Case Origination</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {caseTypes.map((caseType: any) => (
                  <TableRow key={caseType.id}>
                    <TableCell className="font-medium">{caseType.name}</TableCell>
                    <TableCell>
                      {caseType.caseOriginationName ? (
                        <span className="text-sm">{caseType.caseOriginationName}</span>
                      ) : (
                        <span className="text-sm text-muted-foreground italic">None</span>
                      )}
                    </TableCell>
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
                          onClick={() => setDeleteConfirm({type: 'case-type', id: caseType.id, name: caseType.name})}
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

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            </div>
            <AlertDialogDescription>
              Are you sure you want to delete the case type "{deleteConfirm?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirm(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteConfirm && deleteConfirm.type === 'case-type') {
                  deleteCaseTypeMutation.mutate(deleteConfirm.id);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}