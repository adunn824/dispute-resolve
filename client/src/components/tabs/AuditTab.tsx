import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Calendar, FileText, Upload, CheckCircle, Settings, Search, Download } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { useState } from "react";

interface AuditTabProps {
  caseId: string;
}

// Mock audit log data - TODO: remove mock functionality
const mockAuditEntries = [
  {
    id: "audit-1",
    action: "case_created",
    actor: "Sarah Johnson",
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    details: {
      caseType: "Complaint",
      category: "CFPB",
      priority: "High"
    },
    description: "Case created with initial priority set to High"
  },
  {
    id: "audit-2", 
    action: "document_uploaded",
    actor: "Sarah Johnson",
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
    details: {
      documentType: "Loan Agreement",
      fileName: "loan_agreement_12345.pdf"
    },
    description: "Uploaded loan agreement document"
  },
  {
    id: "audit-3",
    action: "checklist_completed",
    actor: "Mike Chen",
    timestamp: new Date(Date.now() - 18 * 60 * 60 * 1000),
    details: {
      itemId: "verify_identity",
      itemLabel: "Verify Customer Identity"
    },
    description: "Completed checklist item: Verify Customer Identity"
  },
  {
    id: "audit-4",
    action: "case_assigned",
    actor: "Lisa Rodriguez",
    timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000),
    details: {
      assignedTo: "Mike Chen",
      previousAssignee: null
    },
    description: "Case assigned to Mike Chen"
  },
  {
    id: "audit-5",
    action: "priority_changed",
    actor: "System",
    timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000),
    details: {
      oldPriority: "High",
      newPriority: "Critical",
      reason: "SLA deadline approaching"
    },
    description: "Priority automatically updated from High to Critical due to SLA deadline"
  },
  {
    id: "audit-6",
    action: "note_added",
    actor: "Mike Chen",
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
    details: {
      noteLength: 150
    },
    description: "Added case note regarding customer communication"
  }
];

const actionTypes = [
  "All Actions",
  "case_created",
  "case_updated", 
  "document_uploaded",
  "checklist_completed",
  "case_assigned",
  "priority_changed",
  "note_added",
  "status_changed"
];

export function AuditTab({ caseId }: AuditTabProps) {
  const [filteredEntries, setFilteredEntries] = useState(mockAuditEntries);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAction, setSelectedAction] = useState("All Actions");

  const getActionIcon = (action: string) => {
    switch (action) {
      case "case_created":
        return <FileText className="h-4 w-4" />;
      case "document_uploaded":
        return <Upload className="h-4 w-4" />;
      case "checklist_completed":
        return <CheckCircle className="h-4 w-4" />;
      case "case_assigned":
        return <User className="h-4 w-4" />;
      case "priority_changed":
      case "status_changed":
        return <Settings className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case "case_created":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400";
      case "document_uploaded":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
      case "checklist_completed":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400";
      case "case_assigned":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400";
      case "priority_changed":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400";
      case "status_changed":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
    }
  };

  const handleFilter = () => {
    let filtered = mockAuditEntries;
    
    if (selectedAction !== "All Actions") {
      filtered = filtered.filter(entry => entry.action === selectedAction);
    }
    
    if (searchTerm) {
      filtered = filtered.filter(entry => 
        entry.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.actor.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    setFilteredEntries(filtered);
  };

  const handleExport = () => {
    console.log("Exporting audit log for case:", caseId);
    // TODO: Implement audit log export
  };

  return (
    <div className="space-y-6" data-testid="tab-content-audit">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Audit Log Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search audit entries..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-audit-search"
                />
              </div>
            </div>
            
            <div className="w-48">
              <label className="text-sm font-medium mb-2 block">Action Type</label>
              <Select value={selectedAction} onValueChange={setSelectedAction} data-testid="select-action-type">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {actionTypes.map((action) => (
                    <SelectItem key={action} value={action}>
                      {action}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Button onClick={handleFilter} data-testid="button-filter">
              Apply Filters
            </Button>
            
            <Button variant="outline" onClick={handleExport} data-testid="button-export">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Audit Entries */}
      <Card>
        <CardHeader>
          <CardTitle>Audit Trail ({filteredEntries.length} entries)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredEntries.map((entry) => (
              <div key={entry.id} className="flex gap-4 p-4 border rounded-lg hover-elevate">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center text-muted-foreground">
                    {getActionIcon(entry.action)}
                  </div>
                </div>
                
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant="secondary" 
                        className={getActionColor(entry.action)}
                      >
                        {entry.action.replace(/_/g, ' ')}
                      </Badge>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <User className="h-3 w-3" />
                        <span>{entry.actor}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span title={format(entry.timestamp, "PPP 'at' p")}>
                        {formatDistanceToNow(entry.timestamp, { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-sm">{entry.description}</p>
                  
                  {entry.details && Object.keys(entry.details).length > 0 && (
                    <details className="text-xs text-muted-foreground">
                      <summary className="cursor-pointer hover:text-foreground">View Details</summary>
                      <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">
                        {JSON.stringify(entry.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            ))}
            
            {filteredEntries.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2" />
                <p>No audit entries found matching the current filters</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}