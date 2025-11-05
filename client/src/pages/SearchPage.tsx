import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, FileText, User, Calendar, AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";

interface SearchPageProps {
  userRole?: "agent" | "compliance" | "admin";
}

interface CaseSearchResult {
  id: string;
  customerName: string;
  caseTypeName: string;
  categoryName: string;
  status: string;
  priorityValue: string;
  description: string;
  createdAt: string;
  assignedUserName: string | null;
}

interface Status {
  id: string;
  name: string;
  code: string;
  color?: string;
  icon?: string;
  isActive: boolean;
}

export default function SearchPage({ userRole = "agent" }: SearchPageProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [hasSearched, setHasSearched] = useState(false);

  // Fetch statuses for filter
  const { data: statusesData } = useQuery<{data: Status[]}>({
    queryKey: ["/api/statuses"],
  });

  const statuses = statusesData?.data?.filter(s => s.isActive) || [];

  // Fetch search results when user searches
  const { data: searchResults, isLoading, error } = useQuery<{
    data: CaseSearchResult[];
  }>({
    queryKey: ["/api/cases", { search: searchQuery, detailed: true }],
    enabled: hasSearched && searchQuery.trim().length > 0,
    select: (response: any) => response.data || { data: [] },
  });

  const handleSearch = () => {
    if (searchQuery.trim().length > 0) {
      setHasSearched(true);
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchType("all");
    setStatusFilter("all");
    setHasSearched(false);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case "open": return "destructive";
      case "in_progress": return "default";
      case "resolved": return "secondary";
      default: return "outline";
    }
  };

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case "critical": return "destructive";
      case "high": return "destructive";
      case "medium": return "default";
      case "low": return "secondary";
      default: return "outline";
    }
  };

  const getPageTitle = () => {
    switch (userRole) {
      case "compliance":
        return "Global Case Search";
      case "admin":
        return "System-wide Case Search";
      default:
        return "Case Search";
    }
  };

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">
            {getPageTitle()}
          </h1>
          <p className="text-muted-foreground">
            Search across all cases to find specific information quickly
          </p>
        </div>
      </div>

      {/* Search Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Criteria
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Enter search terms (case ID, customer name, description, etc.)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    handleSearch();
                  }
                }}
                data-testid="input-search-query"
              />
            </div>
            <Button onClick={handleSearch} data-testid="button-search">
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
            <Button onClick={clearSearch} variant="outline" data-testid="button-clear-search">
              Clear
            </Button>
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <Select value={searchType} onValueChange={setSearchType}>
                <SelectTrigger data-testid="select-search-type">
                  <SelectValue placeholder="Search in..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Fields</SelectItem>
                  <SelectItem value="customer">Customer Name</SelectItem>
                  <SelectItem value="description">Case Description</SelectItem>
                  <SelectItem value="caseId">Case ID</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger data-testid="select-status-filter">
                  <SelectValue placeholder="Filter by Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {statuses
                    .filter((status) => status.id && status.id.trim() !== "")
                    .map((status) => (
                      <SelectItem key={status.id} value={status.code}>
                        {status.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search Results */}
      {hasSearched && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Search Results
              {searchResults?.data && (
                <Badge variant="secondary" data-testid="text-results-count">
                  {searchResults.data.length} results
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <div className="text-muted-foreground">Searching cases...</div>
              </div>
            )}

            {error && (
              <div className="flex items-center justify-center py-8">
                <div className="text-destructive">
                  <AlertTriangle className="h-5 w-5 mr-2 inline" />
                  Error searching cases. Please try again.
                </div>
              </div>
            )}

            {!isLoading && !error && searchResults?.data && searchResults.data.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Search className="h-12 w-12 mb-4 opacity-50" />
                <h3 className="text-lg font-medium">No cases found</h3>
                <p>Try adjusting your search terms or filters</p>
              </div>
            )}

            {!isLoading && !error && searchResults?.data && searchResults.data.length > 0 && (
              <div className="space-y-4">
                {searchResults.data.map((case_) => (
                  <Card key={case_.id} className="hover-elevate cursor-pointer">
                    <Link href={`/cases/${case_.id}`} className="block">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium" data-testid={`text-case-id-${case_.id}`}>
                                Case #{case_.id.slice(0, 8)}
                              </h3>
                              <Badge variant={getStatusBadgeVariant(case_.status)}>
                                {case_.status.replace('_', ' ')}
                              </Badge>
                              {case_.priorityValue && (
                                <Badge variant={getPriorityBadgeVariant(case_.priorityValue)}>
                                  {case_.priorityValue}
                                </Badge>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <User className="h-4 w-4" />
                                <span>{case_.customerName}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <FileText className="h-4 w-4" />
                                <span>{case_.caseTypeName} - {case_.categoryName}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                <span>{new Date(case_.createdAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                            
                            <p className="text-sm line-clamp-2" data-testid={`text-case-description-${case_.id}`}>
                              {case_.description}
                            </p>
                            
                            {case_.assignedUserName && (
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <User className="h-4 w-4" />
                                <span>Assigned to: {case_.assignedUserName}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Link>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* No Search State */}
      {!hasSearched && (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center text-muted-foreground">
              <Search className="h-16 w-16 mb-4 opacity-50" />
              <h3 className="text-xl font-medium mb-2">Ready to Search</h3>
              <p className="text-center max-w-md">
                Enter your search terms above to find cases across the system. 
                You can search by case ID, customer name, description, or any case details.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}