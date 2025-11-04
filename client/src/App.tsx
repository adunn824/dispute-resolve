import { useState, useEffect } from "react";
import { Switch, Route, useLocation, useParams } from "wouter";
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
import { CaseListPage } from "./pages/CaseListPage";
import EmailIntakePage from "./pages/EmailIntakePage";
import SearchPage from "./pages/SearchPage";
import KnowledgeBasePage from "./pages/KnowledgeBasePage";
import KnowledgeBaseArticlePage from "./pages/KnowledgeBaseArticlePage";
import CaseTypesManagement from "./pages/admin/case-types";
import CaseOriginationsManagement from "./pages/admin/case-originations";
import LendersManagement from "./pages/admin/lenders";
import StatusesManagement from "./pages/admin/statuses";
import ResolutionOptionsManagement from "./pages/admin/resolution-options";
import BusinessRulesManagement from "./pages/admin/business-rules";
import ReusableTemplatesManagement from "./pages/admin/reusable-templates";
import CategoriesManagement from "./pages/admin/categories";
import UsersManagement from "./pages/admin/users";
import CaseAssignmentPage from "./pages/admin/case-assignment";
import SystemManagement from "./pages/admin/system";
import KnowledgeBaseManagement from "./pages/admin/KnowledgeBaseManagement";
import EmailTemplatesManagement from "./pages/admin/email-templates";
import DatabaseSync from "./pages/admin/database-sync";
import ComplianceReportsPage from "./pages/compliance/reports";
import AdminReportsPage from "./pages/admin/reports";
import NotFound from "@/pages/not-found";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { LoginPage } from "./pages/LoginPage";
import { UserMenu } from "./components/UserMenu";

function Router() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
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

  const userRole = (user?.role as "admin" | "agent" | "compliance") || "agent";

  // No auto-redirect for admin users - let them choose which panel to access

  return (
    <Switch>
      <Route path="/login">
        <LoginPage />
      </Route>
      <Route path="/">
        <ProtectedRoute>
          {currentView === "dashboard" && (
            <Dashboard
              userRole={userRole}
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
        </ProtectedRoute>
      </Route>
      <Route path="/admin">
        <ProtectedRoute requiredRole="admin">
          <CaseTypesManagement />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/case-types">
        <ProtectedRoute requiredRole="admin">
          <CaseTypesManagement />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/case-originations">
        <ProtectedRoute requiredRole="admin">
          <CaseOriginationsManagement />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/lenders">
        <ProtectedRoute requiredRole="admin">
          <LendersManagement />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/statuses">
        <ProtectedRoute requiredRole="admin">
          <StatusesManagement />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/resolution-options">
        <ProtectedRoute requiredRole="admin">
          <ResolutionOptionsManagement />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/business-rules">
        <ProtectedRoute requiredRole="admin">
          <BusinessRulesManagement />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/templates">
        <ProtectedRoute requiredRole="admin">
          <ReusableTemplatesManagement />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/categories">
        <ProtectedRoute requiredRole="admin">
          <CategoriesManagement />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/rules">
        <ProtectedRoute requiredRole="admin">
          <BusinessRulesManagement />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/users">
        <ProtectedRoute requiredRole="admin">
          <UsersManagement />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/case-assignment">
        <ProtectedRoute requiredRole="admin">
          <CaseAssignmentPage />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/system">
        <ProtectedRoute requiredRole="admin">
          <SystemManagement />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/email-templates">
        <ProtectedRoute requiredRole="admin">
          <EmailTemplatesManagement />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/database-sync">
        <ProtectedRoute requiredRole="admin">
          <DatabaseSync />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/reports">
        <ProtectedRoute requiredRole={["admin", "compliance"]}>
          <AdminReportsPage />
        </ProtectedRoute>
      </Route>
      <Route path="/knowledge-base">
        <ProtectedRoute>
          <KnowledgeBasePage />
        </ProtectedRoute>
      </Route>
      <Route path="/knowledge-base/article/:slug">
        {params => (
          <ProtectedRoute>
            <KnowledgeBaseArticlePage />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/knowledge-base/admin">
        <ProtectedRoute requiredRole={["admin", "compliance"]}>
          <KnowledgeBaseManagement />
        </ProtectedRoute>
      </Route>
      <Route path="/compliance">
        <ProtectedRoute requiredRole={["compliance", "admin"]}>
          <Dashboard
            userRole="compliance"
            onCreateCase={handleCreateCase}
            onViewCase={handleViewCase}
          />
        </ProtectedRoute>
      </Route>
      <Route path="/search">
        <ProtectedRoute>
          <SearchPage userRole="agent" />
        </ProtectedRoute>
      </Route>
      <Route path="/cases">
        <ProtectedRoute>
          <CaseListPage userRole="agent" />
        </ProtectedRoute>
      </Route>
      <Route path="/cases/new">
        <ProtectedRoute>
          <CaseIntakeForm onSubmit={handleCaseSubmit} />
        </ProtectedRoute>
      </Route>
      <Route path="/cases/:id">
        {params => (
          <ProtectedRoute>
            <CaseDetailView
              caseId={params.id}
              onBack={() => setLocation("/cases")}
            />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/email-intake">
        <ProtectedRoute>
          <EmailIntakePage />
        </ProtectedRoute>
      </Route>
      <Route path="/compliance/cases">
        <ProtectedRoute requiredRole={["compliance", "admin"]}>
          <CaseListPage userRole="compliance" />
        </ProtectedRoute>
      </Route>
      <Route path="/compliance/reports">
        <ProtectedRoute requiredRole={["compliance", "admin"]}>
          <ComplianceReportsPage />
        </ProtectedRoute>
      </Route>
      <Route path="/compliance/regulatory">
        <ProtectedRoute requiredRole={["compliance", "admin"]}>
          <Dashboard
            userRole="compliance"
            onCreateCase={handleCreateCase}
            onViewCase={handleViewCase}
          />
        </ProtectedRoute>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const style = {
    "--sidebar-width": "20rem",
    "--sidebar-width-icon": "4rem",
  };

  // Show loading screen during auth check
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading application...</p>
        </div>
      </div>
    );
  }

  // Show login page if not authenticated and on a protected route
  if (!isAuthenticated) {
    return <Router />;
  }

  // Show authenticated app layout
  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar userRole={(user?.role as "admin" | "agent" | "compliance") || "agent"} />
        <div className="flex flex-col flex-1">
          <header className="flex items-center justify-between p-4 border-b bg-background">
            <div className="flex items-center gap-4">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <h1 className="text-lg font-semibold">Complaint & Dispute Management</h1>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <UserMenu />
            </div>
          </header>
          <main className="flex-1 overflow-auto p-6">
            <Router />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="complaint-mgmt-theme">
        <TooltipProvider>
          <AuthProvider>
            <AppContent />
            <Toaster />
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
