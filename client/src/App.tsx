import { useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeProvider } from "./components/ThemeProvider";
import { ThemeToggle } from "./components/ThemeToggle";
import { AppSidebar } from "./components/AppSidebar";
import { Dashboard } from "./components/Dashboard";
import { CaseIntakeForm } from "./components/CaseIntakeForm";
import { CaseDetailView } from "./components/CaseDetailView";
import { AdminConfigPanel } from "./components/AdminConfigPanel";
import CaseTypesManagement from "./pages/admin/case-types";
import BusinessRulesManagement from "./pages/admin/business-rules";
import NotFound from "@/pages/not-found";

function Router() {
  const [currentView, setCurrentView] = useState<"dashboard" | "new-case" | "case-detail" | "admin">("dashboard");
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);

  const handleViewCase = (caseId: string) => {
    setSelectedCaseId(caseId);
    setCurrentView("case-detail");
  };

  const handleCreateCase = () => {
    setCurrentView("new-case");
  };

  const handleCaseSubmit = () => {
    setCurrentView("dashboard");
  };

  const handleBackToDashboard = () => {
    setCurrentView("dashboard");
    setSelectedCaseId(null);
  };

  return (
    <Switch>
      <Route path="/">
        {currentView === "dashboard" && (
          <Dashboard
            userRole="agent"
            onCreateCase={handleCreateCase}
            onViewCase={handleViewCase}
          />
        )}
        {currentView === "new-case" && (
          <CaseIntakeForm onSubmit={handleCaseSubmit} />
        )}
        {currentView === "case-detail" && selectedCaseId && (
          <CaseDetailView
            caseId={selectedCaseId}
            onBack={handleBackToDashboard}
          />
        )}
        {currentView === "admin" && (
          <AdminConfigPanel onPublishConfig={() => console.log("Config published")} />
        )}
      </Route>
      <Route path="/admin">
        <AdminConfigPanel onPublishConfig={() => console.log("Config published")} />
      </Route>
      <Route path="/admin/case-types">
        <CaseTypesManagement />
      </Route>
      <Route path="/admin/business-rules">
        <BusinessRulesManagement />
      </Route>
      <Route path="/compliance">
        <Dashboard
          userRole="compliance"
          onCreateCase={handleCreateCase}
          onViewCase={handleViewCase}
        />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const style = {
    "--sidebar-width": "20rem",
    "--sidebar-width-icon": "4rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="complaint-mgmt-theme">
        <TooltipProvider>
          <SidebarProvider style={style as React.CSSProperties}>
            <div className="flex h-screen w-full">
              <AppSidebar userRole="agent" />
              <div className="flex flex-col flex-1">
                <header className="flex items-center justify-between p-4 border-b bg-background">
                  <div className="flex items-center gap-4">
                    <SidebarTrigger data-testid="button-sidebar-toggle" />
                    <h1 className="text-lg font-semibold">Complaint & Dispute Management</h1>
                  </div>
                  <ThemeToggle />
                </header>
                <main className="flex-1 overflow-auto p-6">
                  <Router />
                </main>
              </div>
            </div>
          </SidebarProvider>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
