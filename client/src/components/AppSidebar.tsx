import { Home, Plus, Search, Settings, FileText, Users, AlertTriangle, BarChart3, Shield, Cog, BookOpen, Building, ListChecks } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { Link, useLocation } from "wouter";

interface AppSidebarProps {
  userRole?: "agent" | "compliance" | "admin";
}

export function AppSidebar({ userRole = "agent" }: AppSidebarProps) {
  const [location] = useLocation();
  
  // For admin users, determine which panel they're viewing based on current route
  const getCurrentPanelForAdmin = () => {
    if (userRole !== "admin") return userRole;
    
    if (location.startsWith("/admin")) return "admin";
    
    // Check if current route is under compliance namespace
    if (location.startsWith("/compliance")) return "compliance";
    
    return "agent"; // Default to agent for root route "/"
  };
  
  const currentPanel = getCurrentPanelForAdmin();

  const agentItems = [
    { title: "Dashboard", url: "/", icon: Home },
    { title: "New Case", url: "/cases/new", icon: Plus },
    { title: "My Cases", url: "/cases", icon: FileText },
    { title: "Search", url: "/search", icon: Search },
    { title: "Knowledge Base", url: "/knowledge-base", icon: BookOpen },
  ];

  const complianceItems = [
    { title: "Dashboard", url: "/compliance", icon: BarChart3 },
    { title: "All Cases", url: "/compliance/cases", icon: FileText },
    { title: "Reports", url: "/compliance/reports", icon: BarChart3 },
    { title: "Regulatory", url: "/compliance/regulatory", icon: AlertTriangle },
    { title: "Knowledge Base", url: "/knowledge-base", icon: BookOpen },
  ];

  const adminItems = [
    { title: "Case Originations", url: "/admin/case-originations", icon: Building },
    { title: "Lenders", url: "/admin/lenders", icon: Building },
    { title: "Case Types", url: "/admin/case-types", icon: FileText },
    { title: "Categories", url: "/admin/categories", icon: FileText },
    { title: "Templates", url: "/admin/templates", icon: FileText },
    { title: "Reusable Templates", url: "/admin/reusable-templates", icon: ListChecks },
    { title: "Rules", url: "/admin/rules", icon: Settings },
    { title: "Users", url: "/admin/users", icon: Users },
    { title: "System", url: "/admin/system", icon: Cog },
    { title: "Knowledge Base", url: "/knowledge-base/admin", icon: BookOpen },
  ];

  const getMenuItems = () => {
    switch (currentPanel) {
      case "compliance":
        return complianceItems;
      case "admin":
        return adminItems;
      default:
        return agentItems;
    }
  };

  const getRoleLabel = () => {
    switch (currentPanel) {
      case "compliance":
        return "Compliance";
      case "admin":
        return "Administration";
      default:
        return "Agent Portal";
    }
  };

  return (
    <Sidebar data-testid="sidebar-main">
      <SidebarHeader className="p-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold">Complaint & Dispute Management</h2>
          <p className="text-sm text-muted-foreground">{getRoleLabel()}</p>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {getMenuItems().map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild
                    isActive={location === item.url}
                    data-testid={`sidebar-link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span>System Operational</span>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}