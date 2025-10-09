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
import { ArrowLeft, User, Calendar, FileText, Loader2, Settings, UserCheck, MessageSquare, Edit, Mail, Paperclip, Trash2 } from "lucide-react";
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
import { useAuth } from "@/contexts/AuthContext";

// Form schema for editing case details
const editCaseSchema = z.object({
  caseOriginationId: z.string().min(1, "Case origination is required"),
  caseTypeId: z.string().min(1, "Case type is required"),
  categoryId: z.string().min(1, "Category is required"),
  customerName: z.string().min(1, "Customer name is required"),
  loanId: z.string().optional(),
  lenderId: z.string().optional(),
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

// Form schema for completing email intake
const intakeCompletionSchema = z.object({
  customerName: z.string().min(1, "Customer name is required"),
  customerState: z.string().min(2, "State is required"),
  caseTypeId: z.string().min(1, "Case type is required"),
  categoryId: z.string().min(1, "Category is required"),
  priorityRuleId: z.string().min(1, "Priority rule is required"),
  lenderId: z.string().optional(),
  loanId: z.string().optional(),
  details: z.string().min(10, "Details must be at least 10 characters"),
});

type IntakeCompletionFormValues = z.infer<typeof intakeCompletionSchema>;

interface CaseDetailViewProps {
  caseId: string;
  onBack: () => void;
}

interface EmailMetadata {
  from: string;
  to: string;
  subject: string;
  receivedAt: string;
  attachmentCount?: number;
  bodyPreview: string;
}

interface CaseDetailData {
  id: string;
  caseNumber?: string;
  caseTypeId: string;
  categoryId: string;
  customerId: string;
  assignedToUserId?: string;
  secondaryAssignedToUserId?: string;
  loanId?: string;
  lenderName?: string;
  lenderId?: string;
  state: string;
  details: string;
  status: "open" | "in_progress" | "resolved" | "pending_intake";
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
  caseOriginationId?: string;
  caseOriginationName?: string;
  caseOriginationDescription?: string;
  categoryName: string;
  categoryCode: string;
  priorityValue: string;
  priorityDescription?: string;
  assignedUserName?: string;
  assignedUserEmail?: string;
  assignedUserRole?: string;
  secondaryAssignedUserName?: string;
  secondaryAssignedUserEmail?: string;
  secondaryAssignedUserRole?: string;
  emailMetadata?: EmailMetadata;
}

interface Assignee {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface CaseType {
  id: string;
  name: string;
  description?: string;
  color?: string;
}

interface Category {
  id: string;
  name: string;
  code: string;
  description?: string;
}

interface PriorityRule {
  id: string;
  name: string;
  priority: string;
}

interface Lender {
  id: string;
  name: string;
  dba?: string | null;
}

interface CaseOrigination {
  id: string;
  name: string;
  description?: string;
  externalKey?: string;
}

const usStates = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
];

export function CaseDetailView({ caseId, onBack }: CaseDetailViewProps) {
  const [activeTab, setActiveTab] = useState("checklist");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [hasRepresentative, setHasRepresentative] = useState(false);
  const [selectedCaseTypeId, setSelectedCaseTypeId] = useState<string | null>(null);
  const [editSelectedCaseTypeId, setEditSelectedCaseTypeId] = useState<string | null>(null);
  const { toast } = useToast();
  const { user, isLoading: isAuthLoading } = useAuth();
  
  // Fetch case details from API
  const { data: caseData, isLoading, error, refetch: refetchCase } = useQuery<{data: CaseDetailData}>({
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

  // Queries for intake form (only when status is pending_intake)
  const isPendingIntake = caseDetails?.status === "pending_intake";

  const { data: caseTypesData } = useQuery<{data: CaseType[]}>({
    queryKey: ["/api/case-types"],
    queryFn: () => apiRequest("GET", "/api/case-types"),
    enabled: isPendingIntake,
  });

  const { data: categoriesData } = useQuery<{data: Category[]}>({
    queryKey: ["/api/categories", selectedCaseTypeId],
    queryFn: () => apiRequest("GET", `/api/categories?caseTypeId=${selectedCaseTypeId}`),
    enabled: isPendingIntake && !!selectedCaseTypeId,
  });

  const { data: priorityRulesData } = useQuery<{data: PriorityRule[]}>({
    queryKey: ["/api/priority-rules"],
    queryFn: () => apiRequest("GET", "/api/priority-rules"),
    enabled: isPendingIntake,
  });

  const { data: lendersData } = useQuery<{data: Lender[]}>({
    queryKey: ["/api/lenders"],
    queryFn: () => apiRequest("GET", "/api/lenders"),
    enabled: isPendingIntake,
  });

  const caseTypes = caseTypesData?.data || [];
  const categories = categoriesData?.data || [];
  const priorityRules = priorityRulesData?.data || [];
  const lenders = lendersData?.data || [];

  // Queries for edit dialog
  const { data: caseOriginationsData } = useQuery<{data: CaseOrigination[]}>({
    queryKey: ["/api/case-originations"],
    queryFn: () => apiRequest("GET", "/api/case-originations"),
    enabled: isEditDialogOpen,
  });

  const { data: editCaseTypesData } = useQuery<{data: CaseType[]}>({
    queryKey: ["/api/case-types"],
    queryFn: () => apiRequest("GET", "/api/case-types"),
    enabled: isEditDialogOpen,
  });

  const { data: editLendersData } = useQuery<{data: Lender[]}>({
    queryKey: ["/api/lenders"],
    queryFn: () => apiRequest("GET", "/api/lenders"),
    enabled: isEditDialogOpen,
  });

  const { data: editCategoriesData } = useQuery<{data: Category[]}>({
    queryKey: ["/api/categories", editSelectedCaseTypeId],
    queryFn: () => apiRequest("GET", `/api/categories?caseTypeId=${editSelectedCaseTypeId}`),
    enabled: isEditDialogOpen && !!editSelectedCaseTypeId,
  });

  const caseOriginations = caseOriginationsData?.data || [];
  const editCaseTypes = editCaseTypesData?.data || [];
  const editLenders = editLendersData?.data || [];
  const editCategories = editCategoriesData?.data || [];

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
    mutationFn: (data: { assignedToUserId?: string | null; secondaryAssignedToUserId?: string | null }) =>
      apiRequest("PATCH", `/api/cases/${caseId}/assign`, data),
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

  // Mutation for completing email intake
  const completeIntakeMutation = useMutation({
    mutationFn: (data: IntakeCompletionFormValues) =>
      apiRequest("POST", `/api/cases/${caseId}/complete-intake`, data),
    onSuccess: () => {
      // Invalidate and refetch relevant queries
      queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId] });
      queryClient.invalidateQueries({ queryKey: ["/api/cases/email-intake"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      
      // Refetch case to show normal detail view
      refetchCase();
      
      toast({
        title: "Intake Completed",
        description: "Email intake has been successfully completed.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to complete intake",
        variant: "destructive",
      });
    },
  });

  // Mutation for deleting case
  const deleteCaseMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/cases/${caseId}`),
    onSuccess: () => {
      // Invalidate queries and navigate back
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      
      toast({
        title: "Case Deleted",
        description: "The case has been successfully deleted.",
      });
      
      // Navigate back to cases list
      onBack();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to delete case",
        variant: "destructive",
      });
    },
  });

  // Initialize form with current case data
  const editForm = useForm<EditCaseFormValues>({
    resolver: zodResolver(editCaseSchema),
    defaultValues: {
      caseOriginationId: caseDetails?.caseOriginationId || "",
      caseTypeId: caseDetails?.caseTypeId || "",
      categoryId: caseDetails?.categoryId || "",
      customerName: caseDetails?.customerName || "",
      loanId: caseDetails?.loanId || "",
      lenderId: caseDetails?.lenderId || "",
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

  // Initialize intake completion form
  const intakeForm = useForm<IntakeCompletionFormValues>({
    resolver: zodResolver(intakeCompletionSchema),
    defaultValues: {
      customerName: caseDetails?.emailMetadata?.from || "",
      customerState: "",
      caseTypeId: "",
      categoryId: "",
      priorityRuleId: "",
      lenderId: "",
      loanId: "",
      details: caseDetails?.emailMetadata?.bodyPreview || "",
    },
  });

  const handleStatusChange = (newStatus: "open" | "in_progress" | "resolved") => {
    updateStatusMutation.mutate(newStatus);
  };

  const handlePrimaryAssignmentChange = (assignedToUserId: string) => {
    // If "unassigned" is selected, pass null, otherwise pass the user ID
    const actualUserId = assignedToUserId === "unassigned" ? null : assignedToUserId;
    assignCaseMutation.mutate({ assignedToUserId: actualUserId });
  };

  const handleSecondaryAssignmentChange = (secondaryAssignedToUserId: string) => {
    // If "unassigned" is selected, pass null, otherwise pass the user ID
    const actualUserId = secondaryAssignedToUserId === "unassigned" ? null : secondaryAssignedToUserId;
    assignCaseMutation.mutate({ secondaryAssignedToUserId: actualUserId });
  };
  
  const handleResolveCase = () => {
    handleStatusChange("resolved");
  };

  const handleEditCase = () => {
    // Reset form with current case data when opening dialog
    if (caseDetails) {
      editForm.reset({
        caseOriginationId: caseDetails.caseOriginationId || "",
        caseTypeId: caseDetails.caseTypeId || "",
        categoryId: caseDetails.categoryId || "",
        customerName: caseDetails.customerName || "",
        loanId: caseDetails.loanId || "",
        lenderId: caseDetails.lenderId || "",
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
      setEditSelectedCaseTypeId(caseDetails.caseTypeId || null);
    }
    setIsEditDialogOpen(true);
  };

  const handleEditSubmit = (data: EditCaseFormValues) => {
    updateCaseMutation.mutate(data);
  };

  const handleIntakeSubmit = (data: IntakeCompletionFormValues) => {
    completeIntakeMutation.mutate(data);
  };

  const handleDeleteCase = () => {
    if (confirm("Are you sure you want to delete this case? This action cannot be undone and will delete all related data including documents, notes, and checklist items.")) {
      deleteCaseMutation.mutate();
    }
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
          <h1 className="text-2xl font-bold">Case #{caseDetails.caseNumber}</h1>
          <p className="text-muted-foreground">
            {isPendingIntake ? "Email Intake - Pending Completion" : (
              <>
                {caseDetails.caseOriginationName && `${caseDetails.caseOriginationName} • `}
                {caseDetails.caseTypeName} • {caseDetails.categoryName}
              </>
            )}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          {!isPendingIntake && <PriorityBadge priority={caseDetails.priorityValue as "Low" | "Medium" | "High"} />}
          <div className="flex items-center gap-2">
            <StatusBadge status={caseDetails.status} />
            {user && !user.isViewOnly && !isPendingIntake && (
              <Select
                value={caseDetails.status}
                onValueChange={handleStatusChange}
                disabled={updateStatusMutation.isPending || isAuthLoading}
              >
                <SelectTrigger className="w-32" data-testid="select-case-status">
                  <Settings className="h-4 w-4" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open" data-testid="option-status-open">Open</SelectItem>
                  <SelectItem value="in_progress" data-testid="option-status-in-progress">In Progress</SelectItem>
                  {user.canResolve && (
                    <SelectItem value="resolved" data-testid="option-status-resolved">Resolved</SelectItem>
                  )}
                </SelectContent>
              </Select>
            )}
            {updateStatusMutation.isPending && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
          {user?.canDelete && !isPendingIntake && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDeleteCase}
              disabled={deleteCaseMutation.isPending || isAuthLoading}
              data-testid="button-delete-case"
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Email Intake Section */}
      {isPendingIntake && caseDetails.emailMetadata && (
        <>
          {/* Email Metadata Card */}
          <Card data-testid="card-email-metadata">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">From</p>
                  <p className="text-sm font-medium" data-testid="text-email-from">{caseDetails.emailMetadata.from}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">To</p>
                  <p className="text-sm font-medium" data-testid="text-email-to">{caseDetails.emailMetadata.to}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Subject</p>
                  <p className="text-sm font-medium" data-testid="text-email-subject">{caseDetails.emailMetadata.subject}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Received</p>
                  <p className="text-sm font-medium" data-testid="text-email-received">
                    {formatDistanceToNow(new Date(caseDetails.emailMetadata.receivedAt), { addSuffix: true })}
                  </p>
                </div>
                {caseDetails.emailMetadata.attachmentCount !== undefined && caseDetails.emailMetadata.attachmentCount > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground">Attachments</p>
                    <p className="text-sm font-medium flex items-center gap-1" data-testid="text-email-attachments">
                      <Paperclip className="h-3 w-3" />
                      {caseDetails.emailMetadata.attachmentCount} file{caseDetails.emailMetadata.attachmentCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Email Body Preview</p>
                <div className="bg-muted/30 p-3 rounded-md">
                  <p className="text-sm whitespace-pre-wrap" data-testid="text-email-body">{caseDetails.emailMetadata.bodyPreview}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Intake Completion Form */}
          <Card data-testid="card-intake-form">
            <CardHeader>
              <CardTitle>Complete Intake</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...intakeForm}>
                <form onSubmit={intakeForm.handleSubmit(handleIntakeSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={intakeForm.control}
                      name="customerName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Customer Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter customer name" {...field} data-testid="input-intake-customer-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={intakeForm.control}
                      name="customerState"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Customer State</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} data-testid="select-intake-customer-state">
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select state" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {usStates.map((state) => (
                                <SelectItem key={state} value={state}>
                                  {state}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={intakeForm.control}
                      name="caseTypeId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Case Type</FormLabel>
                          <Select 
                            onValueChange={(value) => {
                              field.onChange(value);
                              setSelectedCaseTypeId(value);
                              intakeForm.setValue("categoryId", "");
                            }}
                            value={field.value}
                            data-testid="select-intake-case-type"
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select case type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {caseTypes.map((caseType) => (
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
                      control={intakeForm.control}
                      name="categoryId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select 
                            onValueChange={field.onChange}
                            value={field.value}
                            disabled={!selectedCaseTypeId}
                            data-testid="select-intake-category"
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={!selectedCaseTypeId ? "Select case type first" : "Select category"} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {categories.map((category) => (
                                <SelectItem key={category.id} value={category.id}>
                                  {category.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={intakeForm.control}
                    name="priorityRuleId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority Rule</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} data-testid="select-intake-priority-rule">
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select priority rule" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {priorityRules.map((rule) => (
                              <SelectItem key={rule.id} value={rule.id}>
                                {rule.name} ({rule.priority})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={intakeForm.control}
                      name="lenderId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Lender (Optional)</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} data-testid="select-intake-lender">
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select lender" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {lenders.map((lender) => (
                                <SelectItem key={lender.id} value={lender.id}>
                                  {lender.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={intakeForm.control}
                      name="loanId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Loan ID (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter loan ID" {...field} data-testid="input-intake-loan-id" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={intakeForm.control}
                    name="details"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Details</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Enter case details..."
                            className="min-h-[120px]"
                            {...field}
                            data-testid="textarea-intake-details"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-2">
                    <Button
                      type="submit"
                      disabled={completeIntakeMutation.isPending}
                      data-testid="button-complete-intake"
                    >
                      {completeIntakeMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Complete Intake
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </>
      )}

      {/* Normal Case Overview (only when not pending intake) */}
      {!isPendingIntake && (
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Primary Assignment */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">Primary Assignee:</p>
                {user && user.canAssign && !user.isViewOnly ? (
                  <Select
                    value={caseDetails.assignedToUserId || "unassigned"}
                    onValueChange={handlePrimaryAssignmentChange}
                    disabled={assignCaseMutation.isPending || isAuthLoading}
                    data-testid="select-primary-assignment"
                  >
                    <SelectTrigger className="w-full" data-testid="trigger-primary-assignment-dropdown">
                      <SelectValue placeholder="Select primary assignee" />
                    </SelectTrigger>
                    <SelectContent data-testid="content-primary-assignment-options">
                      <SelectItem value="unassigned" data-testid="option-primary-unassigned">Unassigned</SelectItem>
                      {assignees.map((assignee) => (
                        <SelectItem key={assignee.id} value={assignee.id} data-testid={`option-primary-assignee-${assignee.id}`}>
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
                ) : (
                  <p className="text-sm" data-testid="text-primary-assignment-readonly">
                    {caseDetails.assignedUserName || "Unassigned"}
                  </p>
                )}
              </div>

              {/* Secondary Assignment */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">Secondary Assignee:</p>
                {user && user.canAssign && !user.isViewOnly ? (
                  <Select
                    value={caseDetails.secondaryAssignedToUserId || "unassigned"}
                    onValueChange={handleSecondaryAssignmentChange}
                    disabled={assignCaseMutation.isPending || isAuthLoading}
                    data-testid="select-secondary-assignment"
                  >
                    <SelectTrigger className="w-full" data-testid="trigger-secondary-assignment-dropdown">
                      <SelectValue placeholder="Select secondary assignee" />
                    </SelectTrigger>
                    <SelectContent data-testid="content-secondary-assignment-options">
                      <SelectItem value="unassigned" data-testid="option-secondary-unassigned">Unassigned</SelectItem>
                      {assignees.map((assignee) => (
                        <SelectItem key={assignee.id} value={assignee.id} data-testid={`option-secondary-assignee-${assignee.id}`}>
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
                ) : (
                  <p className="text-sm" data-testid="text-secondary-assignment-readonly">
                    {caseDetails.secondaryAssignedUserName || "Unassigned"}
                  </p>
                )}
              </div>
            </div>
            {assignCaseMutation.isPending && (
              <div className="flex items-center justify-center mt-2">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            )}
          </div>
          <div className="mt-4">
            <p className="text-sm text-muted-foreground">Case Details</p>
            <p className="text-sm mt-1">{caseDetails.details}</p>
          </div>
        </CardContent>
      </Card>
      )}

      {/* Tabs (only when not pending intake) */}
      {!isPendingIntake && (
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
      )}

      {/* Action Buttons (only when not pending intake) */}
      {!isPendingIntake && (
        <div className="flex justify-end gap-4">
          {user && !user.isViewOnly && (
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                onClick={handleEditCase} 
                disabled={isAuthLoading}
                data-testid="button-edit-case"
              >
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
                    name="caseOriginationId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Case Origination</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-edit-case-origination">
                              <SelectValue placeholder="Select case origination" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {caseOriginations.map((origination) => (
                              <SelectItem key={origination.id} value={origination.id}>
                                {origination.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editForm.control}
                    name="caseTypeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Case Type</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            setEditSelectedCaseTypeId(value);
                          }} 
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-edit-case-type">
                              <SelectValue placeholder="Select case type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {editCaseTypes.map((type) => (
                              <SelectItem key={type.id} value={type.id}>
                                {type.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={editForm.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-category">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {editCategories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="customerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter customer name" {...field} data-testid="input-edit-customer-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                    name="lenderId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lender (Optional)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger data-testid="select-edit-lender">
                              <SelectValue placeholder="Select lender" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {editLenders.map((lender) => (
                              <SelectItem key={lender.id} value={lender.id}>
                                {lender.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-state">
                            <SelectValue placeholder="Select state" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {usStates.map((state) => (
                            <SelectItem key={state} value={state}>
                              {state}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
        )}

        {user && user.canResolve && !user.isViewOnly && (
          <Button 
            onClick={handleResolveCase} 
            disabled={caseDetails.status === "resolved" || isAuthLoading} 
            data-testid="button-resolve-case"
          >
            Resolve Case
          </Button>
        )}
        </div>
      )}
    </div>
  );
}