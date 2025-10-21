import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Link2, Link2Off, Search, ExternalLink, Sparkles, ArrowRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "../../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import type { Case } from "@shared/schema";

interface LinkedCasesTabProps {
  caseId: string;
}

interface LinkedCase extends Case {
  linkType: string;
  linkedAt: Date;
}

export function LinkedCasesTab({ caseId }: LinkedCasesTabProps) {
  const [searchCaseId, setSearchCaseId] = useState("");
  const { toast } = useToast();
  const [, navigate] = useLocation();

  // Fetch linked cases
  const { data: linkedCasesData, isLoading: isLoadingLinked } = useQuery<{data: LinkedCase[]}>({
    queryKey: ["/api/cases", caseId, "linked-cases"],
  });

  // Fetch potential matches
  const { data: potentialMatchesData, isLoading: isLoadingMatches } = useQuery<{data: Case[]}>({
    queryKey: ["/api/cases", caseId, "potential-matches"],
  });

  const linkedCases = linkedCasesData?.data || [];
  const potentialMatches = potentialMatchesData?.data || [];

  // Mutation for linking cases
  const linkCasesMutation = useMutation({
    mutationFn: (linkedCaseId: string) =>
      apiRequest("POST", `/api/cases/${caseId}/link`, { linkedCaseId, linkType: "related" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId, "linked-cases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId, "potential-matches"] });
      setSearchCaseId("");
      toast({
        title: "Cases Linked",
        description: "The cases have been successfully linked.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to link cases",
        variant: "destructive",
      });
    },
  });

  // Mutation for unlinking cases
  const unlinkCasesMutation = useMutation({
    mutationFn: (linkedCaseId: string) =>
      apiRequest("DELETE", `/api/cases/${caseId}/link/${linkedCaseId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId, "linked-cases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId, "potential-matches"] });
      toast({
        title: "Cases Unlinked",
        description: "The cases have been successfully unlinked.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to unlink cases",
        variant: "destructive",
      });
    },
  });

  const handleLinkBySearch = () => {
    if (!searchCaseId.trim()) {
      toast({
        title: "Error",
        description: "Please enter a case ID",
        variant: "destructive",
      });
      return;
    }

    linkCasesMutation.mutate(searchCaseId.trim());
  };

  const handleLinkMatch = (matchCaseId: string) => {
    linkCasesMutation.mutate(matchCaseId);
  };

  const handleUnlink = (linkedCaseId: string) => {
    unlinkCasesMutation.mutate(linkedCaseId);
  };

  const handleNavigateToCase = (targetCaseId: string) => {
    navigate(`/cases/${targetCaseId}`);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "open": return "default";
      case "in_progress": return "secondary";
      case "resolved": return "outline";
      case "pending_intake": return "secondary";
      default: return "outline";
    }
  };

  if (isLoadingLinked) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Link2 className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-muted-foreground">Loading linked cases...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Link by Case ID Search */}
      <Card data-testid="card-link-case">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Link a Case
          </CardTitle>
          <CardDescription>
            Enter a case ID to create a link between this case and another case
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Enter case ID..."
              value={searchCaseId}
              onChange={(e) => setSearchCaseId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLinkBySearch()}
              data-testid="input-search-case-id"
            />
            <Button 
              onClick={handleLinkBySearch}
              disabled={linkCasesMutation.isPending || !searchCaseId.trim()}
              data-testid="button-link-case"
            >
              {linkCasesMutation.isPending ? (
                <>
                  <Link2 className="h-4 w-4 mr-2 animate-spin" />
                  Linking...
                </>
              ) : (
                <>
                  <Link2 className="h-4 w-4 mr-2" />
                  Link
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Potential Matches */}
      {potentialMatches.length > 0 && (
        <Card data-testid="card-potential-matches">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Potential Matches
              <Badge variant="secondary" data-testid="badge-matches-count">
                {potentialMatches.length}
              </Badge>
            </CardTitle>
            <CardDescription>
              These cases may be related based on customer or loan information
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingMatches ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading potential matches...
              </div>
            ) : (
              <div className="space-y-3">
                {potentialMatches.map((match) => (
                  <div
                    key={match.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover-elevate"
                    data-testid={`match-${match.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium" data-testid={`text-case-id-${match.id}`}>
                          Case #{match.id}
                        </span>
                        <Badge variant={getStatusBadgeVariant(match.status)} data-testid={`badge-status-${match.id}`}>
                          {match.status}
                        </Badge>
                        {match.loanId && (
                          <Badge variant="outline" data-testid={`badge-loan-${match.id}`}>
                            Loan: {match.loanId}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate" data-testid={`text-details-${match.id}`}>
                        {match.details}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Created {formatDistanceToNow(new Date(match.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleNavigateToCase(match.id)}
                        data-testid={`button-view-${match.id}`}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleLinkMatch(match.id)}
                        disabled={linkCasesMutation.isPending}
                        data-testid={`button-link-match-${match.id}`}
                      >
                        <Link2 className="h-4 w-4 mr-1" />
                        Link
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Linked Cases */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Link2 className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Linked Cases</h3>
          <Badge variant="secondary" data-testid="badge-linked-count">
            {linkedCases.length}
          </Badge>
        </div>

        {linkedCases.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Link2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h4 className="text-lg font-semibold mb-2">No linked cases</h4>
              <p className="text-muted-foreground">
                Link related cases to track them together and see their full context.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {linkedCases.map((linkedCase) => (
              <Card key={linkedCase.id} data-testid={`card-linked-${linkedCase.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium" data-testid={`text-linked-id-${linkedCase.id}`}>
                          Case #{linkedCase.id}
                        </span>
                        <Badge variant={getStatusBadgeVariant(linkedCase.status)} data-testid={`badge-linked-status-${linkedCase.id}`}>
                          {linkedCase.status}
                        </Badge>
                        <Badge variant="outline" data-testid={`badge-link-type-${linkedCase.id}`}>
                          {linkedCase.linkType}
                        </Badge>
                        {linkedCase.loanId && (
                          <Badge variant="outline" data-testid={`badge-linked-loan-${linkedCase.id}`}>
                            Loan: {linkedCase.loanId}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate mb-1" data-testid={`text-linked-details-${linkedCase.id}`}>
                        {linkedCase.details}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>
                          Created {formatDistanceToNow(new Date(linkedCase.createdAt), { addSuffix: true })}
                        </span>
                        <span>
                          Linked {formatDistanceToNow(new Date(linkedCase.linkedAt), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleNavigateToCase(linkedCase.id)}
                        data-testid={`button-view-linked-${linkedCase.id}`}
                      >
                        <ArrowRight className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUnlink(linkedCase.id)}
                        disabled={unlinkCasesMutation.isPending}
                        data-testid={`button-unlink-${linkedCase.id}`}
                      >
                        <Link2Off className="h-4 w-4 mr-1" />
                        Unlink
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
