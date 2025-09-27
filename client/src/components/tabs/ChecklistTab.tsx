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
  id: string;
  caseId: string;
  key: string;
  label: string;
  isRequired: boolean;
  status: "open" | "complete";
  assignedToUserId?: string;
  completedAt?: string;
}

interface ChecklistTabProps {
  caseId: string;
}

export function ChecklistTab({ caseId }: ChecklistTabProps) {
  const { toast } = useToast();

  // Fetch checklist items for this case
  const { data: checklistItems = [], isLoading, refetch } = useQuery<ChecklistItem[]>({
    queryKey: [`/api/cases/${caseId}/checklist-items`],
    enabled: !!caseId,
  });

  // Fetch users for assignment
  const { data: users = [] } = useQuery<{ id: string; name: string; email: string; role: string }[]>({
    queryKey: ["/api/users"],
  });

  // Generate checklist items from templates
  const generateMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/cases/${caseId}/checklist-items/generate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/cases/${caseId}/checklist-items`] });
      toast({ title: "Success", description: "Checklist items generated from templates" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to generate checklist items", variant: "destructive" });
    },
  });

  // Complete/reopen checklist item
  const toggleMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "complete" | "reopen" }) =>
      apiRequest("POST", `/api/checklist-items/${id}/${action}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/cases/${caseId}/checklist-items`] });
      toast({ title: "Success", description: "Checklist item updated" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update checklist item", variant: "destructive" });
    },
  });

  // Assign checklist item
  const assignMutation = useMutation({
    mutationFn: ({ id, assignedToUserId }: { id: string; assignedToUserId: string }) =>
      apiRequest("PUT", `/api/checklist-items/${id}`, { assignedToUserId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/cases/${caseId}/checklist-items`] });
      toast({ title: "Success", description: "Checklist item assigned" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to assign checklist item", variant: "destructive" });
    },
  });

  const handleToggleItem = (item: ChecklistItem) => {
    const action = item.status === "complete" ? "reopen" : "complete";
    toggleMutation.mutate({ id: item.id, action });
  };

  const handleAssignItem = (itemId: string, assignedToUserId: string) => {
    assignMutation.mutate({ id: itemId, assignedToUserId });
  };

  const handleGenerateItems = () => {
    generateMutation.mutate();
  };

  const getStatusIcon = (status: string, isRequired: boolean) => {
    if (status === "complete") {
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    }
    return isRequired ? 
      <Circle className="h-5 w-5 text-orange-500" /> : 
      <Circle className="h-5 w-5 text-muted-foreground" />;
  };

  const getStatusBadge = (status: string, isRequired: boolean) => {
    if (status === "complete") {
      return <Badge className="bg-green-100 text-green-800 border-green-200">Complete</Badge>;
    }
    return isRequired ? 
      <Badge variant="destructive">Required</Badge> : 
      <Badge variant="secondary">Optional</Badge>;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString();
  };

  const completedItems = checklistItems.filter(item => item.status === "complete").length;
  const totalItems = checklistItems.length;
  const requiredItems = checklistItems.filter(item => item.isRequired);
  const completedRequiredItems = requiredItems.filter(item => item.status === "complete").length;

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
              <Button 
                onClick={handleGenerateItems}
                disabled={generateMutation.isPending || checklistItems.length > 0}
                data-testid="button-generate-checklist"
              >
                <Play className="h-4 w-4 mr-2" />
                Generate Checklist
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {checklistItems.length === 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No checklist items found for this case. Click "Generate Checklist" to create items from templates.
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
                      if (a.status !== b.status) return a.status === "open" ? -1 : 1;
                      return a.label.localeCompare(b.label);
                    })
                    .map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <button
                          onClick={() => handleToggleItem(item)}
                          disabled={toggleMutation.isPending}
                          className="hover:scale-110 transition-transform"
                          data-testid={`button-toggle-${item.id}`}
                        >
                          {getStatusIcon(item.status, item.isRequired)}
                        </button>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className={`font-medium ${item.status === "complete" ? "line-through text-muted-foreground" : ""}`}>
                            {item.label}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Key: <code className="text-xs bg-muted px-1 py-0.5 rounded">{item.key}</code>
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(item.status, item.isRequired)}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={item.assignedToUserId || "unassigned"}
                          onValueChange={(value) => handleAssignItem(item.id, value === "unassigned" ? null : value)}
                          disabled={assignMutation.isPending}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue placeholder="Assign" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unassigned">Unassigned</SelectItem>
                            {users.map(user => (
                              <SelectItem key={user.id} value={user.id}>
                                {user.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                          data-testid={`button-action-${item.id}`}
                        >
                          {item.status === "complete" ? "Reopen" : "Complete"}
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