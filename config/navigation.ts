import {
  Mail,
  FolderOpen,
  CheckSquare,
  Briefcase,
  LayoutDashboard,
  MessageSquare,
  Users,
  Settings,
  FileText,
  DollarSign,
  BarChart3,
  Clock,
  Archive,
  Bell,
  Building2,
  UserCheck,
  Target,
  Database,
  Headphones,
} from "lucide-react";

export interface NavItem {
  name: string;
  href: string;
  view: string; // The query param 'view' value
  icon: any; // Lucide icon component
  comingSoon?: boolean;
  roles?: string[]; // Allowed roles, if undefined, allowed for all
}

// Role-based navigation configuration
// If roles is undefined, it's visible to everyone
export const navigationConfig: NavItem[] = [
  // Core Dashboard (All Roles)
  {
    name: "Overview",
    href: "/?view=dashboard",
    view: "dashboard",
    icon: LayoutDashboard,
  },

  // === ADMIN / MANAGER MODULES ===
  // Communication Hub
  {
    name: "Email Center",
    href: "/?view=email-center",
    view: "email-center",
    icon: Mail,
    roles: ["admin", "manager"],
  },
  {
    name: "Contact Directory",
    href: "/?view=contact-center",
    view: "contact-center",
    icon: MessageSquare,
    roles: ["admin", "manager"],
  },
  {
    name: "Support Center",
    href: "/?view=support",
    view: "support",
    icon: Headphones,
    comingSoon: true,
    roles: ["admin", "manager"],
  },

  // Project Hub
  {
    name: "Project Center",
    href: "/?view=project-center",
    view: "project-center",
    icon: FolderOpen,
    roles: ["admin", "manager", "employee", "client"], // Everyone sees project center
  },
  {
    name: "Client Submissions",
    href: "/?view=client-submissions",
    view: "client-submissions",
    icon: FileText,
    roles: ["admin", "manager"],
  },
  {
    name: "Task Board",
    href: "/?view=task-management",
    view: "task-management",
    icon: CheckSquare,
    roles: ["admin", "manager", "employee"],
  },
  {
    name: "Time Tracker",
    href: "/?view=time-tracking",
    view: "time-tracking",
    icon: Clock,
    comingSoon: true,
    roles: ["admin", "manager"],
  },
  {
    name: "My Time",
    href: "/?view=my-time",
    view: "my-time",
    icon: Clock,
    comingSoon: true,
    roles: ["employee"],
  },

  // Team Management
  {
    name: "Career Portal",
    href: "/?view=career-hub",
    view: "career-hub",
    icon: Briefcase,
    roles: ["admin", "manager"],
  },
  {
    name: "Team Directory",
    href: "/?view=team-directory",
    view: "team-directory",
    icon: Users,
    roles: ["admin", "manager"],
  },
  {
    name: "Attendance Hub",
    href: "/?view=attendance",
    view: "attendance",
    icon: UserCheck,
    comingSoon: true,
    roles: ["admin", "manager"],
  },

  // Business Operations
  {
    name: "Client Portal",
    href: "/?view=clients",
    view: "clients",
    icon: Building2,
    comingSoon: true,
    roles: ["admin", "manager"],
  },
  {
    name: "Finance Center",
    href: "/?view=invoicing",
    view: "invoicing",
    icon: DollarSign,
    comingSoon: true,
    roles: ["admin", "manager"],
  },
  {
    name: "Analytics Hub",
    href: "/?view=analytics",
    view: "analytics",
    icon: BarChart3,
    comingSoon: true,
    roles: ["admin", "manager"],
  },

  // Content Management
  {
    name: "Document Library",
    href: "/?view=documents",
    view: "documents",
    icon: FileText,
    comingSoon: true,
    roles: ["admin", "manager"],
  },
  {
    name: "Knowledge Hub",
    href: "/?view=knowledge",
    view: "knowledge",
    icon: Archive,
    comingSoon: true,
    roles: ["admin", "manager"],
  },

  // Employee Specific
  {
    name: "Performance",
    href: "/?view=performance",
    view: "performance",
    icon: Target,
    comingSoon: true,
    roles: ["employee"],
  },
  {
    name: "My Documents",
    href: "/?view=my-documents",
    view: "my-documents",
    icon: FileText,
    comingSoon: true,
    roles: ["employee"],
  },
  {
    name: "Help Desk",
    href: "/?view=employee-support",
    view: "employee-support",
    icon: Headphones,
    comingSoon: true,
    roles: ["employee"],
  },

  // System Settings (Visible to all, but specific tabs might be restricted inside)
  {
    name: "Notifications",
    href: "/?view=notifications",
    view: "notifications",
    icon: Bell,
    comingSoon: true,
    roles: ["admin", "manager"],
  },
  {
    name: "Data Center",
    href: "/?view=data",
    view: "data",
    icon: Database,
    comingSoon: true,
    roles: ["admin"],
  },
  {
    name: "Settings",
    href: "/?view=settings",
    view: "settings",
    icon: Settings,
    // visible to all
  },
];

export function getNavigationForRole(role: string): NavItem[] {
  return navigationConfig.filter(item => {
    if (!item.roles) return true;
    return item.roles.includes(role);
  });
}

