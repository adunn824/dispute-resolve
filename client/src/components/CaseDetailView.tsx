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
import { ArrowLeft, User, Calendar, FileText } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface CaseDetailViewProps {
  caseId: string;
  onBack: () => void;
}

// Mock case data - TODO: remove mock functionality
const mockCase = {
  id: "CASE-001",
  caseType: "Complaint" as const,
  category: "CFPB",
  priority: "High" as const,
  status: "open" as const,
  customerName: "John Smith",
  customerState: "CA",
  loanId: "LOAN-12345",
  details: "Customer complaint regarding unauthorized charges on their account. They claim they never authorized the payment and are requesting a full refund.",
  createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
  assignedTo: "Sarah Johnson",
  slaDeadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
};

export function CaseDetailView({ caseId, onBack }: CaseDetailViewProps) {
  const [activeTab, setActiveTab] = useState("checklist");
  
  const handleResolveCase = () => {
    console.log("Resolving case:", caseId);
    // TODO: Implement case resolution logic
  };

  return (
    <div className="space-y-6" data-testid="view-case-detail">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack} data-testid="button-back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Case #{mockCase.id}</h1>
          <p className="text-muted-foreground">{mockCase.caseType} • {mockCase.category}</p>
        </div>
        <div className="flex gap-2">
          <PriorityBadge priority={mockCase.priority} />
          <StatusBadge status={mockCase.status} />
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
                <p className="text-sm font-medium">{mockCase.customerName}</p>
                <p className="text-xs text-muted-foreground">Customer</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{formatDistanceToNow(mockCase.createdAt, { addSuffix: true })}</p>
                <p className="text-xs text-muted-foreground">Created</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{mockCase.loanId}</p>
                <p className="text-xs text-muted-foreground">Loan ID</p>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium">{mockCase.assignedTo}</p>
              <p className="text-xs text-muted-foreground">Assigned To</p>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm text-muted-foreground">Case Details</p>
            <p className="text-sm mt-1">{mockCase.details}</p>
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
        <Button onClick={handleResolveCase} disabled={mockCase.status === "resolved" || mockCase.status === "closed"} data-testid="button-resolve-case">
          Resolve Case
        </Button>
      </div>
    </div>
  );
}