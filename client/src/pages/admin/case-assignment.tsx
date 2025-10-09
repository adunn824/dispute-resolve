import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { User, Clock, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";

type UserAssignmentStatus = {
  id: string;
  username: string;
  name: string;
  firstName?: string;
  lastName?: string;
  role: "admin" | "compliance" | "agent";
  availabilityStatus: "available" | "not_available";
  lastAssignedAt?: string;
  assignedCasesCount: number;
};

export default function CaseAssignmentPage() {
  const { toast } = useToast();

  // Fetch assignment status for all users
  const { data: users = [], isLoading } = useQuery<UserAssignmentStatus[]>({
    queryKey: ["/api/users/assignment-status"],
  });

  // Toggle availability mutation
  const toggleAvailabilityMutation = useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: "available" | "not_available" }) =>
      apiRequest("PATCH", `/api/users/${userId}/availability`, { availabilityStatus: status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/assignment-status"] });
      toast({ title: "Success", description: "User availability updated" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update availability", variant: "destructive" });
    },
  });

  const handleToggle = (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === "available" ? "not_available" : "available";
    toggleAvailabilityMutation.mutate({ userId, status: newStatus });
  };

  const availableUsers = users.filter(u => u.availabilityStatus === "available");
  const totalAssignments = users.reduce((sum, u) => sum + u.assignedCasesCount, 0);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Case Assignment Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage user availability for automatic case assignment
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Users</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-available-count">{availableUsers.length}</div>
            <p className="text-xs text-muted-foreground">
              Out of {users.length} total users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assignments</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-assignments">{totalAssignments}</div>
            <p className="text-xs text-muted-foreground">
              All-time case assignments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg per User</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-avg-assignments">
              {users.length > 0 ? (totalAssignments / users.length).toFixed(1) : "0"}
            </div>
            <p className="text-xs text-muted-foreground">
              Assignment distribution
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Availability</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">Loading users...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Assigned</TableHead>
                  <TableHead>Total Assigned</TableHead>
                  <TableHead>Available for Assignment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div data-testid={`text-username-${user.id}`}>{user.username}</div>
                          <div className="text-xs text-muted-foreground">
                            {user.firstName} {user.lastName}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" data-testid={`badge-role-${user.id}`}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.availabilityStatus === "available" ? (
                        <Badge variant="default" className="bg-green-600 hover:bg-green-700" data-testid={`badge-status-${user.id}`}>
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Available
                        </Badge>
                      ) : (
                        <Badge variant="secondary" data-testid={`badge-status-${user.id}`}>
                          <XCircle className="h-3 w-3 mr-1" />
                          Not Available
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell data-testid={`text-last-assigned-${user.id}`}>
                      {user.lastAssignedAt ? (
                        <span className="text-sm">
                          {formatDistanceToNow(new Date(user.lastAssignedAt), { addSuffix: true })}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm">Never</span>
                      )}
                    </TableCell>
                    <TableCell data-testid={`text-assigned-count-${user.id}`}>
                      {user.assignedCasesCount}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={user.availabilityStatus === "available"}
                        onCheckedChange={() => handleToggle(user.id, user.availabilityStatus)}
                        disabled={toggleAvailabilityMutation.isPending}
                        data-testid={`switch-availability-${user.id}`}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
