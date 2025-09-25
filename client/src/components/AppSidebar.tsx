import { Home, Plus, Search, Settings, FileText, Users, AlertTriangle, BarChart3, Shield, Cog } from "lucide-react";
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

  const agentItems = [
    { title: "Dashboard", url: "/", icon: Home },
    { title: "New Case", url: "/cases/new", icon: Plus },
    { title: "My Cases", url: "/cases", icon: FileText },
    { title: "Search", url: "/search", icon: Search },
  ];

  const complianceItems = [
    { title: "Dashboard", url: "/compliance", icon: BarChart3 },
    { title: "All Cases", url: "/cases", icon: FileText },
    { title: "Reports", url: "/reports", icon: BarChart3 },
    { title: "Regulatory", url: "/regulatory", icon: AlertTriangle },
  ];

  const adminItems = [
    { title: "Dashboard", url: "/admin", icon: Shield },
    { title: "Case Types", url: "/admin/case-types", icon: FileText },
    { title: "Categories", url: "/admin/categories", icon: FileText },
    { title: "Rules", url: "/admin/rules", icon: Settings },
    { title: "Users", url: "/admin/users", icon: Users },
    { title: "System", url: "/admin/system", icon: Cog },
  ];

  const getMenuItems = () => {
    switch (userRole) {
      case "compliance":
        return complianceItems;
      case "admin":
        return adminItems;
      default:
        return agentItems;
    }
  };

  const getRoleLabel = () => {
    switch (userRole) {
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