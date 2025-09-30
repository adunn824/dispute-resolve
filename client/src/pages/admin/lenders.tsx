import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Plus, Edit, Trash2, Building, AlertCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Form schema
const lenderSchema = z.object({
  name: z.string().min(1, "Lender name is required").max(255, "Name must be 255 characters or less"),
  dba: z.string().max(255, "DBA must be 255 characters or less").optional(),
  address: z.string().optional(),
  contactPerson: z.string().max(255, "Contact person must be 255 characters or less").optional(),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().max(50, "Phone must be 50 characters or less").optional(),
});

type LenderForm = z.infer<typeof lenderSchema>;

type Lender = {
  id: string;
  name: string;
  dba?: string | null;
  address?: string | null;
  contactPerson?: string | null;
  email?: string | null;
  phone?: string | null;
  createdAt: string;
  updatedAt: string;
};

export default function LendersManagement() {
  const [editingLender, setEditingLender] = useState<Lender | null>(null);
  const [showLenderDialog, setShowLenderDialog] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{id: string, name: string} | null>(null);
  const { toast } = useToast();

  // Fetch lenders
  const { data: lenders = [], isLoading: loadingLenders } = useQuery<Lender[]>({
    queryKey: ["/api/lenders"],
    select: (response: any) => response.data || [],
  });

  // Form setup
  const form = useForm<LenderForm>({
    resolver: zodResolver(lenderSchema),
    defaultValues: {
      name: "",
      dba: "",
      address: "",
      contactPerson: "",
      email: "",
      phone: "",
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: LenderForm) =>
      apiRequest("POST", "/api/lenders", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lenders"] });
      setShowLenderDialog(false);
      form.reset();
      toast({
        title: "Success",
        description: "Lender created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create lender",
        variant: "destructive",
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: LenderForm }) =>
      apiRequest("PUT", `/api/lenders/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lenders"] });
      setShowLenderDialog(false);
      setEditingLender(null);
      form.reset();
      toast({
        title: "Success",
        description: "Lender updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update lender",
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("DELETE", `/api/lenders/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lenders"] });
      setDeleteConfirm(null);
      toast({
        title: "Success",
        description: "Lender deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete lender",
        variant: "destructive",
      });
    },
  });

  const handleCreate = () => {
    setEditingLender(null);
    form.reset({
      name: "",
      dba: "",
      address: "",
      contactPerson: "",
      email: "",
      phone: "",
    });
    setShowLenderDialog(true);
  };

  const handleEdit = (lender: Lender) => {
    setEditingLender(lender);
    form.reset({
      name: lender.name,
      dba: lender.dba || "",
      address: lender.address || "",
      contactPerson: lender.contactPerson || "",
      email: lender.email || "",
      phone: lender.phone || "",
    });
    setShowLenderDialog(true);
  };

  const handleSubmit = (data: LenderForm) => {
    if (editingLender) {
      updateMutation.mutate({ id: editingLender.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (lender: Lender) => {
    setDeleteConfirm({ id: lender.id, name: lender.name });
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
          <h1 className="text-3xl font-bold" data-testid="title-lenders">Lenders Management</h1>
          <p className="text-muted-foreground">
            Manage lenders for case assignment
          </p>
        </div>
        <Button onClick={handleCreate} data-testid="button-create-lender">
          <Plus className="h-4 w-4 mr-2" />
          Add Lender
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Lenders
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingLenders ? (
            <div className="text-center py-8">Loading lenders...</div>
          ) : lenders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No lenders found. Create your first lender to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>DBA</TableHead>
                  <TableHead>Contact Person</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lenders.map((lender) => (
                  <TableRow key={lender.id} data-testid={`row-lender-${lender.id}`}>
                    <TableCell className="font-medium" data-testid={`text-name-${lender.id}`}>
                      {lender.name}
                    </TableCell>
                    <TableCell data-testid={`text-dba-${lender.id}`}>
                      {lender.dba || "-"}
                    </TableCell>
                    <TableCell data-testid={`text-contact-${lender.id}`}>
                      {lender.contactPerson || "-"}
                    </TableCell>
                    <TableCell data-testid={`text-email-${lender.id}`}>
                      {lender.email || "-"}
                    </TableCell>
                    <TableCell data-testid={`text-phone-${lender.id}`}>
                      {lender.phone || "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(lender)}
                          data-testid={`button-edit-${lender.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(lender)}
                          data-testid={`button-delete-${lender.id}`}
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
      <Dialog open={showLenderDialog} onOpenChange={setShowLenderDialog}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle data-testid="title-dialog-lender">
              {editingLender ? "Edit Lender" : "Add Lender"}
            </DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lender Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., ABC Bank" {...field} data-testid="input-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dba"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>DBA (Doing Business As)</FormLabel>
                    <FormControl>
                      <Input placeholder="Alternate business name" {...field} data-testid="input-dba" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Full mailing address"
                        className="resize-none"
                        {...field}
                        data-testid="input-address"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contactPerson"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Person</FormLabel>
                    <FormControl>
                      <Input placeholder="Primary contact name" {...field} data-testid="input-contact-person" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="contact@lender.com" {...field} data-testid="input-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="(555) 123-4567" {...field} data-testid="input-phone" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowLenderDialog(false)}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save"
                >
                  {editingLender ? "Update" : "Create"}
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
              Delete Lender
            </AlertDialogTitle>
            <AlertDialogDescription data-testid="text-delete-description">
              Are you sure you want to delete "{deleteConfirm?.name}"? This action cannot be undone.
              {"\n\n"}
              Note: This lender cannot be deleted if it's being used by existing cases.
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
