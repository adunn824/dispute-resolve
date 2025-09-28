import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "./StatusBadge";
import { PriorityBadge } from "./PriorityBadge";
import { ChecklistTab } from "./tabs/ChecklistTab";
import { DocumentsTab } from "./tabs/DocumentsTab";
import { ResolutionTab } from "./tabs/ResolutionTab";
import { AuditTab } from "./tabs/AuditTab";
import { CaseNotesTab } from "./tabs/CaseNotesTab";
import { ArrowLeft, User, Calendar, FileText, Loader2, Settings, UserCheck, MessageSquare, Edit } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "../lib/queryClient";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";

// Form schema for editing case details
const editCaseSchema = z.object({
  loanId: z.string().optional(),
  lenderName: z.string().optional(),
  state: z.string().min(2, "State is required"),
  details: z.string().min(10, "Details must be at least 10 characters"),
  hasRepresentative: z.boolean().optional().default(false),
  representativeCompanyName: z.string().optional(),
  representativePersonName: z.string().optional(),
  representativeAddress: z.string().optional(),
  representativeEmail: z.string().email("Please enter a valid email address").optional().or(z.literal("")),
  representativePhone: z.string().optional(),
}).refine((data) => {
  // If hasRepresentative is true, require all representative fields
  if (data.hasRepresentative) {
    return (
      data.representativeCompanyName &&
      data.representativeCompanyName.trim() !== "" &&
      data.representativePersonName &&
      data.representativePersonName.trim() !== "" &&
      data.representativeAddress &&
      data.representativeAddress.trim() !== "" &&
      data.representativeEmail &&
      data.representativeEmail.trim() !== "" &&
      data.representativePhone &&
      data.representativePhone.trim() !== ""
    );
  }
  return true;
}, {
  message: "All representative fields are required when customer is represented by POA or Attorney",
  path: ["hasRepresentative"],
});

type EditCaseFormValues = z.infer<typeof editCaseSchema>;

interface CaseDetailViewProps {
  caseId: string;
  onBack: () => void;
}

interface CaseDetailData {
  id: string;
  caseTypeId: string;
  categoryId: string;
  customerId: string;
  assignedToUserId?: string;
  loanId?: string;
  lenderName?: string;
  state: string;
  details: string;
  status: "open" | "in_progress" | "resolved";
  hasRepresentative?: boolean;
  representativeCompanyName?: string;
  representativePersonName?: string;
  representativeAddress?: string;
  representativeEmail?: string;
  representativePhone?: string;
  createdAt: string;
  updatedAt: string;
  customerName: string;
  customerState: string;
  caseTypeName: string;
  caseTypeColor?: string;
  categoryName: string;
  categoryCode: string;
  priorityValue: string;
  priorityDescription?: string;
  assignedUserName?: string;
  assignedUserEmail?: string;
  assignedUserRole?: string;
}

interface Assignee {
  id: string;
  name: string;
  email: string;
  role: string;
}

export function CaseDetailView({ caseId, onBack }: CaseDetailViewProps) {
  const [activeTab, setActiveTab] = useState("checklist");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [hasRepresentative, setHasRepresentative] = useState(false);
  const { toast } = useToast();
  
  // Fetch case details from API
  const { data: caseData, isLoading, error } = useQuery<{data: CaseDetailData}>({
    queryKey: ["/api/cases", caseId],
    queryFn: () => apiRequest("GET", `/api/cases/${caseId}`)
  });

  // Fetch available assignees
  const { data: assigneesData } = useQuery<{data: Assignee[]}>({
    queryKey: ["/api/assignees"],
    queryFn: () => apiRequest("GET", "/api/assignees")
  });

  const caseDetails = caseData?.data;
  const assignees = assigneesData?.data || [];

  // Mutation for updating case status
  const updateStatusMutation = useMutation({
    mutationFn: (newStatus: "open" | "in_progress" | "resolved") =>
      apiRequest("PATCH", `/api/cases/${caseId}/status`, { status: newStatus }),
    onSuccess: () => {
      // Invalidate and refetch case details
      queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId] });
      // Also invalidate dashboard to update case counts
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({
        title: "Status Updated",
        description: "Case status has been successfully updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to update case status",
        variant: "destructive",
      });
    },
  });

  // Mutation for assigning case
  const assignCaseMutation = useMutation({
    mutationFn: (assignedToUserId: string | null) =>
      apiRequest("PATCH", `/api/cases/${caseId}/assign`, { assignedToUserId }),
    onSuccess: () => {
      // Invalidate and refetch case details
      queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId] });
      toast({
        title: "Assignment Updated",
        description: "Case assignment has been successfully updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to update case assignment",
        variant: "destructive",
      });
    },
  });

  // Mutation for updating case details
  const updateCaseMutation = useMutation({
    mutationFn: (updates: EditCaseFormValues) =>
      apiRequest("PUT", `/api/cases/${caseId}`, updates),
    onSuccess: () => {
      // Invalidate and refetch case details
      queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId] });
      // Also invalidate dashboard to update any changes
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      setIsEditDialogOpen(false);
      toast({
        title: "Case Updated",
        description: "Case details have been successfully updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to update case details",
        variant: "destructive",
      });
    },
  });

  // Initialize form with current case data
  const editForm = useForm<EditCaseFormValues>({
    resolver: zodResolver(editCaseSchema),
    defaultValues: {
      loanId: caseDetails?.loanId || "",
      lenderName: caseDetails?.lenderName || "",
      state: caseDetails?.customerState || "",
      details: caseDetails?.details || "",
      hasRepresentative: caseDetails?.hasRepresentative || false,
      representativeCompanyName: caseDetails?.representativeCompanyName || "",
      representativePersonName: caseDetails?.representativePersonName || "",
      representativeAddress: caseDetails?.representativeAddress || "",
      representativeEmail: caseDetails?.representativeEmail || "",
      representativePhone: caseDetails?.representativePhone || "",
    },
  });

  const handleStatusChange = (newStatus: "open" | "in_progress" | "resolved") => {
    updateStatusMutation.mutate(newStatus);
  };

  const handleAssignmentChange = (assignedToUserId: string) => {
    // If "unassigned" is selected, pass null, otherwise pass the user ID
    const actualUserId = assignedToUserId === "unassigned" ? null : assignedToUserId;
    assignCaseMutation.mutate(actualUserId);
  };
  
  const handleResolveCase = () => {
    handleStatusChange("resolved");
  };

  const handleEditCase = () => {
    // Reset form with current case data when opening dialog
    if (caseDetails) {
      editForm.reset({
        loanId: caseDetails.loanId || "",
        lenderName: caseDetails.lenderName || "",
        state: caseDetails.customerState || "",
        details: caseDetails.details || "",
        hasRepresentative: caseDetails.hasRepresentative || false,
        representativeCompanyName: caseDetails.representativeCompanyName || "",
        representativePersonName: caseDetails.representativePersonName || "",
        representativeAddress: caseDetails.representativeAddress || "",
        representativeEmail: caseDetails.representativeEmail || "",
        representativePhone: caseDetails.representativePhone || "",
      });
      setHasRepresentative(caseDetails.hasRepresentative || false);
    }
    setIsEditDialogOpen(true);
  };

  const handleEditSubmit = (data: EditCaseFormValues) => {
    updateCaseMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading case details...</span>
        </div>
      </div>
    );
  }

  if (error || !caseDetails) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Case not found</h2>
          <p className="text-muted-foreground mb-4">
            The case you're looking for doesn't exist or you don't have permission to view it.
          </p>
          <Button onClick={onBack} data-testid="button-back-error">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="view-case-detail">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack} data-testid="button-back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Case #{caseDetails.id}</h1>
          <p className="text-muted-foreground">{caseDetails.caseTypeName} • {caseDetails.categoryName}</p>
        </div>
        <div className="flex gap-2 items-center">
          <PriorityBadge priority={caseDetails.priorityValue as "Low" | "Medium" | "High"} />
          <div className="flex items-center gap-2">
            <StatusBadge status={caseDetails.status} />
            <Select
              value={caseDetails.status}
              onValueChange={handleStatusChange}
              disabled={updateStatusMutation.isPending}
            >
              <SelectTrigger className="w-32" data-testid="select-case-status">
                <Settings className="h-4 w-4" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open" data-testid="option-status-open">Open</SelectItem>
                <SelectItem value="in_progress" data-testid="option-status-in-progress">In Progress</SelectItem>
                <SelectItem value="resolved" data-testid="option-status-resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
            {updateStatusMutation.isPending && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
        </div>
      </div>

      {/* Case Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Case Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{caseDetails.customerName}</p>
                <p className="text-xs text-muted-foreground">Customer</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{formatDistanceToNow(new Date(caseDetails.createdAt), { addSuffix: true })}</p>
                <p className="text-xs text-muted-foreground">Created</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{caseDetails.loanId || "N/A"}</p>
                <p className="text-xs text-muted-foreground">Loan ID</p>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium">{caseDetails.customerState}</p>
              <p className="text-xs text-muted-foreground">State</p>
            </div>
          </div>
          
          {/* Assignment Section */}
          <div className="mt-6 p-4 bg-muted/30 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Assignment</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-2">Assigned to:</p>
                <Select
                  value={caseDetails.assignedToUserId || "unassigned"}
                  onValueChange={handleAssignmentChange}
                  disabled={assignCaseMutation.isPending}
                  data-testid="select-case-assignment"
                >
                  <SelectTrigger className="w-full" data-testid="trigger-assignment-dropdown">
                    <SelectValue placeholder="Select assignee" />
                  </SelectTrigger>
                  <SelectContent data-testid="content-assignment-options">
                    <SelectItem value="unassigned" data-testid="option-unassigned">Unassigned</SelectItem>
                    {assignees.map((assignee) => (
                      <SelectItem key={assignee.id} value={assignee.id} data-testid={`option-assignee-${assignee.id}`}>
                        <div className="flex items-center gap-2">
                          <span>{assignee.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {assignee.role}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {caseDetails.assignedUserName && (
                <div className="flex-1" data-testid="section-current-assignee">
                  <p className="text-xs text-muted-foreground mb-1">Current assignee:</p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium" data-testid="text-assignee-name">{caseDetails.assignedUserName}</span>
                    <Badge variant="secondary" className="text-xs" data-testid="badge-assignee-role">
                      {caseDetails.assignedUserRole}
                    </Badge>
                  </div>
                  {caseDetails.assignedUserEmail && (
                    <p className="text-xs text-muted-foreground" data-testid="text-assignee-email">{caseDetails.assignedUserEmail}</p>
                  )}
                </div>
              )}
              {assignCaseMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm text-muted-foreground">Case Details</p>
            <p className="text-sm mt-1">{caseDetails.details}</p>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="checklist" data-testid="tab-checklist">Checklist</TabsTrigger>
          <TabsTrigger value="documents" data-testid="tab-documents">Documents</TabsTrigger>
          <TabsTrigger value="notes" data-testid="tab-notes">
            <MessageSquare className="h-4 w-4 mr-2" />
            Notes
          </TabsTrigger>
          <TabsTrigger value="resolution" data-testid="tab-resolution">Resolution</TabsTrigger>
          <TabsTrigger value="audit" data-testid="tab-audit">Audit Log</TabsTrigger>
        </TabsList>

        <TabsContent value="checklist" className="mt-6">
          <ChecklistTab caseId={caseId} />
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          <DocumentsTab caseId={caseId} />
        </TabsContent>

        <TabsContent value="notes" className="mt-6">
          <CaseNotesTab caseId={caseId} />
        </TabsContent>

        <TabsContent value="resolution" className="mt-6">
          <ResolutionTab caseId={caseId} />
        </TabsContent>

        <TabsContent value="audit" className="mt-6">
          <AuditTab caseId={caseId} />
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex justify-end gap-4">
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" onClick={handleEditCase} data-testid="button-edit-case">
              <Edit className="h-4 w-4 mr-2" />
              Edit Case
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Case Details</DialogTitle>
              <DialogDescription>
                Update case information and representative details.
              </DialogDescription>
            </DialogHeader>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(handleEditSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="loanId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Loan ID (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter loan ID if applicable" {...field} data-testid="input-edit-loan-id" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editForm.control}
                    name="lenderName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lender Name (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter lender name" {...field} data-testid="input-edit-lender-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={editForm.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer State</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter customer state" {...field} data-testid="input-edit-state" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="details"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Case Details</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Provide detailed information about the case..."
                          className="min-h-[120px]"
                          {...field}
                          data-testid="textarea-edit-details"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* POA/Attorney Representation Section */}
                <div className="border-t pt-4">
                  <FormField
                    control={editForm.control}
                    name="hasRepresentative"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={(checked) => {
                              field.onChange(checked);
                              setHasRepresentative(checked as boolean);
                              // Clear representative fields when unchecked
                              if (!checked) {
                                editForm.setValue("representativeCompanyName", "");
                                editForm.setValue("representativePersonName", "");
                                editForm.setValue("representativeAddress", "");
                                editForm.setValue("representativeEmail", "");
                                editForm.setValue("representativePhone", "");
                              }
                            }}
                            data-testid="checkbox-edit-has-representative"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            Is the customer being represented by a Power of Attorney (POA) or Attorney?
                          </FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />

                  {hasRepresentative && (
                    <div className="mt-4 space-y-4 p-4 bg-muted/30 rounded-lg">
                      <h4 className="text-sm font-medium text-muted-foreground mb-4">
                        Representative Information
                      </h4>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={editForm.control}
                          name="representativeCompanyName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Company Name *</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter company name" {...field} data-testid="input-edit-representative-company" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={editForm.control}
                          name="representativePersonName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Person's Name *</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter person's name" {...field} data-testid="input-edit-representative-person" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={editForm.control}
                        name="representativeAddress"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Address *</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Enter complete address..."
                                className="min-h-[80px]"
                                {...field}
                                data-testid="textarea-edit-representative-address"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={editForm.control}
                          name="representativeEmail"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email Address *</FormLabel>
                              <FormControl>
                                <Input 
                                  type="email" 
                                  placeholder="Enter email address" 
                                  {...field} 
                                  data-testid="input-edit-representative-email" 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={editForm.control}
                          name="representativePhone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Phone Number *</FormLabel>
                              <FormControl>
                                <Input 
                                  type="tel" 
                                  placeholder="Enter phone number" 
                                  {...field} 
                                  data-testid="input-edit-representative-phone" 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <DialogFooter>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsEditDialogOpen(false)}
                    data-testid="button-edit-cancel"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={updateCaseMutation.isPending}
                    data-testid="button-edit-save"
                  >
                    {updateCaseMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <Button onClick={handleResolveCase} disabled={caseDetails.status === "resolved"} data-testid="button-resolve-case">
          Resolve Case
        </Button>
      </div>
    </div>
  );
}