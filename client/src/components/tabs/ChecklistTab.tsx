import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, Circle, User, Clock, AlertCircle, RefreshCw, Play } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ChecklistItem {
  key: string;
  label: string;
  description?: string | null;
  isRequired: boolean;
  sortOrder: number;
  helpText?: string | null;
  estimatedDuration?: number | null;
  templateId: string;
  templateName: string;
  // Completion state fields
  completed: boolean;
  completedAt?: Date | null;
  assignedToUserId?: string | null;
  checklistItemId?: string | null;
}

interface ChecklistTabProps {
  caseId: string;
}

export function ChecklistTab({ caseId }: ChecklistTabProps) {
  const { toast } = useToast();

  // Fetch dynamic checklist items for this case
  const { data: checklistResponse, isLoading, refetch } = useQuery<{data: ChecklistItem[]}>({
    queryKey: [`/api/cases/${caseId}/dynamic-checklist`],
    queryFn: () => apiRequest("GET", `/api/cases/${caseId}/dynamic-checklist`),
    enabled: !!caseId,
  });

  const checklistItems = checklistResponse?.data || [];

  // Fetch users for assignment
  const { data: usersResponse } = useQuery<{ data: { id: string; name: string; email: string; role: string }[] }>({
    queryKey: ["/api/users"],
  });
  const users = usersResponse?.data || [];

  // Complete/reopen dynamic checklist item
  const toggleMutation = useMutation({
    mutationFn: ({ key, action }: { key: string; action: "complete" | "reopen" }) =>
      apiRequest("POST", `/api/cases/${caseId}/checklist/${key}/${action}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/cases/${caseId}/dynamic-checklist`] });
      toast({ title: "Success", description: "Checklist item updated" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update checklist item", variant: "destructive" });
    },
  });

  const handleToggleItem = (item: ChecklistItem) => {
    const action = item.completed ? "reopen" : "complete";
    toggleMutation.mutate({ key: item.key, action });
  };

  const getStatusIcon = (completed: boolean, isRequired: boolean) => {
    if (completed) {
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    }
    return isRequired ? 
      <Circle className="h-5 w-5 text-orange-500" /> : 
      <Circle className="h-5 w-5 text-muted-foreground" />;
  };

  const getStatusBadge = (completed: boolean, isRequired: boolean) => {
    if (completed) {
      return <Badge className="bg-green-100 text-green-800 border-green-200">Complete</Badge>;
    }
    return isRequired ? 
      <Badge variant="destructive">Required</Badge> : 
      <Badge variant="secondary">Optional</Badge>;
  };

  const formatDate = (date?: Date | string | null) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString();
  };

  const completedItems = checklistItems.filter(item => item.completed).length;
  const totalItems = checklistItems.length;
  const requiredItems = checklistItems.filter(item => item.isRequired);
  const completedRequiredItems = requiredItems.filter(item => item.completed).length;

  return (
    <div className="space-y-6" data-testid="tab-content-checklist">
      {/* Progress Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{completedItems}/{totalItems}</p>
                <p className="text-sm text-muted-foreground">Items Complete</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{completedRequiredItems}/{requiredItems.length}</p>
                <p className="text-sm text-muted-foreground">Required Complete</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{Math.round((completedItems / totalItems) * 100) || 0}%</p>
                <p className="text-sm text-muted-foreground">Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Checklist Actions</CardTitle>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                onClick={() => refetch()}
                disabled={isLoading}
                data-testid="button-refresh-checklist"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {checklistItems.length === 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No checklist items found. Checklist items are dynamically assigned based on business rules.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Checklist Items */}
      {checklistItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Checklist Items</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Loading checklist items...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Status</TableHead>
                    <TableHead>Task</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {checklistItems
                    .sort((a, b) => {
                      // Sort by: required first, then by completion status, then by label
                      if (a.isRequired !== b.isRequired) return a.isRequired ? -1 : 1;
                      if (a.completed !== b.completed) return a.completed ? 1 : -1;
                      return a.label.localeCompare(b.label);
                    })
                    .map((item) => (
                    <TableRow key={item.key}>
                      <TableCell>
                        <button
                          onClick={() => handleToggleItem(item)}
                          disabled={toggleMutation.isPending}
                          className="hover:scale-110 transition-transform"
                          data-testid={`button-toggle-${item.key}`}
                        >
                          {getStatusIcon(item.completed, item.isRequired)}
                        </button>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-2">
                          <p className={`font-medium ${item.completed ? "line-through text-muted-foreground" : ""}`}>
                            {item.label}
                          </p>
                          {item.description && (
                            <p className="text-sm">
                              {item.description}
                            </p>
                          )}
                          {item.helpText && (
                            <div className="text-sm bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded p-2 mt-1">
                              <p className="text-blue-900 dark:text-blue-100">
                                <strong>Instructions:</strong> {item.helpText}
                              </p>
                            </div>
                          )}
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                            <span>
                              Key: <code className="bg-muted px-1 py-0.5 rounded">{item.key}</code>
                            </span>
                            <span>•</span>
                            <span>From: {item.templateName}</span>
                            {item.estimatedDuration && (
                              <>
                                <span>•</span>
                                <span>Est. {item.estimatedDuration} min</span>
                              </>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(item.completed, item.isRequired)}
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground">—</span>
                      </TableCell>
                      <TableCell>
                        {item.completedAt ? (
                          <div className="text-sm">
                            <p>{formatDate(item.completedAt)}</p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleItem(item)}
                          disabled={toggleMutation.isPending}
                          data-testid={`button-action-${item.key}`}
                        >
                          {item.completed ? "Reopen" : "Complete"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}