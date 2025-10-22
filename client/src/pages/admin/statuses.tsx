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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Plus, Edit, Trash2, AlertCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Form schema
const statusSchema = z.object({
  name: z.string().min(1, "Name is required").max(50, "Name must be 50 characters or less"),
  code: z.string().min(1, "Code is required").max(50, "Code must be 50 characters or less"),
  color: z.string().min(1, "Color is required"),
  icon: z.string().optional(),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),
});

type StatusForm = z.infer<typeof statusSchema>;

type Status = {
  id: string;
  name: string;
  code: string;
  color: string;
  icon?: string;
  description?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export default function StatusesManagement() {
  const [editingStatus, setEditingStatus] = useState<Status | null>(null);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{id: string, name: string} | null>(null);
  const { toast } = useToast();

  // Fetch statuses
  const { data: statuses = [], isLoading } = useQuery<Status[]>({
    queryKey: ["/api/statuses"],
    select: (response: any) => response.data || [],
  });

  // Status form
  const statusForm = useForm<StatusForm>({
    resolver: zodResolver(statusSchema),
    defaultValues: {
      name: "",
      code: "",
      color: "#3b82f6",
      icon: "",
      description: "",
      isActive: true,
      sortOrder: 0,
    },
  });

  // Status mutations
  const createStatusMutation = useMutation({
    mutationFn: (data: StatusForm) => 
      apiRequest("POST", "/api/statuses", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/statuses"] });
      setShowStatusDialog(false);
      statusForm.reset();
      toast({ title: "Success", description: "Status created successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create status", variant: "destructive" });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<StatusForm> }) => 
      apiRequest("PATCH", `/api/statuses/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/statuses"] });
      setShowStatusDialog(false);
      setEditingStatus(null);
      statusForm.reset();
      toast({ title: "Success", description: "Status updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
    },
  });

  const deleteStatusMutation = useMutation({
    mutationFn: (id: string) => 
      apiRequest("DELETE", `/api/statuses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/statuses"] });
      setDeleteConfirm(null);
      toast({ title: "Success", description: "Status deleted successfully" });
    },
    onError: (error: any) => {
      setDeleteConfirm(null);
      const errorMessage = error.message || "Failed to delete status";
      toast({ 
        title: "Error", 
        description: errorMessage, 
        variant: "destructive" 
      });
    },
  });

  // Handlers
  const handleEditStatus = (status: Status) => {
    setEditingStatus(status);
    statusForm.reset({
      name: status.name,
      code: status.code,
      color: status.color,
      icon: status.icon || "",
      description: status.description || "",
      isActive: status.isActive,
      sortOrder: status.sortOrder,
    });
    setShowStatusDialog(true);
  };

  const handleAddStatus = () => {
    setEditingStatus(null);
    statusForm.reset({
      name: "",
      code: "",
      color: "#3b82f6",
      icon: "",
      description: "",
      isActive: true,
      sortOrder: statuses.length,
    });
    setShowStatusDialog(true);
  };

  const onStatusSubmit = (data: StatusForm) => {
    if (editingStatus) {
      updateStatusMutation.mutate({ id: editingStatus.id, data });
    } else {
      createStatusMutation.mutate(data);
    }
  };

  return (
    <div className="space-y-6" data-testid="statuses-management">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Case Statuses</h1>
          <p className="text-muted-foreground">Manage case status options and customize their appearance</p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Statuses</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Configure case statuses like Open, In Progress, and Resolved
            </p>
          </div>
          <Button onClick={handleAddStatus} data-testid="button-add-status">
            <Plus className="w-4 h-4 mr-2" />
            Add Status
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading statuses...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Preview</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Sort Order</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {statuses.map((status) => (
                  <TableRow key={status.id} data-testid={`row-status-${status.id}`}>
                    <TableCell>
                      <Badge style={{ backgroundColor: status.color }} data-testid={`badge-status-${status.id}`}>
                        {status.name}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{status.name}</TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-1 rounded">{status.code}</code>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                      {status.description || "—"}
                    </TableCell>
                    <TableCell>{status.sortOrder}</TableCell>
                    <TableCell>
                      <Badge variant={status.isActive ? "default" : "secondary"}>
                        {status.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditStatus(status)}
                          data-testid={`button-edit-status-${status.id}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setDeleteConfirm({ id: status.id, name: status.name })}
                          data-testid={`button-delete-status-${status.id}`}
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

      {/* Create/Edit Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingStatus ? "Edit Status" : "Create Status"}
            </DialogTitle>
          </DialogHeader>
          <Form {...statusForm}>
            <form onSubmit={statusForm.handleSubmit(onStatusSubmit)} className="space-y-4">
              <FormField
                control={statusForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Open, In Progress, Resolved..." {...field} data-testid="input-status-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={statusForm.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code</FormLabel>
                    <FormControl>
                      <Input placeholder="open, in_progress, resolved..." {...field} data-testid="input-status-code" />
                    </FormControl>
                    <FormDescription className="text-xs">
                      Internal identifier (lowercase, underscores for spaces)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={statusForm.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Color</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input type="color" {...field} className="w-20" data-testid="input-status-color" />
                      </FormControl>
                      <Input value={field.value} onChange={field.onChange} placeholder="#3b82f6" />
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={statusForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Brief description..." {...field} data-testid="input-status-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={statusForm.control}
                name="sortOrder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sort Order</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field} 
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        data-testid="input-status-sort-order" 
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      Lower numbers appear first in lists
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={statusForm.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Active</FormLabel>
                      <FormDescription className="text-xs">
                        Whether this status is available for use
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-status-active"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowStatusDialog(false)}
                  data-testid="button-cancel-status"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={createStatusMutation.isPending || updateStatusMutation.isPending}
                  data-testid="button-save-status"
                >
                  {editingStatus ? "Update" : "Create"}
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
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-destructive" />
              Delete Status
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteConfirm?.name}"? This action cannot be undone.
              Any cases using this status will need to be updated first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && deleteStatusMutation.mutate(deleteConfirm.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
