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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2, FileText, AlertCircle, CheckCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

const dispositionSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().optional(),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

const subDispositionSchema = z.object({
  dispositionId: z.string().min(1, "Disposition is required"),
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().optional(),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

const policyViolationSchema = z.object({
  value: z.string().min(1, "Value is required").max(50),
  label: z.string().min(1, "Label is required").max(100),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

type DispositionForm = z.infer<typeof dispositionSchema>;
type SubDispositionForm = z.infer<typeof subDispositionSchema>;
type PolicyViolationForm = z.infer<typeof policyViolationSchema>;

type Disposition = {
  id: string;
  name: string;
  description?: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type SubDisposition = {
  id: string;
  dispositionId: string;
  name: string;
  description?: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type PolicyViolationOption = {
  id: string;
  value: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export default function ResolutionOptionsManagement() {
  const [activeTab, setActiveTab] = useState("dispositions");
  const [editingDisposition, setEditingDisposition] = useState<Disposition | null>(null);
  const [editingSubDisposition, setEditingSubDisposition] = useState<SubDisposition | null>(null);
  const [editingPolicyViolation, setEditingPolicyViolation] = useState<PolicyViolationOption | null>(null);
  const [showDispositionDialog, setShowDispositionDialog] = useState(false);
  const [showSubDispositionDialog, setShowSubDispositionDialog] = useState(false);
  const [showPolicyViolationDialog, setShowPolicyViolationDialog] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{id: string, name: string, type: string} | null>(null);
  const [selectedDispositionId, setSelectedDispositionId] = useState<string>("");
  const { toast } = useToast();

  const { data: dispositions = [], isLoading: loadingDispositions } = useQuery<Disposition[]>({
    queryKey: ["/api/dispositions"],
    select: (response: any) => (response.data || []).sort((a: Disposition, b: Disposition) => a.sortOrder - b.sortOrder),
  });

  const { data: subDispositions = [], isLoading: loadingSubDispositions } = useQuery<SubDisposition[]>({
    queryKey: ["/api/sub-dispositions"],
    select: (response: any) => (response.data || []).sort((a: SubDisposition, b: SubDisposition) => a.sortOrder - b.sortOrder),
  });

  const { data: policyViolations = [], isLoading: loadingPolicyViolations } = useQuery<PolicyViolationOption[]>({
    queryKey: ["/api/policy-violation-options"],
    select: (response: any) => (response.data || []).sort((a: PolicyViolationOption, b: PolicyViolationOption) => a.sortOrder - b.sortOrder),
  });

  const dispositionForm = useForm<DispositionForm>({
    resolver: zodResolver(dispositionSchema),
    defaultValues: {
      name: "",
      description: "",
      sortOrder: 0,
      isActive: true,
    },
  });

  const subDispositionForm = useForm<SubDispositionForm>({
    resolver: zodResolver(subDispositionSchema),
    defaultValues: {
      dispositionId: "",
      name: "",
      description: "",
      sortOrder: 0,
      isActive: true,
    },
  });

  const policyViolationForm = useForm<PolicyViolationForm>({
    resolver: zodResolver(policyViolationSchema),
    defaultValues: {
      value: "",
      label: "",
      sortOrder: 0,
      isActive: true,
    },
  });

  const createDispositionMutation = useMutation({
    mutationFn: (data: DispositionForm) => apiRequest("POST", "/api/dispositions", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dispositions"] });
      setShowDispositionDialog(false);
      dispositionForm.reset();
      toast({ title: "Success", description: "Disposition created successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create disposition", variant: "destructive" });
    },
  });

  const updateDispositionMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: DispositionForm }) =>
      apiRequest("PUT", `/api/dispositions/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dispositions"] });
      setShowDispositionDialog(false);
      setEditingDisposition(null);
      dispositionForm.reset();
      toast({ title: "Success", description: "Disposition updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update disposition", variant: "destructive" });
    },
  });

  const deleteDispositionMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/dispositions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dispositions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sub-dispositions"] });
      setDeleteConfirm(null);
      toast({ title: "Success", description: "Disposition deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete disposition", variant: "destructive" });
    },
  });

  const createSubDispositionMutation = useMutation({
    mutationFn: (data: SubDispositionForm) => apiRequest("POST", "/api/sub-dispositions", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sub-dispositions"] });
      setShowSubDispositionDialog(false);
      subDispositionForm.reset();
      toast({ title: "Success", description: "Sub-disposition created successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create sub-disposition", variant: "destructive" });
    },
  });

  const updateSubDispositionMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: SubDispositionForm }) =>
      apiRequest("PUT", `/api/sub-dispositions/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sub-dispositions"] });
      setShowSubDispositionDialog(false);
      setEditingSubDisposition(null);
      subDispositionForm.reset();
      toast({ title: "Success", description: "Sub-disposition updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update sub-disposition", variant: "destructive" });
    },
  });

  const deleteSubDispositionMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/sub-dispositions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sub-dispositions"] });
      setDeleteConfirm(null);
      toast({ title: "Success", description: "Sub-disposition deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete sub-disposition", variant: "destructive" });
    },
  });

  const createPolicyViolationMutation = useMutation({
    mutationFn: (data: PolicyViolationForm) => apiRequest("POST", "/api/policy-violation-options", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/policy-violation-options"] });
      setShowPolicyViolationDialog(false);
      policyViolationForm.reset();
      toast({ title: "Success", description: "Policy violation option created successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create policy violation option", variant: "destructive" });
    },
  });

  const updatePolicyViolationMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: PolicyViolationForm }) =>
      apiRequest("PUT", `/api/policy-violation-options/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/policy-violation-options"] });
      setShowPolicyViolationDialog(false);
      setEditingPolicyViolation(null);
      policyViolationForm.reset();
      toast({ title: "Success", description: "Policy violation option updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update policy violation option", variant: "destructive" });
    },
  });

  const deletePolicyViolationMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/policy-violation-options/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/policy-violation-options"] });
      setDeleteConfirm(null);
      toast({ title: "Success", description: "Policy violation option deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete policy violation option", variant: "destructive" });
    },
  });

  const handleCreateDisposition = () => {
    setEditingDisposition(null);
    const nextSortOrder = dispositions.length > 0 ? Math.max(...dispositions.map(d => d.sortOrder)) + 1 : 0;
    dispositionForm.reset({ name: "", description: "", sortOrder: nextSortOrder, isActive: true });
    setShowDispositionDialog(true);
  };

  const handleEditDisposition = (disposition: Disposition) => {
    setEditingDisposition(disposition);
    dispositionForm.reset({
      name: disposition.name,
      description: disposition.description || "",
      sortOrder: disposition.sortOrder,
      isActive: disposition.isActive,
    });
    setShowDispositionDialog(true);
  };

  const handleSubmitDisposition = (data: DispositionForm) => {
    if (editingDisposition) {
      updateDispositionMutation.mutate({ id: editingDisposition.id, data });
    } else {
      createDispositionMutation.mutate(data);
    }
  };

  const handleCreateSubDisposition = () => {
    setEditingSubDisposition(null);
    const nextSortOrder = subDispositions.length > 0 ? Math.max(...subDispositions.map(s => s.sortOrder)) + 1 : 0;
    subDispositionForm.reset({
      dispositionId: selectedDispositionId || (dispositions[0]?.id || ""),
      name: "",
      description: "",
      sortOrder: nextSortOrder,
      isActive: true,
    });
    setShowSubDispositionDialog(true);
  };

  const handleEditSubDisposition = (subDisposition: SubDisposition) => {
    setEditingSubDisposition(subDisposition);
    subDispositionForm.reset({
      dispositionId: subDisposition.dispositionId,
      name: subDisposition.name,
      description: subDisposition.description || "",
      sortOrder: subDisposition.sortOrder,
      isActive: subDisposition.isActive,
    });
    setShowSubDispositionDialog(true);
  };

  const handleSubmitSubDisposition = (data: SubDispositionForm) => {
    if (editingSubDisposition) {
      updateSubDispositionMutation.mutate({ id: editingSubDisposition.id, data });
    } else {
      createSubDispositionMutation.mutate(data);
    }
  };

  const handleCreatePolicyViolation = () => {
    setEditingPolicyViolation(null);
    const nextSortOrder = policyViolations.length > 0 ? Math.max(...policyViolations.map(p => p.sortOrder)) + 1 : 0;
    policyViolationForm.reset({ value: "", label: "", sortOrder: nextSortOrder, isActive: true });
    setShowPolicyViolationDialog(true);
  };

  const handleEditPolicyViolation = (option: PolicyViolationOption) => {
    setEditingPolicyViolation(option);
    policyViolationForm.reset({
      value: option.value,
      label: option.label,
      sortOrder: option.sortOrder,
      isActive: option.isActive,
    });
    setShowPolicyViolationDialog(true);
  };

  const handleSubmitPolicyViolation = (data: PolicyViolationForm) => {
    if (editingPolicyViolation) {
      updatePolicyViolationMutation.mutate({ id: editingPolicyViolation.id, data });
    } else {
      createPolicyViolationMutation.mutate(data);
    }
  };

  const handleDelete = (id: string, name: string, type: string) => {
    setDeleteConfirm({ id, name, type });
  };

  const confirmDelete = () => {
    if (!deleteConfirm) return;
    
    switch (deleteConfirm.type) {
      case "disposition":
        deleteDispositionMutation.mutate(deleteConfirm.id);
        break;
      case "subDisposition":
        deleteSubDispositionMutation.mutate(deleteConfirm.id);
        break;
      case "policyViolation":
        deletePolicyViolationMutation.mutate(deleteConfirm.id);
        break;
    }
  };

  const filteredSubDispositions = selectedDispositionId
    ? subDispositions.filter(s => s.dispositionId === selectedDispositionId)
    : subDispositions;

  const getDispositionName = (id: string) => {
    return dispositions.find(d => d.id === id)?.name || "Unknown";
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="title-resolution-options">Resolution Options</h1>
          <p className="text-muted-foreground">
            Manage disposition values, sub-dispositions, and policy violation options
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="dispositions" data-testid="tab-dispositions">Dispositions</TabsTrigger>
          <TabsTrigger value="subDispositions" data-testid="tab-sub-dispositions">Sub-Dispositions</TabsTrigger>
          <TabsTrigger value="policyViolations" data-testid="tab-policy-violations">Policy Violations</TabsTrigger>
        </TabsList>

        <TabsContent value="dispositions" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Dispositions
              </CardTitle>
              <Button onClick={handleCreateDisposition} data-testid="button-create-disposition">
                <Plus className="h-4 w-4 mr-2" />
                Add Disposition
              </Button>
            </CardHeader>
            <CardContent>
              {loadingDispositions ? (
                <div className="text-center py-8">Loading dispositions...</div>
              ) : dispositions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No dispositions found. Create your first disposition to get started.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Sort Order</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dispositions.map((disposition) => (
                      <TableRow key={disposition.id} data-testid={`row-disposition-${disposition.id}`}>
                        <TableCell className="font-medium" data-testid={`text-name-${disposition.id}`}>
                          {disposition.name}
                        </TableCell>
                        <TableCell data-testid={`text-description-${disposition.id}`}>
                          {disposition.description || "-"}
                        </TableCell>
                        <TableCell data-testid={`text-sort-${disposition.id}`}>
                          {disposition.sortOrder}
                        </TableCell>
                        <TableCell data-testid={`text-status-${disposition.id}`}>
                          {disposition.isActive ? (
                            <Badge variant="default">Active</Badge>
                          ) : (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditDisposition(disposition)}
                              data-testid={`button-edit-${disposition.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(disposition.id, disposition.name, "disposition")}
                              data-testid={`button-delete-${disposition.id}`}
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
        </TabsContent>

        <TabsContent value="subDispositions" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div className="flex-1">
                <CardTitle className="flex items-center gap-2 mb-4">
                  <FileText className="h-5 w-5" />
                  Sub-Dispositions
                </CardTitle>
                <div className="flex gap-4 items-center">
                  <Label className="text-sm font-normal">Filter by Disposition:</Label>
                  <Select value={selectedDispositionId} onValueChange={setSelectedDispositionId}>
                    <SelectTrigger className="w-[250px]" data-testid="select-disposition-filter">
                      <SelectValue placeholder="All dispositions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All dispositions</SelectItem>
                      {dispositions.map((d) => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleCreateSubDisposition} data-testid="button-create-sub-disposition">
                <Plus className="h-4 w-4 mr-2" />
                Add Sub-Disposition
              </Button>
            </CardHeader>
            <CardContent>
              {loadingSubDispositions ? (
                <div className="text-center py-8">Loading sub-dispositions...</div>
              ) : filteredSubDispositions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {selectedDispositionId
                    ? "No sub-dispositions found for this disposition."
                    : "No sub-dispositions found. Create your first sub-disposition to get started."}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Disposition</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Sort Order</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSubDispositions.map((subDisposition) => (
                      <TableRow key={subDisposition.id} data-testid={`row-sub-disposition-${subDisposition.id}`}>
                        <TableCell data-testid={`text-disposition-${subDisposition.id}`}>
                          {getDispositionName(subDisposition.dispositionId)}
                        </TableCell>
                        <TableCell className="font-medium" data-testid={`text-name-${subDisposition.id}`}>
                          {subDisposition.name}
                        </TableCell>
                        <TableCell data-testid={`text-description-${subDisposition.id}`}>
                          {subDisposition.description || "-"}
                        </TableCell>
                        <TableCell data-testid={`text-sort-${subDisposition.id}`}>
                          {subDisposition.sortOrder}
                        </TableCell>
                        <TableCell data-testid={`text-status-${subDisposition.id}`}>
                          {subDisposition.isActive ? (
                            <Badge variant="default">Active</Badge>
                          ) : (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditSubDisposition(subDisposition)}
                              data-testid={`button-edit-${subDisposition.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(subDisposition.id, subDisposition.name, "subDisposition")}
                              data-testid={`button-delete-${subDisposition.id}`}
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
        </TabsContent>

        <TabsContent value="policyViolations" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Policy Violation Options
              </CardTitle>
              <Button onClick={handleCreatePolicyViolation} data-testid="button-create-policy-violation">
                <Plus className="h-4 w-4 mr-2" />
                Add Option
              </Button>
            </CardHeader>
            <CardContent>
              {loadingPolicyViolations ? (
                <div className="text-center py-8">Loading policy violation options...</div>
              ) : policyViolations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No policy violation options found. Create your first option to get started.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Value</TableHead>
                      <TableHead>Label</TableHead>
                      <TableHead>Sort Order</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {policyViolations.map((option) => (
                      <TableRow key={option.id} data-testid={`row-policy-violation-${option.id}`}>
                        <TableCell className="font-medium" data-testid={`text-value-${option.id}`}>
                          {option.value}
                        </TableCell>
                        <TableCell data-testid={`text-label-${option.id}`}>
                          {option.label}
                        </TableCell>
                        <TableCell data-testid={`text-sort-${option.id}`}>
                          {option.sortOrder}
                        </TableCell>
                        <TableCell data-testid={`text-status-${option.id}`}>
                          {option.isActive ? (
                            <Badge variant="default">Active</Badge>
                          ) : (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditPolicyViolation(option)}
                              data-testid={`button-edit-${option.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(option.id, option.value, "policyViolation")}
                              data-testid={`button-delete-${option.id}`}
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
        </TabsContent>
      </Tabs>

      {/* Disposition Dialog */}
      <Dialog open={showDispositionDialog} onOpenChange={setShowDispositionDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle data-testid="title-dialog-disposition">
              {editingDisposition ? "Edit Disposition" : "Add Disposition"}
            </DialogTitle>
          </DialogHeader>
          <Form {...dispositionForm}>
            <form onSubmit={dispositionForm.handleSubmit(handleSubmitDisposition)} className="space-y-4">
              <FormField
                control={dispositionForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Addressed" {...field} data-testid="input-disposition-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={dispositionForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Optional description"
                        className="resize-none"
                        {...field}
                        data-testid="input-disposition-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={dispositionForm.control}
                name="sortOrder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sort Order</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        data-testid="input-disposition-sort"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={dispositionForm.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        data-testid="input-disposition-active"
                      />
                    </FormControl>
                    <FormLabel className="!mt-0">Active</FormLabel>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowDispositionDialog(false)}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createDispositionMutation.isPending || updateDispositionMutation.isPending}
                  data-testid="button-save"
                >
                  {editingDisposition ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Sub-Disposition Dialog */}
      <Dialog open={showSubDispositionDialog} onOpenChange={setShowSubDispositionDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle data-testid="title-dialog-sub-disposition">
              {editingSubDisposition ? "Edit Sub-Disposition" : "Add Sub-Disposition"}
            </DialogTitle>
          </DialogHeader>
          <Form {...subDispositionForm}>
            <form onSubmit={subDispositionForm.handleSubmit(handleSubmitSubDisposition)} className="space-y-4">
              <FormField
                control={subDispositionForm.control}
                name="dispositionId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Disposition *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-disposition">
                          <SelectValue placeholder="Select disposition" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {dispositions.map((d) => (
                          <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={subDispositionForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Partial Resolution" {...field} data-testid="input-sub-disposition-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={subDispositionForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Optional description"
                        className="resize-none"
                        {...field}
                        data-testid="input-sub-disposition-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={subDispositionForm.control}
                name="sortOrder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sort Order</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        data-testid="input-sub-disposition-sort"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={subDispositionForm.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        data-testid="input-sub-disposition-active"
                      />
                    </FormControl>
                    <FormLabel className="!mt-0">Active</FormLabel>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowSubDispositionDialog(false)}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createSubDispositionMutation.isPending || updateSubDispositionMutation.isPending}
                  data-testid="button-save"
                >
                  {editingSubDisposition ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Policy Violation Dialog */}
      <Dialog open={showPolicyViolationDialog} onOpenChange={setShowPolicyViolationDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle data-testid="title-dialog-policy-violation">
              {editingPolicyViolation ? "Edit Policy Violation Option" : "Add Policy Violation Option"}
            </DialogTitle>
          </DialogHeader>
          <Form {...policyViolationForm}>
            <form onSubmit={policyViolationForm.handleSubmit(handleSubmitPolicyViolation)} className="space-y-4">
              <FormField
                control={policyViolationForm.control}
                name="value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Value *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Yes" {...field} data-testid="input-policy-violation-value" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={policyViolationForm.control}
                name="label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Label *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Yes" {...field} data-testid="input-policy-violation-label" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={policyViolationForm.control}
                name="sortOrder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sort Order</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        data-testid="input-policy-violation-sort"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={policyViolationForm.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        data-testid="input-policy-violation-active"
                      />
                    </FormControl>
                    <FormLabel className="!mt-0">Active</FormLabel>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPolicyViolationDialog(false)}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createPolicyViolationMutation.isPending || updatePolicyViolationMutation.isPending}
                  data-testid="button-save"
                >
                  {editingPolicyViolation ? "Update" : "Create"}
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
              Delete {deleteConfirm?.type === "disposition" ? "Disposition" : deleteConfirm?.type === "subDisposition" ? "Sub-Disposition" : "Policy Violation Option"}
            </AlertDialogTitle>
            <AlertDialogDescription data-testid="text-delete-description">
              Are you sure you want to delete "{deleteConfirm?.name}"? This action cannot be undone.
              {deleteConfirm?.type === "disposition" && (
                <>
                  {"\n\n"}
                  Note: This disposition cannot be deleted if it has sub-dispositions or is referenced by existing resolutions.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-delete-cancel">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={
                deleteDispositionMutation.isPending ||
                deleteSubDispositionMutation.isPending ||
                deletePolicyViolationMutation.isPending
              }
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
