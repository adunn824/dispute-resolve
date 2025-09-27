import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { PriorityBadge } from "@/components/PriorityBadge";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { 
  Search, 
  Filter, 
  Plus, 
  Eye, 
  Calendar, 
  User, 
  FileText, 
  SortAsc, 
  SortDesc,
  RefreshCw,
  Download,
  Loader2,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface CaseListItem {
  id: string;
  caseTypeId: string;
  categoryId: string;
  customerId: string;
  assignedToUserId?: string;
  loanId?: string;
  state: string;
  details: string;
  status: "open" | "in_progress" | "resolved";
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
  assignedUserName?: string;
  assignedUserEmail?: string;
  assignedUserRole?: string;
}

interface CaseType {
  id: string;
  name: string;
  color?: string;
}

interface Category {
  id: string;
  name: string;
  caseTypeId: string;
}

interface Assignee {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface CaseListPageProps {
  userRole?: "agent" | "compliance" | "admin";
}

export function CaseListPage({ userRole = "agent" }: CaseListPageProps) {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [priorityFilter, setPriorityFilter] = useState<string>("");
  const [caseTypeFilter, setCaseTypeFilter] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("");
  const [sortField, setSortField] = useState<string>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);

  // Build query parameters
  const queryParams = new URLSearchParams({
    detailed: "true",
    limit: pageSize.toString(),
    offset: ((currentPage - 1) * pageSize).toString(),
    sortField: sortField,
    sortDirection: sortDirection,
  });

  if (searchTerm) queryParams.set("search", searchTerm);
  if (statusFilter) queryParams.set("status", statusFilter);
  if (priorityFilter) queryParams.set("priorityValue", priorityFilter);
  if (caseTypeFilter) queryParams.set("caseTypeId", caseTypeFilter);
  if (categoryFilter) queryParams.set("categoryId", categoryFilter);
  if (assigneeFilter) queryParams.set("assignedToUserId", assigneeFilter);

  // Fetch cases with filters
  const { data: casesData, isLoading, error, refetch } = useQuery<{
    data: CaseListItem[];
    pagination: { limit: number; offset: number; hasMore: boolean };
  }>({
    queryKey: ["/api/cases", queryParams.toString()],
    queryFn: () => apiRequest("GET", `/api/cases?${queryParams.toString()}`)
  });

  // Fetch filter options
  const { data: caseTypesData } = useQuery<{data: CaseType[]}>({
    queryKey: ["/api/case-types"],
    queryFn: () => apiRequest("GET", "/api/case-types")
  });

  const { data: categoriesData } = useQuery<{data: Category[]}>({
    queryKey: ["/api/categories"],
    queryFn: () => apiRequest("GET", "/api/categories")
  });

  const { data: assigneesData } = useQuery<{data: Assignee[]}>({
    queryKey: ["/api/assignees"],
    queryFn: () => apiRequest("GET", "/api/assignees")
  });

  const cases = casesData?.data || [];
  const pagination = casesData?.pagination;
  const caseTypes = caseTypesData?.data || [];
  const categories = categoriesData?.data || [];
  const assignees = assigneesData?.data || [];

  // Filter categories based on selected case type
  const filteredCategories = caseTypeFilter
    ? categories.filter(cat => cat.caseTypeId === caseTypeFilter)
    : categories;

  const handleViewCase = (caseId: string) => {
    setLocation(`/cases/${caseId}`);
  };

  const handleCreateCase = () => {
    setLocation("/cases/new");
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("");
    setPriorityFilter("");
    setCaseTypeFilter("");
    setCategoryFilter("");
    setAssigneeFilter("");
    setCurrentPage(1);
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  // Reset page when filters or sorting change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, priorityFilter, caseTypeFilter, categoryFilter, assigneeFilter, sortField, sortDirection]);

  const getPageTitle = () => {
    switch (userRole) {
      case "compliance":
        return "Compliance Cases";
      case "admin":
        return "All Cases";
      default:
        return "Cases";
    }
  };

  const canCreateCase = userRole === "agent" || userRole === "admin";

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Failed to Load Cases</h3>
        <p className="text-muted-foreground mb-4">There was an error loading the case list.</p>
        <Button onClick={() => refetch()} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">
            {getPageTitle()}
          </h1>
          <p className="text-muted-foreground">
            Manage and track cases across the platform
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={() => refetch()} 
            variant="outline" 
            size="sm"
            data-testid="button-refresh"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          {canCreateCase && (
            <Button 
              onClick={handleCreateCase}
              data-testid="button-create-case"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Case
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Search & Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search cases by customer, details, loan ID, case type, or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search"
              />
            </div>
            <Button 
              onClick={clearFilters} 
              variant="outline"
              data-testid="button-clear-filters"
            >
              Clear All
            </Button>
          </div>

          {/* Filter Row */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger data-testid="select-status-filter">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Statuses</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger data-testid="select-priority-filter">
                <SelectValue placeholder="All Priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Priorities</SelectItem>
                <SelectItem value="Critical">Critical</SelectItem>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Low">Low</SelectItem>
              </SelectContent>
            </Select>

            <Select value={caseTypeFilter} onValueChange={setCaseTypeFilter}>
              <SelectTrigger data-testid="select-case-type-filter">
                <SelectValue placeholder="All Case Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Case Types</SelectItem>
                {caseTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger data-testid="select-category-filter">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Categories</SelectItem>
                {filteredCategories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
              <SelectTrigger data-testid="select-assignee-filter">
                <SelectValue placeholder="All Assignees" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Assignees</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {assignees.map((assignee) => (
                  <SelectItem key={assignee.id} value={assignee.id}>
                    {assignee.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Cases Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Cases
              {!isLoading && (
                <Badge variant="secondary" data-testid="text-case-count">
                  {cases.length} results
                </Badge>
              )}
            </CardTitle>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading cases...</span>
            </div>
          ) : cases.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Cases Found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || statusFilter || priorityFilter || caseTypeFilter || categoryFilter || assigneeFilter
                  ? "No cases match your current filters."
                  : "No cases have been created yet."
                }
              </p>
              {canCreateCase && (
                <Button onClick={handleCreateCase} data-testid="button-create-first-case">
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Case
                </Button>
              )}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">Case ID</TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort("customerName")}
                    >
                      <div className="flex items-center gap-1">
                        Customer
                        {sortField === "customerName" && (
                          sortDirection === "asc" ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead>Type & Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Assignee</TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort("createdAt")}
                    >
                      <div className="flex items-center gap-1">
                        Created
                        {sortField === "createdAt" && (
                          sortDirection === "asc" ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cases.map((caseItem) => (
                    <TableRow key={caseItem.id} data-testid={`row-case-${caseItem.id}`}>
                      <TableCell className="font-mono text-xs">
                        {caseItem.id.substring(0, 8)}...
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium" data-testid={`text-customer-name-${caseItem.id}`}>
                            {caseItem.customerName}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {caseItem.customerState}
                            {caseItem.loanId && ` • Loan: ${caseItem.loanId}`}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <Badge 
                            variant="outline" 
                            style={{ borderColor: caseItem.caseTypeColor }}
                            data-testid={`badge-case-type-${caseItem.id}`}
                          >
                            {caseItem.caseTypeName}
                          </Badge>
                          <div className="text-sm text-muted-foreground mt-1">
                            {caseItem.categoryName}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={caseItem.status === "in_progress" ? "pending" : caseItem.status as any} />
                      </TableCell>
                      <TableCell>
                        <PriorityBadge priority={caseItem.priorityValue as any} />
                      </TableCell>
                      <TableCell>
                        {caseItem.assignedUserName ? (
                          <div>
                            <div className="font-medium text-sm">{caseItem.assignedUserName}</div>
                            <Badge variant="outline" className="text-xs">
                              {caseItem.assignedUserRole}
                            </Badge>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatDistanceToNow(new Date(caseItem.createdAt), { addSuffix: true })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewCase(caseItem.id)}
                          data-testid={`button-view-case-${caseItem.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between pt-4">
                <div className="text-sm text-muted-foreground">
                  Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, ((currentPage - 1) * pageSize) + cases.length)} results
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    data-testid="button-previous-page"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {currentPage}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={!pagination?.hasMore}
                    data-testid="button-next-page"
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}