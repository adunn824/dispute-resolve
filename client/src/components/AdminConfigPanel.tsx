import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Settings, 
  FileText, 
  Users, 
  Zap, 
  Globe, 
  Shield,
  Info,
  CheckCircle,
  AlertTriangle
} from "lucide-react";

interface AdminConfigPanelProps {
  onPublishConfig: () => void;
}

// Mock configuration data - TODO: remove mock functionality
const mockConfigStatus = {
  currentVersion: "1.2.3",
  draftChanges: 5,
  lastPublished: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  publishedBy: "Admin User"
};

const mockConfigSections = [
  {
    id: "case-types",
    title: "Case Types",
    description: "Configure available case types (Mail, Complaint, Dispute)",
    icon: FileText,
    status: "published",
    changes: 0
  },
  {
    id: "categories", 
    title: "Categories",
    description: "Manage case categories and their configurations",
    icon: FileText,
    status: "draft",
    changes: 3
  },
  {
    id: "checklists",
    title: "Checklist Templates",
    description: "Define required checklist items for each category",
    icon: CheckCircle,
    status: "published",
    changes: 0
  },
  {
    id: "documents",
    title: "Document Requirements",
    description: "Configure required documents and file types",
    icon: FileText,
    status: "draft",
    changes: 1
  },
  {
    id: "rules",
    title: "Business Rules",
    description: "Priority rules, tag rules, and SLA policies",
    icon: Zap,
    status: "draft",
    changes: 1
  },
  {
    id: "users",
    title: "User Management",
    description: "Manage users, roles, and permissions",
    icon: Users,
    status: "published",
    changes: 0
  },
  {
    id: "webhooks",
    title: "Webhooks",
    description: "Configure external integrations and notifications",
    icon: Globe,
    status: "published",
    changes: 0
  },
  {
    id: "feature-flags",
    title: "Feature Flags",
    description: "Enable/disable features and A/B testing",
    icon: Shield,
    status: "published",
    changes: 0
  }
];

export function AdminConfigPanel({ onPublishConfig }: AdminConfigPanelProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [isPublishing, setIsPublishing] = useState(false);

  const handlePublish = async () => {
    setIsPublishing(true);
    console.log("Publishing configuration changes...");
    
    // Simulate publish process
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setIsPublishing(false);
    onPublishConfig();
  };

  const getStatusColor = (status: string) => {
    return status === "published" ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400" 
                                 : "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400";
  };

  return (
    <div className="space-y-6" data-testid="admin-config-panel">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Configuration Management</h1>
          <p className="text-muted-foreground">Manage system configuration and business rules</p>
        </div>
        <div className="flex gap-4">
          <Badge variant="outline">
            Version {mockConfigStatus.currentVersion}
          </Badge>
          {mockConfigStatus.draftChanges > 0 && (
            <Button onClick={handlePublish} disabled={isPublishing} data-testid="button-publish-config">
              {isPublishing ? "Publishing..." : `Publish ${mockConfigStatus.draftChanges} Changes`}
            </Button>
          )}
        </div>
      </div>

      {/* Draft Changes Alert */}
      {mockConfigStatus.draftChanges > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You have {mockConfigStatus.draftChanges} unpublished changes. 
            Changes will not take effect until published.
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="configuration" data-testid="tab-configuration">Configuration</TabsTrigger>
          <TabsTrigger value="rules" data-testid="tab-rules">Rules</TabsTrigger>
          <TabsTrigger value="integrations" data-testid="tab-integrations">Integrations</TabsTrigger>
          <TabsTrigger value="system" data-testid="tab-system">System</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {mockConfigSections.map((section) => (
              <Card key={section.id} className="hover-elevate cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2 bg-muted rounded-lg">
                      <section.icon className="h-5 w-5" />
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge 
                        variant="secondary" 
                        className={getStatusColor(section.status)}
                      >
                        {section.status}
                      </Badge>
                      {section.changes > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {section.changes} changes
                        </Badge>
                      )}
                    </div>
                  </div>
                  <h3 className="font-semibold mb-1">{section.title}</h3>
                  <p className="text-sm text-muted-foreground">{section.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="configuration" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Case Types & Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Configure the available case types and their associated categories.
                </p>
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                    <span className="font-medium">Mail</span>
                    <Badge variant="outline">4 categories</Badge>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                    <span className="font-medium">Complaint</span>
                    <Badge variant="outline">10 categories</Badge>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                    <span className="font-medium">Dispute</span>
                    <Badge variant="outline">5 categories</Badge>
                  </div>
                </div>
                <Button className="w-full mt-4" variant="outline" data-testid="button-manage-categories">
                  Manage Categories
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Document Requirements</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Configure required documents for each case category.
                </p>
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                    <span className="text-sm">Loan Agreement</span>
                    <Badge variant="secondary">Required</Badge>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                    <span className="text-sm">Customer ID</span>
                    <Badge variant="secondary">Required</Badge>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                    <span className="text-sm">Police Report</span>
                    <Badge variant="outline">Optional</Badge>
                  </div>
                </div>
                <Button className="w-full mt-4" variant="outline" data-testid="button-manage-documents">
                  Manage Requirements
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="rules" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Priority Rules</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Configure automatic priority assignment based on case attributes.
                </p>
                <div className="space-y-2">
                  <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded text-sm">
                    <div className="font-medium">Critical</div>
                    <div className="text-muted-foreground">AG, CFPB, Military, Search Warrant</div>
                  </div>
                  <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded text-sm">
                    <div className="font-medium">High</div>
                    <div className="text-muted-foreground">BBB, Lawsuit, Private Attorney</div>
                  </div>
                </div>
                <Button className="w-full mt-4" variant="outline" data-testid="button-manage-priority">
                  Manage Rules
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>SLA Policies</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Configure service level agreements and deadlines.
                </p>
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                    <span className="text-sm">Critical Cases</span>
                    <Badge variant="destructive">24h</Badge>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                    <span className="text-sm">High Priority</span>
                    <Badge variant="secondary">48h</Badge>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                    <span className="text-sm">BK Cases</span>
                    <Badge variant="outline">24h/48h</Badge>
                  </div>
                </div>
                <Button className="w-full mt-4" variant="outline" data-testid="button-manage-sla">
                  Manage SLAs
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tag Rules</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Configure automatic tagging based on case content.
                </p>
                <div className="space-y-2">
                  <div className="p-2 bg-muted/50 rounded text-sm">
                    <div className="font-medium">Do Not Contact</div>
                    <div className="text-muted-foreground">Cease & Desist requests</div>
                  </div>
                  <div className="p-2 bg-muted/50 rounded text-sm">
                    <div className="font-medium">Fraud Alert</div>
                    <div className="text-muted-foreground">Fraud trigger words detected</div>
                  </div>
                </div>
                <Button className="w-full mt-4" variant="outline" data-testid="button-manage-tags">
                  Manage Tags
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="integrations" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Webhooks</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Configure webhooks for external system notifications.
                </p>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium">Case Status Updates</div>
                      <div className="text-sm text-muted-foreground">https://api.example.com/webhook</div>
                    </div>
                    <Badge variant="default">Active</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium">SLA Breach Alerts</div>
                      <div className="text-sm text-muted-foreground">https://slack.webhook.url</div>
                    </div>
                    <Badge variant="secondary">Inactive</Badge>
                  </div>
                </div>
                <Button className="w-full mt-4" variant="outline" data-testid="button-manage-webhooks">
                  Manage Webhooks
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>External Integrations</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Configure connections to external systems and APIs.
                </p>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium">Document Scanner</div>
                      <div className="text-sm text-muted-foreground">ClamAV virus scanning</div>
                    </div>
                    <Badge variant="outline">Configured</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium">Email Service</div>
                      <div className="text-sm text-muted-foreground">SMTP notifications</div>
                    </div>
                    <Badge variant="default">Active</Badge>
                  </div>
                </div>
                <Button className="w-full mt-4" variant="outline" data-testid="button-manage-integrations">
                  Manage Integrations
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="system" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Feature Flags</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Control feature availability and A/B testing.
                </p>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium">Advanced Search</div>
                      <div className="text-sm text-muted-foreground">Enhanced case search capabilities</div>
                    </div>
                    <Badge variant="default">Enabled</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium">Bulk Operations</div>
                      <div className="text-sm text-muted-foreground">Batch case operations</div>
                    </div>
                    <Badge variant="secondary">Disabled</Badge>
                  </div>
                </div>
                <Button className="w-full mt-4" variant="outline" data-testid="button-manage-features">
                  Manage Features
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Status</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Monitor system health and performance.
                </p>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span>Database Connection</span>
                    <Badge variant="default">Healthy</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Object Storage</span>
                    <Badge variant="default">Healthy</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Background Jobs</span>
                    <Badge variant="default">Running</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>External APIs</span>
                    <Badge variant="secondary">Degraded</Badge>
                  </div>
                </div>
                <Button className="w-full mt-4" variant="outline" data-testid="button-system-health">
                  View Details
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}