import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, Circle, User, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ChecklistTabProps {
  caseId: string;
}

// Mock checklist data - TODO: remove mock functionality
const mockChecklistItems = [
  {
    id: "item-1",
    label: "Verify Customer Identity",
    isRequired: true,
    status: "complete" as const,
    assignedTo: "Sarah Johnson",
    completedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    helpText: "Confirm customer identity using standard verification procedures"
  },
  {
    id: "item-2", 
    label: "Review Loan Agreement",
    isRequired: true,
    status: "open" as const,
    assignedTo: null,
    completedAt: null,
    helpText: "Review the original loan agreement for relevant terms and conditions"
  },
  {
    id: "item-3",
    label: "Document Customer Communications",
    isRequired: true,
    status: "open" as const,
    assignedTo: "Mike Chen",
    completedAt: null,
    helpText: "Log all communications with the customer in the case notes"
  },
  {
    id: "item-4",
    label: "Cease Communications if Requested",
    isRequired: false,
    status: "open" as const,
    assignedTo: null,
    completedAt: null,
    helpText: "If customer has requested to cease communications, update preferences"
  }
];

const mockAgents = ["Sarah Johnson", "Mike Chen", "Lisa Rodriguez", "James Wilson"];

export function ChecklistTab({ caseId }: ChecklistTabProps) {
  const [checklist, setChecklist] = useState(mockChecklistItems);

  const handleToggleItem = (itemId: string) => {
    setChecklist(items => 
      items.map(item => 
        item.id === itemId 
          ? { 
              ...item, 
              status: item.status === "complete" ? "open" as const : "complete" as const,
              completedAt: item.status === "open" ? new Date() : null
            }
          : item
      )
    );
    console.log("Toggled checklist item:", itemId);
  };

  const handleAssignItem = (itemId: string, assignee: string) => {
    setChecklist(items =>
      items.map(item =>
        item.id === itemId ? { ...item, assignedTo: assignee } : item
      )
    );
    console.log("Assigned item", itemId, "to", assignee);
  };

  const completedItems = checklist.filter(item => item.status === "complete").length;
  const requiredItems = checklist.filter(item => item.isRequired).length;
  const completedRequiredItems = checklist.filter(item => item.isRequired && item.status === "complete").length;

  return (
    <div className="space-y-6" data-testid="tab-content-checklist">
      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Checklist Progress
            <Badge variant="outline">
              {completedItems}/{checklist.length} Complete
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Required Items</span>
              <span>{completedRequiredItems}/{requiredItems}</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all" 
                style={{ width: `${(completedRequiredItems / requiredItems) * 100}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Checklist Items */}
      <div className="space-y-4">
        {checklist.map((item) => (
          <Card key={item.id} className="hover-elevate">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={item.status === "complete"}
                  onCheckedChange={() => handleToggleItem(item.id)}
                  className="mt-1"
                  data-testid={`checkbox-item-${item.id}`}
                />
                
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${item.status === "complete" ? "line-through text-muted-foreground" : ""}`}>
                      {item.label}
                    </span>
                    {item.isRequired && (
                      <Badge variant="destructive" className="text-xs">Required</Badge>
                    )}
                    {item.status === "complete" && (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                  </div>
                  
                  {item.helpText && (
                    <p className="text-sm text-muted-foreground">{item.helpText}</p>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {item.assignedTo && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <User className="h-3 w-3" />
                          <span>{item.assignedTo}</span>
                        </div>
                      )}
                      
                      {item.completedAt && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>Completed {formatDistanceToNow(item.completedAt, { addSuffix: true })}</span>
                        </div>
                      )}
                    </div>
                    
                    {item.status === "open" && (
                      <Select onValueChange={(value) => handleAssignItem(item.id, value)}>
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="Assign to..." />
                        </SelectTrigger>
                        <SelectContent>
                          {mockAgents.map((agent) => (
                            <SelectItem key={agent} value={agent}>
                              {agent}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}