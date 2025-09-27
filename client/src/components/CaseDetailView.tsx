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
import { ArrowLeft, User, Calendar, FileText, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "../lib/queryClient";

interface CaseDetailViewProps {
  caseId: string;
  onBack: () => void;
}

interface CaseDetailData {
  id: string;
  caseTypeId: string;
  categoryId: string;
  customerId: string;
  loanId?: string;
  state: string;
  details: string;
  status: "open" | "pending" | "resolved" | "closed";
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
}

export function CaseDetailView({ caseId, onBack }: CaseDetailViewProps) {
  const [activeTab, setActiveTab] = useState("checklist");
  
  // Fetch case details from API
  const { data: caseData, isLoading, error } = useQuery<{data: CaseDetailData}>({
    queryKey: ["/api/cases", caseId],
    queryFn: () => apiRequest("GET", `/api/cases/${caseId}`)
  });

  const caseDetails = caseData?.data;
  
  const handleResolveCase = () => {
    console.log("Resolving case:", caseId);
    // TODO: Implement case resolution logic
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
        <div className="flex gap-2">
          <PriorityBadge priority={caseDetails.priorityValue as "Low" | "Medium" | "High"} />
          <StatusBadge status={caseDetails.status} />
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
          <div className="mt-4">
            <p className="text-sm text-muted-foreground">Case Details</p>
            <p className="text-sm mt-1">{caseDetails.details}</p>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="checklist" data-testid="tab-checklist">Checklist</TabsTrigger>
          <TabsTrigger value="documents" data-testid="tab-documents">Documents</TabsTrigger>
          <TabsTrigger value="resolution" data-testid="tab-resolution">Resolution</TabsTrigger>
          <TabsTrigger value="audit" data-testid="tab-audit">Audit Log</TabsTrigger>
        </TabsList>

        <TabsContent value="checklist" className="mt-6">
          <ChecklistTab caseId={caseId} />
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          <DocumentsTab caseId={caseId} />
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
        <Button onClick={handleResolveCase} disabled={caseDetails.status === "resolved" || caseDetails.status === "closed"} data-testid="button-resolve-case">
          Resolve Case
        </Button>
      </div>
    </div>
  );
}