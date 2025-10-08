import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Mail, Clock, Eye, Paperclip, RefreshCw, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface EmailIntakeCase {
  id: string;
  caseNumber: number;
  status: string;
  details: string;
  emailMetadata?: {
    from: string;
    to?: string;
    subject?: string;
    receivedDate?: string;
    messageId?: string;
    hasAttachments?: boolean;
    attachmentCount?: number;
    body?: string;
    bodyPreview?: string;
  };
  receivedAt?: string;
  firstViewedAt?: string;
  ageInHours: number;
  createdAt: string;
}

export default function EmailIntakePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: intakeCasesData, isLoading, refetch } = useQuery<{ data: EmailIntakeCase[] }>({
    queryKey: ["/api/cases/email-intake"],
    queryFn: () => apiRequest("GET", "/api/cases/email-intake"),
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  const markViewedMutation = useMutation({
    mutationFn: (caseId: string) =>
      apiRequest("POST", `/api/cases/${caseId}/mark-viewed`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases/email-intake"] });
    },
  });

  const intakeCases = intakeCasesData?.data || [];

  const handleViewCase = (caseItem: EmailIntakeCase) => {
    // Mark as viewed if not already viewed
    if (!caseItem.firstViewedAt) {
      markViewedMutation.mutate(caseItem.id);
    }
    setLocation(`/cases/${caseItem.id}`);
  };

  const getAgeColor = (ageInHours: number) => {
    if (ageInHours < 1) return "text-green-600 dark:text-green-400";
    if (ageInHours < 4) return "text-yellow-600 dark:text-yellow-400";
    if (ageInHours < 24) return "text-orange-600 dark:text-orange-400";
    return "text-red-600 dark:text-red-400";
  };

  const formatAge = (ageInHours: number) => {
    if (ageInHours < 1) return "< 1h";
    if (ageInHours < 24) return `${ageInHours}h`;
    const days = Math.floor(ageInHours / 24);
    const hours = ageInHours % 24;
    return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Email Intake Queue</h1>
          <p className="text-muted-foreground mt-1">
            Review and process incoming emails
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={isLoading}
            data-testid="button-refresh-intake"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Emails</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{intakeCases.length}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Urgent</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {intakeCases.filter(c => c.ageInHours >= 24).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Over 24 hours old
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {intakeCases.length > 0
                ? `${Math.round(intakeCases.reduce((acc, c) => acc + c.ageInHours, 0) / intakeCases.length)}h`
                : "N/A"}
            </div>
            <p className="text-xs text-muted-foreground">
              Current backlog
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Email List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Pending Email Cases
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="ml-2">Loading email intake queue...</span>
            </div>
          ) : intakeCases.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              <Mail className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No pending email cases</p>
              <p className="text-sm mt-1">All emails have been processed</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Case #</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Preview</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {intakeCases.map((caseItem) => (
                  <TableRow key={caseItem.id}>
                    <TableCell className="font-mono text-sm">
                      #{caseItem.caseNumber}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {caseItem.emailMetadata?.from || "Unknown"}
                        </span>
                        {caseItem.emailMetadata?.hasAttachments && (
                          <Badge variant="secondary" className="w-fit mt-1">
                            <Paperclip className="w-3 h-3 mr-1" />
                            {caseItem.emailMetadata.attachmentCount || 1}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">
                        {caseItem.emailMetadata?.subject || "No Subject"}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-md">
                      <p className="text-sm text-muted-foreground truncate">
                        {caseItem.emailMetadata?.bodyPreview || caseItem.details}
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className={`flex items-center gap-2 font-semibold ${getAgeColor(caseItem.ageInHours)}`}>
                        <Clock className="w-4 h-4" />
                        {formatAge(caseItem.ageInHours)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {caseItem.firstViewedAt ? (
                        <Badge variant="secondary">
                          <Eye className="w-3 h-3 mr-1" />
                          Viewed
                        </Badge>
                      ) : (
                        <Badge variant="outline">New</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        onClick={() => handleViewCase(caseItem)}
                        data-testid={`button-view-case-${caseItem.caseNumber}`}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Review
                      </Button>
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
