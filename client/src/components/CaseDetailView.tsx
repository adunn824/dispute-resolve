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
import { ArrowLeft, User, Calendar, FileText, Loader2, Settings, UserCheck, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "../lib/queryClient";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

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
  state: string;
  details: string;
  status: "open" | "in_progress" | "resolved";
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
        <Button variant="outline" data-testid="button-edit-case">
          Edit Case
        </Button>
        <Button onClick={handleResolveCase} disabled={caseDetails.status === "resolved"} data-testid="button-resolve-case">
          Resolve Case
        </Button>
      </div>
    </div>
  );
}