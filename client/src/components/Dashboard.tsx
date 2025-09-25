import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CaseCard } from "./CaseCard";
import { StatusBadge } from "./StatusBadge";
import { PriorityBadge } from "./PriorityBadge";
import { 
  AlertTriangle, 
  FileText, 
  Clock, 
  CheckCircle, 
  Users, 
  TrendingUp, 
  Filter,
  Plus
} from "lucide-react";

interface DashboardProps {
  userRole?: "agent" | "compliance" | "admin";
  onCreateCase: () => void;
  onViewCase: (id: string) => void;
}

// Mock dashboard data - TODO: remove mock functionality
const mockStats = {
  totalCases: 847,
  openCases: 124,
  pendingCases: 43,
  resolvedToday: 15,
  slaBreaches: 8,
  averageResolutionTime: "3.2 days"
};

const mockRecentCases = [
  {
    id: "CASE-001",
    caseType: "Complaint" as const,
    category: "CFPB",
    priority: "Critical" as const,
    status: "open" as const,
    customerName: "John Smith",
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    details: "Customer complaint regarding unauthorized charges on their account.",
    slaDeadline: new Date(Date.now() + 22 * 60 * 60 * 1000)
  },
  {
    id: "CASE-002", 
    caseType: "Dispute" as const,
    category: "FactorTrust",
    priority: "High" as const,
    status: "pending" as const,
    customerName: "Sarah Johnson",
    createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000),
    details: "Dispute regarding credit report accuracy and information verification.",
    slaDeadline: new Date(Date.now() + 40 * 60 * 60 * 1000)
  },
  {
    id: "CASE-003",
    caseType: "Mail" as const,
    category: "Bankruptcy",
    priority: "BK24" as const,
    status: "open" as const,
    customerName: "Michael Chen",
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
    details: "Bankruptcy notification received requiring immediate processing.",
    slaDeadline: new Date(Date.now() + 12 * 60 * 60 * 1000)
  }
];

const mockSlaAlerts = [
  { caseId: "CASE-001", customerName: "John Smith", hoursRemaining: 22 },
  { caseId: "CASE-003", customerName: "Michael Chen", hoursRemaining: 12 },
  { caseId: "CASE-015", customerName: "Lisa Rodriguez", hoursRemaining: 6 }
];

export function Dashboard({ userRole = "agent", onCreateCase, onViewCase }: DashboardProps) {
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
    const baseStats = [
      {
        title: "Total Cases",
        value: mockStats.totalCases.toLocaleString(),
        icon: FileText,
        change: "+12% from last month"
      },
      {
        title: "Open Cases",
        value: mockStats.openCases.toString(),
        icon: AlertTriangle,
        change: "-5% from last week"
      },
      {
        title: "Pending Review",
        value: mockStats.pendingCases.toString(),
        icon: Clock,
        change: "+8% from last week"
      },
      {
        title: "Resolved Today",
        value: mockStats.resolvedToday.toString(),
        icon: CheckCircle,
        change: "On track with goals"
      }
    ];

    if (userRole === "compliance" || userRole === "admin") {
      return [
        ...baseStats,
        {
          title: "SLA Breaches",
          value: mockStats.slaBreaches.toString(),
          icon: AlertTriangle,
          change: "-15% from last month"
        },
        {
          title: "Avg Resolution",
          value: mockStats.averageResolutionTime,
          icon: TrendingUp,
          change: "Improved by 0.5 days"
        }
      ];
    }

    return baseStats;
  };

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
            {mockSlaAlerts.map((alert) => (
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
            ))}
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
                {mockRecentCases.map((caseData) => (
                  <CaseCard
                    key={caseData.id}
                    {...caseData}
                    onViewCase={onViewCase}
                  />
                ))}
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