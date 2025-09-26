import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Server, 
  Database, 
  Settings, 
  Activity, 
  HardDrive,
  Cpu,
  MemoryStick,
  Clock,
  Shield,
  AlertTriangle,
  CheckCircle,
  Info
} from "lucide-react";

type SystemHealth = {
  database: {
    status: "healthy" | "warning" | "critical";
    connectionCount: number;
    responseTime: number;
  };
  server: {
    status: "healthy" | "warning" | "critical";
    uptime: number;
    memory: {
      used: number;
      total: number;
    };
    cpu: {
      usage: number;
    };
  };
  storage: {
    used: number;
    total: number;
  };
};

type SystemConfig = {
  maintenance: boolean;
  debugMode: boolean;
  logLevel: "error" | "warn" | "info" | "debug";
  sessionTimeout: number;
  maxFileSize: number;
  allowRegistration: boolean;
};

export default function SystemManagement() {
  const [systemConfig, setSystemConfig] = useState<SystemConfig>({
    maintenance: false,
    debugMode: false,
    logLevel: "info",
    sessionTimeout: 30,
    maxFileSize: 10,
    allowRegistration: false,
  });

  // Mock system health data (in real app, this would come from API)
  const systemHealth: SystemHealth = {
    database: {
      status: "healthy",
      connectionCount: 12,
      responseTime: 45,
    },
    server: {
      status: "healthy", 
      uptime: 2592000, // 30 days in seconds
      memory: {
        used: 2.1,
        total: 8.0,
      },
      cpu: {
        usage: 23,
      },
    },
    storage: {
      used: 15.2,
      total: 100,
    },
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "default";
      case "warning":
        return "secondary";
      case "critical":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy":
        return <CheckCircle className="w-4 h-4" />;
      case "warning":
        return <AlertTriangle className="w-4 h-4" />;
      case "critical":
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Info className="w-4 h-4" />;
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    return `${days}d ${hours}h`;
  };

  const formatBytes = (bytes: number) => {
    return `${bytes.toFixed(1)} GB`;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">System Management</h1>
          <p className="text-muted-foreground">
            Monitor system health and manage configuration settings.
          </p>
        </div>
      </div>

      <Tabs defaultValue="health" className="space-y-4">
        <TabsList>
          <TabsTrigger value="health">System Health</TabsTrigger>
          <TabsTrigger value="config">Configuration</TabsTrigger>
          <TabsTrigger value="logs">System Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="health" className="space-y-4">
          {/* System Status Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Database</CardTitle>
                <Database className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <Badge variant={getStatusColor(systemHealth.database.status)} className="flex items-center gap-1">
                    {getStatusIcon(systemHealth.database.status)}
                    {systemHealth.database.status}
                  </Badge>
                </div>
                <div className="mt-2 space-y-1">
                  <div className="text-xs text-muted-foreground">
                    Connections: {systemHealth.database.connectionCount}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Response: {systemHealth.database.responseTime}ms
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Server</CardTitle>
                <Server className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <Badge variant={getStatusColor(systemHealth.server.status)} className="flex items-center gap-1">
                    {getStatusIcon(systemHealth.server.status)}
                    {systemHealth.server.status}
                  </Badge>
                </div>
                <div className="mt-2 space-y-1">
                  <div className="text-xs text-muted-foreground">
                    Uptime: {formatUptime(systemHealth.server.uptime)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    CPU: {systemHealth.server.cpu.usage}%
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Storage</CardTitle>
                <HardDrive className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="mt-2">
                  <div className="flex justify-between text-sm mb-2">
                    <span>Used: {formatBytes(systemHealth.storage.used)}</span>
                    <span>Total: {formatBytes(systemHealth.storage.total)}</span>
                  </div>
                  <Progress value={(systemHealth.storage.used / systemHealth.storage.total) * 100} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MemoryStick className="w-5 h-5" />
                  Memory Usage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Used: {formatBytes(systemHealth.server.memory.used)}</span>
                    <span>Total: {formatBytes(systemHealth.server.memory.total)}</span>
                  </div>
                  <Progress value={(systemHealth.server.memory.used / systemHealth.server.memory.total) * 100} />
                  <div className="text-xs text-muted-foreground">
                    {((systemHealth.server.memory.used / systemHealth.server.memory.total) * 100).toFixed(1)}% utilized
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cpu className="w-5 h-5" />
                  CPU Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Current Usage</span>
                    <span>{systemHealth.server.cpu.usage}%</span>
                  </div>
                  <Progress value={systemHealth.server.cpu.usage} />
                  <div className="text-xs text-muted-foreground">
                    System performing optimally
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                System Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Maintenance Mode</Label>
                      <p className="text-sm text-muted-foreground">
                        Enable to prevent user access during updates
                      </p>
                    </div>
                    <Switch
                      checked={systemConfig.maintenance}
                      onCheckedChange={(checked) => 
                        setSystemConfig(prev => ({ ...prev, maintenance: checked }))
                      }
                      data-testid="switch-maintenance"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Debug Mode</Label>
                      <p className="text-sm text-muted-foreground">
                        Enable detailed logging for troubleshooting
                      </p>
                    </div>
                    <Switch
                      checked={systemConfig.debugMode}
                      onCheckedChange={(checked) => 
                        setSystemConfig(prev => ({ ...prev, debugMode: checked }))
                      }
                      data-testid="switch-debug"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Allow User Registration</Label>
                      <p className="text-sm text-muted-foreground">
                        Allow new users to register accounts
                      </p>
                    </div>
                    <Switch
                      checked={systemConfig.allowRegistration}
                      onCheckedChange={(checked) => 
                        setSystemConfig(prev => ({ ...prev, allowRegistration: checked }))
                      }
                      data-testid="switch-registration"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <Alert>
                    <Shield className="w-4 h-4" />
                    <AlertTitle>Security Settings</AlertTitle>
                    <AlertDescription>
                      Changes to security settings will take effect immediately and may affect active user sessions.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-2">
                    <Label>Session Timeout (minutes)</Label>
                    <div className="text-sm text-muted-foreground">
                      Current: {systemConfig.sessionTimeout} minutes
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Max File Upload Size (MB)</Label>
                    <div className="text-sm text-muted-foreground">
                      Current: {systemConfig.maxFileSize} MB
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" data-testid="button-reset-config">
                  Reset to Defaults
                </Button>
                <Button data-testid="button-save-config">
                  Save Configuration
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                System Logs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert>
                  <Info className="w-4 h-4" />
                  <AlertTitle>Log Viewing</AlertTitle>
                  <AlertDescription>
                    System logs are available for the last 30 days. Use the developer console or contact your system administrator for detailed log access.
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <div className="flex justify-between items-center py-2 px-3 bg-muted rounded-md">
                    <div className="flex items-center gap-2">
                      <Badge variant="default" className="text-xs">INFO</Badge>
                      <span className="text-sm">System startup completed successfully</span>
                    </div>
                    <span className="text-xs text-muted-foreground">2 minutes ago</span>
                  </div>

                  <div className="flex justify-between items-center py-2 px-3 bg-muted rounded-md">
                    <div className="flex items-center gap-2">
                      <Badge variant="default" className="text-xs">INFO</Badge>
                      <span className="text-sm">Database connection established</span>
                    </div>
                    <span className="text-xs text-muted-foreground">5 minutes ago</span>
                  </div>

                  <div className="flex justify-between items-center py-2 px-3 bg-muted rounded-md">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">WARN</Badge>
                      <span className="text-sm">High memory usage detected (75%)</span>
                    </div>
                    <span className="text-xs text-muted-foreground">1 hour ago</span>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button variant="outline" data-testid="button-export-logs">
                    Export Logs
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}