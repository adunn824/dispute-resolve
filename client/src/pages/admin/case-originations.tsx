import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Plus, Edit, Trash2, Building, AlertCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Form schema
const caseOriginationSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be 100 characters or less"),
  description: z.string().optional(),
  externalKey: z.string().optional(),
});

type CaseOriginationForm = z.infer<typeof caseOriginationSchema>;

type CaseOrigination = {
  id: string;
  name: string;
  description?: string;
  externalKey?: string;
  createdAt: string;
  updatedAt: string;
};

export default function CaseOriginationsManagement() {
  const [editingOrigination, setEditingOrigination] = useState<CaseOrigination | null>(null);
  const [showOriginationDialog, setShowOriginationDialog] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{id: string, name: string} | null>(null);
  const { toast } = useToast();

  // Fetch case originations
  const { data: caseOriginations = [], isLoading: loadingOriginations, refetch } = useQuery<CaseOrigination[]>({
    queryKey: ["/api/case-originations"],
    select: (response: any) => response.data || [],
  });

  // Form setup
  const form = useForm<CaseOriginationForm>({
    resolver: zodResolver(caseOriginationSchema),
    defaultValues: {
      name: "",
      description: "",
      externalKey: "",
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: CaseOriginationForm) =>
      apiRequest("POST", "/api/case-originations", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/case-originations"] });
      setShowOriginationDialog(false);
      form.reset();
      toast({
        title: "Success",
        description: "Case origination created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create case origination",
        variant: "destructive",
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CaseOriginationForm }) =>
      apiRequest("PUT", `/api/case-originations/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/case-originations"] });
      setShowOriginationDialog(false);
      setEditingOrigination(null);
      form.reset();
      toast({
        title: "Success",
        description: "Case origination updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update case origination",
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("DELETE", `/api/case-originations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/case-originations"] });
      setDeleteConfirm(null);
      toast({
        title: "Success",
        description: "Case origination deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete case origination",
        variant: "destructive",
      });
    },
  });

  const handleCreate = () => {
    setEditingOrigination(null);
    form.reset({
      name: "",
      description: "",
      externalKey: "",
    });
    setShowOriginationDialog(true);
  };

  const handleEdit = (origination: CaseOrigination) => {
    setEditingOrigination(origination);
    form.reset({
      name: origination.name,
      description: origination.description || "",
      externalKey: origination.externalKey || "",
    });
    setShowOriginationDialog(true);
  };

  const handleSubmit = (data: CaseOriginationForm) => {
    if (editingOrigination) {
      updateMutation.mutate({ id: editingOrigination.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (origination: CaseOrigination) => {
    setDeleteConfirm({ id: origination.id, name: origination.name });
  };

  const confirmDelete = () => {
    if (deleteConfirm) {
      deleteMutation.mutate(deleteConfirm.id);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="title-originations">Case Originations Management</h1>
          <p className="text-muted-foreground">
            Manage case originations - the highest level in your case hierarchy
          </p>
        </div>
        <Button onClick={handleCreate} data-testid="button-create-origination">
          <Plus className="h-4 w-4 mr-2" />
          Add Case Origination
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Case Originations
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingOriginations ? (
            <div className="text-center py-8">Loading originations...</div>
          ) : caseOriginations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No case originations found. Create your first origination to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>External Key</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {caseOriginations.map((origination) => (
                  <TableRow key={origination.id} data-testid={`row-origination-${origination.id}`}>
                    <TableCell className="font-medium" data-testid={`text-name-${origination.id}`}>
                      {origination.name}
                    </TableCell>
                    <TableCell data-testid={`text-description-${origination.id}`}>
                      {origination.description || "-"}
                    </TableCell>
                    <TableCell data-testid={`text-external-key-${origination.id}`}>
                      {origination.externalKey || "-"}
                    </TableCell>
                    <TableCell data-testid={`text-created-${origination.id}`}>
                      {new Date(origination.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(origination)}
                          data-testid={`button-edit-${origination.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(origination)}
                          data-testid={`button-delete-${origination.id}`}
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
      <Dialog open={showOriginationDialog} onOpenChange={setShowOriginationDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle data-testid="title-dialog-origination">
              {editingOrigination ? "Edit Case Origination" : "Add Case Origination"}
            </DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., CFPB, Internal, External Partners" {...field} data-testid="input-name" />
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
                      <Textarea
                        placeholder="Describe this case origination source..."
                        className="resize-none"
                        {...field}
                        data-testid="input-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="externalKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>External Key</FormLabel>
                    <FormControl>
                      <Input placeholder="External system identifier (optional)" {...field} data-testid="input-external-key" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowOriginationDialog(false)}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save"
                >
                  {editingOrigination ? "Update" : "Create"}
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
            <AlertDialogTitle className="flex items-center gap-2" data-testid="title-delete-confirm">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Delete Case Origination
            </AlertDialogTitle>
            <AlertDialogDescription data-testid="text-delete-description">
              Are you sure you want to delete "{deleteConfirm?.name}"? This action cannot be undone.
              {"\n\n"}
              Note: This origination cannot be deleted if it's being used by existing case types or cases.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-delete-cancel">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive hover:bg-destructive/90"
              data-testid="button-delete-confirm"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}