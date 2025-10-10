import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Database, AlertTriangle, CheckCircle, Loader2, Copy, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function DatabaseSync() {
  const [productionDbUrl, setProductionDbUrl] = useState("");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [syncStats, setSyncStats] = useState<any>(null);
  const { toast } = useToast();

  const syncMutation = useMutation({
    mutationFn: async (dbUrl: string) => {
      const response = await apiRequest("POST", "/api/admin/sync-to-production", {
        productionDatabaseUrl: dbUrl
      });
      return response;
    },
    onSuccess: (data: any) => {
      setSyncStats(data.stats);
      toast({
        title: "Sync Complete!",
        description: `Successfully synced ${data.stats.cases} cases, ${data.stats.users} users, and ${data.stats.customers} customers to production.`,
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Sync Failed",
        description: error.message || "Failed to sync database. Please check the connection string and try again.",
      });
    },
  });

  const handleSyncClick = () => {
    if (!productionDbUrl.trim()) {
      toast({
        variant: "destructive",
        title: "Invalid URL",
        description: "Please enter a valid production database URL.",
      });
      return;
    }
    setShowConfirmDialog(true);
  };

  const handleConfirmSync = () => {
    setShowConfirmDialog(false);
    syncMutation.mutate(productionDbUrl);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Database URL copied to clipboard.",
    });
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Database Sync</h1>
        <p className="text-muted-foreground mt-2">
          Sync your development database to production
        </p>
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Warning: This action will overwrite production data</AlertTitle>
        <AlertDescription>
          This operation will clear all existing data in the production database and replace it with data from your development environment.
          Make sure you have a backup before proceeding.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Sync Configuration
          </CardTitle>
          <CardDescription>
            Enter your production database connection string to sync data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="prod-db-url">Production Database URL</Label>
            <div className="flex gap-2">
              <Input
                id="prod-db-url"
                data-testid="input-prod-db-url"
                type="password"
                placeholder="postgresql://..."
                value={productionDbUrl}
                onChange={(e) => setProductionDbUrl(e.target.value)}
                disabled={syncMutation.isPending}
              />
              <Button
                variant="outline"
                size="icon"
                data-testid="button-copy-url"
                onClick={() => copyToClipboard(productionDbUrl)}
                disabled={!productionDbUrl || syncMutation.isPending}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              You can find this in your deployment settings under Resources → Database → Environment variables
            </p>
          </div>

          <Button
            data-testid="button-sync-database"
            onClick={handleSyncClick}
            disabled={!productionDbUrl.trim() || syncMutation.isPending}
            className="w-full"
          >
            {syncMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <Database className="mr-2 h-4 w-4" />
                Sync to Production
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {syncStats && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertTitle>Last Sync Statistics</AlertTitle>
          <AlertDescription>
            <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
              <div>Users: <span className="font-semibold">{syncStats.users}</span></div>
              <div>Cases: <span className="font-semibold">{syncStats.cases}</span></div>
              <div>Customers: <span className="font-semibold">{syncStats.customers}</span></div>
              <div>Categories: <span className="font-semibold">{syncStats.categories}</span></div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>How to Use</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="space-y-2">
            <p className="font-semibold">Step 1: Get Production Database URL</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground ml-2">
              <li>Open the Database tool in your left sidebar</li>
              <li>Switch to "Production Database" view</li>
              <li>Go to the "Commands" or "Connection" tab</li>
              <li>Find and copy the DATABASE_URL from Environment variables</li>
            </ol>
          </div>
          
          <div className="space-y-2">
            <p className="font-semibold">Step 2: Sync Data</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground ml-2">
              <li>Paste the production DATABASE_URL above</li>
              <li>Click "Sync to Production"</li>
              <li>Confirm the operation</li>
              <li>Wait for sync to complete</li>
            </ol>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Note</AlertTitle>
            <AlertDescription>
              Your production database URL is never stored or logged. It's only used for this one-time sync operation.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all existing data in your production database and replace it with data from development.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-sync">Cancel</AlertDialogCancel>
            <AlertDialogAction
              data-testid="button-confirm-sync"
              onClick={handleConfirmSync}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes, Sync Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
