import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from "recharts";
import { 
  Download, 
  Calendar, 
  TrendingUp, 
  Users, 
  Clock, 
  FileText, 
  DollarSign, 
  Building 
} from "lucide-react";

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

interface DateRange {
  startDate: string;
  endDate: string;
}

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  const buildQueryString = (filters: DateRange) => {
    const params = new URLSearchParams();
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    return params.toString();
  };

  // Fetch all reports
  const { data: caseVolume, isLoading: loadingVolume } = useQuery({
    queryKey: ['/api/reports/case-volume', dateRange],
    queryFn: async () => {
      const res = await fetch(`/api/reports/case-volume?${buildQueryString(dateRange)}`);
      if (!res.ok) throw new Error('Failed to fetch case volume report');
      return res.json();
    },
    select: (response: any) => response.data || response
  });

  const { data: agentPerformance, isLoading: loadingPerformance } = useQuery({
    queryKey: ['/api/reports/agent-performance', dateRange],
    queryFn: async () => {
      const res = await fetch(`/api/reports/agent-performance?${buildQueryString(dateRange)}`);
      if (!res.ok) throw new Error('Failed to fetch agent performance report');
      return res.json();
    },
    select: (response: any) => response.data || response
  });

  const { data: slaCompliance, isLoading: loadingSla } = useQuery({
    queryKey: ['/api/reports/sla-compliance', dateRange],
    queryFn: async () => {
      const res = await fetch(`/api/reports/sla-compliance?${buildQueryString(dateRange)}`);
      if (!res.ok) throw new Error('Failed to fetch SLA compliance report');
      return res.json();
    },
    select: (response: any) => response.data || response
  });

  const { data: resolutionPatterns, isLoading: loadingResolution } = useQuery({
    queryKey: ['/api/reports/resolution-patterns', dateRange],
    queryFn: async () => {
      const res = await fetch(`/api/reports/resolution-patterns?${buildQueryString(dateRange)}`);
      if (!res.ok) throw new Error('Failed to fetch resolution patterns report');
      return res.json();
    },
    select: (response: any) => response.data || response
  });

  const { data: lenderAnalytics, isLoading: loadingLender } = useQuery({
    queryKey: ['/api/reports/lender-analytics', dateRange],
    queryFn: async () => {
      const res = await fetch(`/api/reports/lender-analytics?${buildQueryString(dateRange)}`);
      if (!res.ok) throw new Error('Failed to fetch lender analytics report');
      return res.json();
    },
    select: (response: any) => response.data || response
  });

  const exportToCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) return;
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => `"${row[header]}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${dateRange.startDate}_to_${dateRange.endDate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="reports-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics & Reports</h1>
          <p className="text-muted-foreground">
            Comprehensive reporting and analytics for complaint & dispute management
          </p>
        </div>
      </div>

      {/* Date Range Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Date Range Filter
          </CardTitle>
          <CardDescription>Select a date range to filter all reports</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                data-testid="input-start-date"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                data-testid="input-end-date"
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={() => {
                  setDateRange({
                    startDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    endDate: new Date().toISOString().split('T')[0]
                  });
                }}
                variant="outline"
                data-testid="button-reset-dates"
              >
                Reset to Last 60 Days
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Tabs */}
      <Tabs defaultValue="volume" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="volume" data-testid="tab-volume">
            <TrendingUp className="w-4 h-4 mr-2" />
            Case Volume
          </TabsTrigger>
          <TabsTrigger value="performance" data-testid="tab-performance">
            <Users className="w-4 h-4 mr-2" />
            Agent Performance
          </TabsTrigger>
          <TabsTrigger value="sla" data-testid="tab-sla">
            <Clock className="w-4 h-4 mr-2" />
            SLA & Timeliness
          </TabsTrigger>
          <TabsTrigger value="resolution" data-testid="tab-resolution">
            <FileText className="w-4 h-4 mr-2" />
            Resolutions
          </TabsTrigger>
          <TabsTrigger value="lender" data-testid="tab-lender">
            <Building className="w-4 h-4 mr-2" />
            Lenders
          </TabsTrigger>
        </TabsList>

        {/* Case Volume Report */}
        <TabsContent value="volume" className="space-y-4">
          {loadingVolume ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">Loading case volume data...</div>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Case Volume Overview</CardTitle>
                    <CardDescription>Total cases: {caseVolume?.total || 0}</CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportToCSV(caseVolume?.byType || [], 'case_volume')}
                    data-testid="button-export-volume"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                </CardHeader>
                <CardContent className="space-y-8">
                  {/* By Status */}
                  <div>
                    <h3 className="font-semibold mb-4">Cases by Status</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={caseVolume?.byStatus || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="status" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="count" fill={COLORS[0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* By Type */}
                  <div>
                    <h3 className="font-semibold mb-4">Cases by Type</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={caseVolume?.byType || []}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ typeName, count }) => `${typeName}: ${count}`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="count"
                        >
                          {(caseVolume?.byType || []).map((_: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Daily Trend */}
                  {caseVolume?.dailyTrend && caseVolume.dailyTrend.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-4">Daily Trend</h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={caseVolume.dailyTrend}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="count" stroke={COLORS[2]} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Agent Performance Report */}
        <TabsContent value="performance" className="space-y-4">
          {loadingPerformance ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">Loading agent performance data...</div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Agent Performance Metrics</CardTitle>
                  <CardDescription>Individual agent statistics and productivity</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportToCSV(agentPerformance || [], 'agent_performance')}
                  data-testid="button-export-performance"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(agentPerformance || []).map((agent: any) => (
                    <div key={agent.userId} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h4 className="font-semibold">{agent.userName}</h4>
                          <p className="text-sm text-muted-foreground capitalize">{agent.role}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold">{agent.completionRate}%</p>
                          <p className="text-sm text-muted-foreground">Completion Rate</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 mt-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Total Assigned</p>
                          <p className="text-lg font-semibold">{agent.totalAssigned}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Resolved</p>
                          <p className="text-lg font-semibold">{agent.resolved}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Avg Resolution Time</p>
                          <p className="text-lg font-semibold">
                            {agent.avgResolutionTimeHours ? `${agent.avgResolutionTimeHours}h` : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!agentPerformance || agentPerformance.length === 0) && (
                    <div className="text-center py-8 text-muted-foreground">
                      No agent performance data available for the selected date range
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* SLA Compliance Report */}
        <TabsContent value="sla" className="space-y-4">
          {loadingSla ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">Loading SLA compliance data...</div>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Cases</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{slaCompliance?.totalCases || 0}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Within SLA</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">{slaCompliance?.withinSla || 0}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Breached SLA</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">{slaCompliance?.breachedSla || 0}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Compliance Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{slaCompliance?.complianceRate || 0}%</div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Cases by Age Range</CardTitle>
                  <CardDescription>Distribution of cases by how long they've been open</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={slaCompliance?.casesByAge || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="ageRange" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" fill={COLORS[3]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Resolution Patterns Report */}
        <TabsContent value="resolution" className="space-y-4">
          {loadingResolution ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">Loading resolution patterns data...</div>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="w-5 h-5" />
                      Financial Metrics
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Avg Settlement</span>
                      <span className="text-lg font-semibold">
                        ${resolutionPatterns?.avgSettlementAmount?.toFixed(2) || '0.00'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Avg Forgiven</span>
                      <span className="text-lg font-semibold">
                        ${resolutionPatterns?.avgForgivenAmount?.toFixed(2) || '0.00'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="text-sm text-muted-foreground">Total Settlement</span>
                      <span className="text-lg font-bold">
                        ${resolutionPatterns?.totalSettlementAmount?.toFixed(2) || '0.00'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Total Forgiven</span>
                      <span className="text-lg font-bold">
                        ${resolutionPatterns?.totalForgivenAmount?.toFixed(2) || '0.00'}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Policy Violations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={resolutionPatterns?.policyViolations || []}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ type, count }) => `${type}: ${count}`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="count"
                        >
                          {(resolutionPatterns?.policyViolations || []).map((_: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Resolutions by Disposition</CardTitle>
                    <CardDescription>Resolution outcomes and average settlement amounts</CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportToCSV(resolutionPatterns?.byDisposition || [], 'resolution_patterns')}
                    data-testid="button-export-resolution"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={resolutionPatterns?.byDisposition || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="disposition" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Legend />
                      <Bar yAxisId="left" dataKey="count" fill={COLORS[0]} name="Count" />
                      <Bar yAxisId="right" dataKey="avgAmount" fill={COLORS[1]} name="Avg Amount ($)" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Lender Analytics Report */}
        <TabsContent value="lender" className="space-y-4">
          {loadingLender ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">Loading lender analytics data...</div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Lender Performance Analytics</CardTitle>
                  <CardDescription>Case metrics by financial institution</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportToCSV(lenderAnalytics || [], 'lender_analytics')}
                  data-testid="button-export-lender"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(lenderAnalytics || []).map((lender: any) => (
                    <div key={lender.lenderId} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold text-lg">{lender.lenderName}</h4>
                        <div className="text-right">
                          <p className="text-2xl font-bold">{lender.totalCases}</p>
                          <p className="text-sm text-muted-foreground">Total Cases</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Open</p>
                          <p className="text-lg font-semibold">{lender.openCases}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Resolved</p>
                          <p className="text-lg font-semibold">{lender.resolvedCases}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Avg Resolution</p>
                          <p className="text-lg font-semibold">
                            {lender.avgResolutionTimeHours ? `${lender.avgResolutionTimeHours}h` : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!lenderAnalytics || lenderAnalytics.length === 0) && (
                    <div className="text-center py-8 text-muted-foreground">
                      No lender analytics data available for the selected date range
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
