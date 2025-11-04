import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Download, FileSpreadsheet, FileText, BarChart3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ReportsPage() {
  const { toast } = useToast();
  
  // Cases Export State
  const [casesStatus, setCasesStatus] = useState<string>("all");
  const [casesPriority, setCasesPriority] = useState<string>("all");
  const [casesLender, setCasesLender] = useState<string>("all");
  const [casesStartDate, setCasesStartDate] = useState<string>("");
  const [casesEndDate, setCasesEndDate] = useState<string>("");
  const [isExportingCases, setIsExportingCases] = useState(false);

  // Fetch lenders for filter
  const { data: lendersData } = useQuery({
    queryKey: ['/api/lenders'],
    select: (response: any) => response.data || []
  });
  const lenders = lendersData || [];

  // Fetch statuses for filter
  const { data: statusesData } = useQuery({
    queryKey: ['/api/statuses'],
    select: (response: any) => response.data?.filter((s: any) => s.isActive) || []
  });
  const statuses = statusesData || [];

  const handleCasesExport = async () => {
    setIsExportingCases(true);
    try {
      // Build query params
      const params = new URLSearchParams();
      if (casesStatus !== "all") params.append("status", casesStatus);
      if (casesPriority !== "all") params.append("priority", casesPriority);
      if (casesLender !== "all") params.append("lenderId", casesLender);
      if (casesStartDate) params.append("startDate", casesStartDate);
      if (casesEndDate) params.append("endDate", casesEndDate);

      // Fetch the file
      const response = await fetch(`/api/exports/cases?${params.toString()}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error("Failed to export cases");
      }

      // Get filename from header or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch ? filenameMatch[1] : `cases-export-${new Date().toISOString().split('T')[0]}.xlsx`;

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Export Successful",
        description: `Cases exported to ${filename}`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export Failed",
        description: "Failed to export cases. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExportingCases(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reports & Exports</h1>
        <p className="text-muted-foreground mt-1">
          Export data to Excel for custom analysis and reporting
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Cases Export Card */}
        <Card className="flex flex-col">
          <CardHeader>
            <div className="flex items-start justify-between">
              <FileSpreadsheet className="w-10 h-10 text-primary" />
            </div>
            <CardTitle className="mt-4">Cases Export</CardTitle>
            <CardDescription>
              Export all case data including customer info, assignments, resolution details, and SLA tracking
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="cases-start-date">Start Date</Label>
                  <Input
                    id="cases-start-date"
                    type="date"
                    value={casesStartDate}
                    onChange={(e) => setCasesStartDate(e.target.value)}
                    data-testid="input-cases-start-date"
                  />
                </div>
                <div>
                  <Label htmlFor="cases-end-date">End Date</Label>
                  <Input
                    id="cases-end-date"
                    type="date"
                    value={casesEndDate}
                    onChange={(e) => setCasesEndDate(e.target.value)}
                    data-testid="input-cases-end-date"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="cases-status-filter">Status Filter</Label>
                <Select value={casesStatus} onValueChange={setCasesStatus}>
                  <SelectTrigger id="cases-status-filter" data-testid="select-cases-status-filter">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {statuses.map((status: any) => (
                      <SelectItem key={status.code} value={status.code}>
                        {status.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="cases-priority-filter">Priority Filter</Label>
                <Select value={casesPriority} onValueChange={setCasesPriority}>
                  <SelectTrigger id="cases-priority-filter" data-testid="select-cases-priority-filter">
                    <SelectValue placeholder="All Priorities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="cases-lender-filter">Lender Filter</Label>
                <Select value={casesLender} onValueChange={setCasesLender}>
                  <SelectTrigger id="cases-lender-filter" data-testid="select-cases-lender-filter">
                    <SelectValue placeholder="All Lenders" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Lenders</SelectItem>
                    {lenders.map((lender: any) => (
                      <SelectItem key={lender.id} value={lender.id}>
                        {lender.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button 
              onClick={handleCasesExport}
              disabled={isExportingCases}
              className="w-full"
              data-testid="button-export-cases"
            >
              <Download className="w-4 h-4 mr-2" />
              {isExportingCases ? "Exporting..." : "Export to Excel"}
            </Button>
          </CardContent>
        </Card>

        {/* Placeholder for future exports - Audit Trail */}
        <Card className="flex flex-col opacity-60">
          <CardHeader>
            <div className="flex items-start justify-between">
              <FileText className="w-10 h-10 text-muted-foreground" />
            </div>
            <CardTitle className="mt-4">Audit Trail Export</CardTitle>
            <CardDescription>
              Export complete audit history of all case changes and user actions
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-end">
            <Button disabled className="w-full" variant="outline">
              Coming Soon
            </Button>
          </CardContent>
        </Card>

        {/* Placeholder for future exports - Performance Metrics */}
        <Card className="flex flex-col opacity-60">
          <CardHeader>
            <div className="flex items-start justify-between">
              <BarChart3 className="w-10 h-10 text-muted-foreground" />
            </div>
            <CardTitle className="mt-4">Performance Metrics</CardTitle>
            <CardDescription>
              Export aggregated performance data, resolution times, and SLA compliance rates
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-end">
            <Button disabled className="w-full" variant="outline">
              Coming Soon
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="bg-muted/50 border rounded-lg p-4">
        <h3 className="font-semibold mb-2">About Excel Exports</h3>
        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
          <li>All exports include auto-filters on every column for easy sorting and filtering</li>
          <li>Exported files are formatted with proper column widths and headers</li>
          <li>Use Excel's built-in features (pivot tables, charts, formulas) for custom analysis</li>
          <li>Date fields are formatted in your local timezone</li>
        </ul>
      </div>
    </div>
  );
}
