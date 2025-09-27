import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CaseCard } from "./CaseCard";
import { StatusBadge } from "./StatusBadge";
import { PriorityBadge } from "./PriorityBadge";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "../lib/queryClient";
import { useLocation } from "wouter";
import { 
  AlertTriangle, 
  FileText, 
  Clock, 
  CheckCircle, 
  Users, 
  TrendingUp, 
  Filter,
  Plus,
  Loader2
} from "lucide-react";

interface DashboardProps {
  userRole?: "agent" | "compliance" | "admin";
  onCreateCase: () => void;
  onViewCase: (id: string) => void;
}

interface DashboardStats {
  totalCases: number;
  openCases: number;
  pendingCases: number;
  resolvedToday: number;
  slaBreaches: number;
  averageResolutionTime: string;
  recentCases: any[];
  slaAlerts: { caseId: string; customerName: string; hoursRemaining: number; }[];
}

export function Dashboard({ userRole = "agent", onCreateCase, onViewCase }: DashboardProps) {
  const [, setLocation] = useLocation();
  
  // Fetch real dashboard data
  const { data: dashboardData, isLoading, error } = useQuery<{data: DashboardStats}>({
    queryKey: ["/api/dashboard"],
    queryFn: () => apiRequest("GET", "/api/dashboard")
  });

  const stats = dashboardData?.data;
  
  const handleViewCase = (caseId: string) => {
    setLocation(`/cases/${caseId}`);
  };

  const getDashboardTitle = () => {
    switch (userRole) {
      case "compliance":
        return "Compliance Dashboard";
      case "admin":
        return "Admin Dashboard";
      default:
        return "Agent Dashboard";
    }
  };

  const getStatsCards = () => {
    if (!stats) return [];

    const baseStats = [
      {
        title: "Total Cases",
        value: stats.totalCases.toLocaleString(),
        icon: FileText,
        change: "+12% from last month"
      },
      {
        title: "Open Cases",
        value: stats.openCases.toString(),
        icon: AlertTriangle,
        change: "-5% from last week"
      },
      {
        title: "Pending Review",
        value: stats.pendingCases.toString(),
        icon: Clock,
        change: "+8% from last week"
      },
      {
        title: "Resolved Today",
        value: stats.resolvedToday.toString(),
        icon: CheckCircle,
        change: "On track with goals"
      }
    ];

    if (userRole === "compliance" || userRole === "admin") {
      return [
        ...baseStats,
        {
          title: "SLA Breaches",
          value: stats.slaBreaches.toString(),
          icon: AlertTriangle,
          change: "-15% from last month"
        },
        {
          title: "Avg Resolution",
          value: stats.averageResolutionTime,
          icon: TrendingUp,
          change: "Improved by 0.5 days"
        }
      ];
    }

    return baseStats;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96" data-testid="dashboard-loading">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading dashboard...</span>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex items-center justify-center h-96 text-center" data-testid="dashboard-error">
        <div>
          <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-2" />
          <p>Failed to load dashboard data</p>
          <p className="text-sm text-muted-foreground">Please try refreshing the page</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="dashboard">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{getDashboardTitle()}</h1>
          <p className="text-muted-foreground">Overview of case management activities</p>
        </div>
        <div className="flex gap-4">
          <Button variant="outline" data-testid="button-filter">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          {userRole === "agent" && (
            <Button onClick={onCreateCase} data-testid="button-create-case">
              <Plus className="h-4 w-4 mr-2" />
              New Case
            </Button>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {getStatsCards().map((stat) => (
          <Card key={stat.title} className="hover-elevate">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
              </div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* SLA Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            SLA Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.slaAlerts.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                <CheckCircle className="h-8 w-8 mx-auto mb-2" />
                <p>All SLAs on track</p>
              </div>
            ) : (
              stats.slaAlerts.map((alert) => (
                <div key={alert.caseId} className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <div>
                    <p className="font-medium">Case #{alert.caseId}</p>
                    <p className="text-sm text-muted-foreground">{alert.customerName}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">
                      {alert.hoursRemaining}h remaining
                    </Badge>
                    <Button size="sm" onClick={() => onViewCase(alert.caseId)} data-testid={`button-view-alert-${alert.caseId}`}>
                      View
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Cases */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        <div className="lg:col-span-2 xl:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>Recent Cases</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {stats.recentCases.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground col-span-full">
                    <FileText className="h-8 w-8 mx-auto mb-2" />
                    <p>No recent cases</p>
                    <p className="text-sm">Cases will appear here once created</p>
                  </div>
                ) : (
                  stats.recentCases.map((caseItem: any) => (
                    <div key={caseItem.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{caseItem.id}</p>
                        <p className="text-sm text-muted-foreground">{caseItem.details || "Case details"}</p>
                      </div>
                      <div className="text-right">
                        <StatusBadge status={caseItem.status} />
                        <Button 
                          size="sm" 
                          className="ml-2"
                          onClick={() => handleViewCase(caseItem.id)}
                          data-testid="button-view-case"
                        >
                          View
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Actions (Agent Dashboard) */}
      {userRole === "agent" && (
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button variant="outline" className="h-20 flex-col gap-2" data-testid="button-quick-complaint">
                <FileText className="h-5 w-5" />
                <span>New Complaint</span>
              </Button>
              <Button variant="outline" className="h-20 flex-col gap-2" data-testid="button-quick-dispute">
                <AlertTriangle className="h-5 w-5" />
                <span>New Dispute</span>
              </Button>
              <Button variant="outline" className="h-20 flex-col gap-2" data-testid="button-quick-mail">
                <FileText className="h-5 w-5" />
                <span>Process Mail</span>
              </Button>
              <Button variant="outline" className="h-20 flex-col gap-2" data-testid="button-quick-search">
                <Users className="h-5 w-5" />
                <span>Search Cases</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}