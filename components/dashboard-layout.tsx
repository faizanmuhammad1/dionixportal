"use client";

import type React from "react";
import {
  Mail,
  FolderOpen,
  CheckSquare,
  Briefcase,
  LayoutDashboard,
  MessageSquare,
  MessageCircleMore,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
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
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Image from "next/image";
import { ThemeToggle } from "@/components/theme-toggle";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { User } from "@/lib/auth";
import { createClient } from "@/lib/supabase";

interface DashboardLayoutProps {
  user: User;
  children: React.ReactNode;
  onLogout: () => void;
  onNavigate?: (view: string) => void;
  currentView?: string;
}

export function DashboardLayout({
  user,
  children,
  onLogout,
  onNavigate,
  currentView,
}: DashboardLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  // Note: useSearchParams requires Suspense - DashboardLayout should be used within Suspense
  // window.location as a fallback
  const searchParams = useSearchParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const supabase = createClient();

  // Get current view from URL or props - safely get from URL if available
  const activeView = (() => {
    if (currentView) return currentView;
    try {
      // Try searchParams first (if available from Suspense context)
      if (searchParams) {
        const view = searchParams.get('view');
        if (view) return view;
      }
      // Fallback to window.location
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const viewFromUrl = params.get('view');
        if (viewFromUrl) {
          return viewFromUrl;
        }
      }
    } catch (e) {
      // Fallback to dashboard
      console.error("Error reading view from URL:", e);
    }
    return 'dashboard';
  })();

  const navigation = [
    // Core Dashboard
    {
      name: "Overview",
      href: "/?view=dashboard",
      icon: LayoutDashboard,
      current: activeView === "dashboard",
    },

    ...(user.role === "admin"
      ? [
          // Communication Hub
          {
            name: "Email Center",
            href: "/?view=email-center",
            icon: Mail,
            current: activeView === "email-center",
          },
          {
            name: "Contact Directory",
            href: "/?view=contact-center",
            icon: MessageSquare,
            current: activeView === "contact-center",
          },
          {
            name: "Messages",
            href: "/?view=messages",
            icon: MessageCircleMore,
            current: activeView === "messages",
          },
          {
            name: "Support Center",
            href: "/?view=support",
            icon: Headphones,
            current: activeView === "support",
            comingSoon: true,
          },

          // Project Hub
          {
            name: "Project Center",
            href: "/?view=project-center",
            icon: FolderOpen,
            current: activeView === "project-center",
          },
          {
            name: "Client Submissions",
            href: "/?view=client-submissions",
            icon: FileText,
            current: activeView === "client-submissions",
          },
          {
            name: "Task Board",
            href: "/?view=task-management",
            icon: CheckSquare,
            current: activeView === "task-management",
          },
          {
            name: "Time Tracker",
            href: "/?view=time-tracking",
            icon: Clock,
            current: activeView === "time-tracking",
            comingSoon: true,
          },

          // Team Management
          {
            name: "Career Portal",
            href: "/?view=career-hub",
            icon: Briefcase,
            current: activeView === "career-hub",
          },
          {
            name: "Team Directory",
            href: "/?view=team-directory",
            icon: Users,
            current: activeView === "team-directory",
          },
          {
            name: "Attendance Hub",
            href: "/?view=attendance",
            icon: UserCheck,
            current: activeView === "attendance",
            comingSoon: true,
          },

          // Business Operations
          {
            name: "Client Portal",
            href: "/?view=clients",
            icon: Building2,
            current: activeView === "clients",
            comingSoon: true,
          },
          {
            name: "Finance Center",
            href: "/?view=invoicing",
            icon: DollarSign,
            current: activeView === "invoicing",
            comingSoon: true,
          },
          {
            name: "Analytics Hub",
            href: "/?view=analytics",
            icon: BarChart3,
            current: activeView === "analytics",
            comingSoon: true,
          },

          // Content Management
          {
            name: "Document Library",
            href: "/?view=documents",
            icon: FileText,
            current: activeView === "documents",
            comingSoon: true,
          },
          {
            name: "Knowledge Hub",
            href: "/?view=knowledge",
            icon: Archive,
            current: activeView === "knowledge",
            comingSoon: true,
          },

          // System Settings
          {
            name: "Notifications",
            href: "/?view=notifications",
            icon: Bell,
            current: activeView === "notifications",
            comingSoon: true,
          },
          {
            name: "Data Center",
            href: "/?view=data",
            icon: Database,
            current: activeView === "data",
            comingSoon: true,
          },
        ]
      : [
          // Employee Dashboard
          {
            name: "Messages",
            href: "/?view=messages",
            icon: MessageCircleMore,
            current: activeView === "messages",
          },
          {
            name: "Project Center",
            href: "/?view=project-center",
            icon: FolderOpen,
            current: activeView === "project-center",
          },
          {
            name: "Time Tracker",
            href: "/?view=my-time",
            icon: Clock,
            current: activeView === "my-time",
            comingSoon: true,
          },
          {
            name: "Performance",
            href: "/?view=performance",
            icon: Target,
            current: activeView === "performance",
            comingSoon: true,
          },
          {
            name: "My Documents",
            href: "/?view=my-documents",
            icon: FileText,
            current: activeView === "my-documents",
            comingSoon: true,
          },
          {
            name: "Help Desk",
            href: "/?view=employee-support",
            icon: Headphones,
            current: activeView === "employee-support",
            comingSoon: true,
          },
        ]),

    // Settings (always last)
    {
      name: "Settings",
      href: "/?view=settings",
      icon: Settings,
      current: activeView === "settings",
      comingSoon: true,
    },
  ];

  const availableNav = navigation.filter((item) => !item.comingSoon);
  const comingSoonNav = navigation.filter((item) => item.comingSoon);

  const handleNavClick = (href: string) => {
    try {
      // Use router for navigation
      router.push(href);
      // Also call onNavigate if provided for backward compatibility
      if (onNavigate) {
        try {
          const view = new URL(href, typeof window !== 'undefined' ? window.location.origin : 'http://localhost').searchParams.get('view') || href.replace('/?view=', '').replace('?view=', '');
          onNavigate(view);
        } catch (e) {
          // Fallback: extract view from href string
          const match = href.match(/[?&]view=([^&]+)/);
          if (match) {
            onNavigate(match[1]);
          }
        }
      }
      setSidebarOpen(false); // Close mobile sidebar on navigation
    } catch (error) {
      console.error("Navigation error:", error);
      // Fallback to window.location if router fails
      if (typeof window !== 'undefined') {
        window.location.href = href;
      }
    }
  };

  useEffect(() => {
    // Initial count: use form_submissions count as notifications source
    (async () => {
      const { count, error } = await supabase
        .from("form_submissions")
        .select("id", { count: "exact", head: true });
      if (error) {
        console.error("Error fetching notif count:", error);
      }
      setNotifCount(typeof count === "number" ? count : 0);
    })();

    // Also subscribe to live unread email badge updates via broadcast webhook
    const channel = supabase
      .channel("emails-inbox")
      .on("broadcast", { event: "new-email" }, () =>
        setNotifCount((c) => c + 1)
      )
      .subscribe();

    const channel2 = supabase
      .channel("navbar-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "form_submissions" },
        () => setNotifCount((c) => c + 1)
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "form_submissions" },
        () => setNotifCount((c) => Math.max(0, c - 1))
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(channel2);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Mobile sidebar */}
      <div
        className={`fixed inset-0 z-50 lg:hidden ${
          sidebarOpen ? "block" : "hidden"
        }`}
      >
        <div
          className="fixed inset-0 bg-black/20 dark:bg-black/50"
          onClick={() => setSidebarOpen(false)}
        />
        <div className="fixed left-0 top-0 h-full w-64 bg-card border-r border-border shadow-lg flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0 w-full">
              <div className="relative flex-1 h-16 min-h-[64px] w-full">
                <div className="block dark:hidden h-full w-full">
                  <Image
                    src="/dark-logo.svg"
                    alt="Dionix.ai"
                    fill
                    priority
                    unoptimized
                    sizes="(max-width: 768px) 100vw, 256px"
                    className="object-contain"
                  />
                </div>
                <div className="hidden dark:block h-full w-full">
                  <Image
                    src="/main-logo.svg"
                    alt="Dionix.ai"
                    fill
                    priority
                    unoptimized
                    sizes="(max-width: 768px) 100vw, 256px"
                    className="object-contain"
                  />
                </div>
              </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(false)}
              className="ml-2"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent hover:scrollbar-thumb-muted-foreground/40">
            {availableNav.map((item) => (
              <Button
                key={item.name}
                variant={item.current ? "default" : "ghost"}
                className={`w-full justify-start relative transition-colors ${
                  item.current
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "text-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
                onClick={() => handleNavClick(item.href)}
              >
                <item.icon className="mr-2 h-4 w-4" />
                {item.name}
              </Button>
            ))}
            {comingSoonNav.length > 0 && (
              <div className="mt-4">
                <div className="px-2 py-1 text-xs uppercase tracking-wide text-muted-foreground">
                  Coming soon
                </div>
                <div className="mt-1 space-y-2">
                  {comingSoonNav.map((item) => (
                    <Button
                      key={item.name}
                      variant="ghost"
                      className="w-full justify-start text-foreground hover:bg-accent hover:text-accent-foreground"
                      onClick={() => {}}
                      disabled
                      title="Coming soon"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {item.name}
                      <span className="ml-auto text-xs bg-muted text-muted-foreground px-2 py-1 rounded">
                        Soon
                      </span>
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div
        className={`hidden lg:fixed lg:inset-y-0 lg:flex lg:flex-col transition-all duration-300 z-30 ${
          sidebarCollapsed && !sidebarHovered ? "lg:w-16" : "lg:w-64"
        }`}
        onMouseEnter={() => setSidebarHovered(true)}
        onMouseLeave={() => setSidebarHovered(false)}
      >
        <div className="flex flex-col flex-grow bg-card border-r border-border shadow-sm h-screen">
          <div className="flex items-center justify-center min-h-20 px-4 py-4 border-b border-border flex-shrink-0 w-full">
            {(!sidebarCollapsed || sidebarHovered) && (
              <div className="relative w-full h-16 min-h-[64px]">
                <div className="block dark:hidden h-full w-full relative">
                  <Image
                    src="/dark-logo.svg"
                    alt="Dionix.ai"
                    fill
                    priority
                    unoptimized
                    sizes="256px"
                    className="object-contain"
                  />
                </div>
                <div className="hidden dark:block h-full w-full relative">
                  <Image
                    src="/main-logo.svg"
                    alt="Dionix.ai"
                    fill
                    priority
                    unoptimized
                    sizes="256px"
                    className="object-contain"
                  />
                </div>
              </div>
            )}
            {sidebarCollapsed && !sidebarHovered && (
              <div className="relative w-full h-12 min-h-[48px]">
                <div className="block dark:hidden h-full w-full relative">
                  <Image
                    src="/dark-logo.svg"
                    alt="Dionix.ai"
                    fill
                    priority
                    unoptimized
                    sizes="64px"
                    className="object-contain"
                  />
                </div>
                <div className="hidden dark:block h-full w-full relative">
                  <Image
                    src="/main-logo.svg"
                    alt="Dionix.ai"
                    fill
                    priority
                    unoptimized
                    sizes="64px"
                    className="object-contain"
                  />
                </div>
              </div>
            )}
          </div>
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent hover:scrollbar-thumb-muted-foreground/40 min-h-0">
            {availableNav.map((item) => (
              <Button
                key={item.name}
                variant={item.current ? "default" : "ghost"}
                className={`w-full transition-all duration-200 ${
                  sidebarCollapsed && !sidebarHovered
                    ? "justify-center px-2"
                    : "justify-start"
                } ${
                  item.current
                    ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                    : "text-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
                onClick={() => handleNavClick(item.href)}
                title={
                  sidebarCollapsed && !sidebarHovered ? item.name : undefined
                }
              >
                <item.icon
                  className={`h-4 w-4 ${
                    sidebarCollapsed && !sidebarHovered ? "" : "mr-2"
                  }`}
                />
                {(!sidebarCollapsed || sidebarHovered) && item.name}
              </Button>
            ))}
            {comingSoonNav.length > 0 && (
              <div className="mt-4">
                {(!sidebarCollapsed || sidebarHovered) && (
                  <div className="px-2 py-1 text-xs uppercase tracking-wide text-muted-foreground">
                    Coming soon
                  </div>
                )}
                <div className="mt-1 space-y-2">
                  {comingSoonNav.map((item) => (
                    <Button
                      key={item.name}
                      variant="ghost"
                      className={`w-full transition-all duration-200 ${
                        sidebarCollapsed && !sidebarHovered
                          ? "justify-center px-2"
                          : "justify-start"
                      } text-foreground hover:bg-accent hover:text-accent-foreground`}
                      onClick={() => {}}
                      disabled
                      title={
                        sidebarCollapsed && !sidebarHovered
                          ? item.name
                          : "Coming soon"
                      }
                    >
                      <item.icon
                        className={`h-4 w-4 ${
                          sidebarCollapsed && !sidebarHovered ? "" : "mr-2"
                        }`}
                      />
                      {(!sidebarCollapsed || sidebarHovered) && (
                        <>
                          {item.name}
                          <span className="ml-auto text-xs bg-muted text-muted-foreground px-2 py-1 rounded">
                            Soon
                          </span>
                        </>
                      )}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </nav>
          <div className="p-4 border-t border-border flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="w-full justify-center hover:bg-accent hover:text-accent-foreground"
            >
              {sidebarCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div
        className={`transition-all duration-300 ${
          sidebarCollapsed && !sidebarHovered ? "lg:pl-16" : "lg:pl-64"
        }`}
      >
        {/* Top navigation */}
        <div className="sticky top-0 z-40 flex h-16 items-center gap-x-4 border-b border-border bg-card px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-4 w-4" />
          </Button>

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex flex-1 items-center lg:hidden">
              <div className="relative w-full max-w-[140px] h-10">
                <Image
                  src="/dark-logo.svg"
                  alt="Dionix.ai"
                  fill
                  className="block dark:hidden object-contain"
                />
                <Image
                  src="/main-logo.svg"
                  alt="Dionix.ai"
                  fill
                  className="hidden dark:block object-contain"
                />
              </div>
            </div>
            <div className="hidden lg:flex lg:flex-1" />
            <div className="flex flex-1" />
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onNavigate?.("notifications") || router.push("/?view=notifications")}
                className="relative"
                title="Notifications"
              >
                <Bell className="h-5 w-5" />
                {notifCount > 0 && (
                  <span className="absolute -top-1 -right-1 inline-flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] h-4 min-w-4 px-1">
                    {notifCount}
                  </span>
                )}
              </Button>
              <ThemeToggle />
              <DropdownMenu
                open={profileMenuOpen}
                onOpenChange={setProfileMenuOpen}
              >
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-8 w-8 rounded-full"
                    aria-haspopup="menu"
                    aria-expanded={profileMenuOpen}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {user.firstName[0]}
                        {user.lastName[0]}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-56 bg-card border-border"
                  align="end"
                >
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      <p className="font-medium text-foreground">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {user.email}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {user.role}
                      </p>
                    </div>
                  </div>
                  <DropdownMenuItem
                    onClick={onLogout}
                    className="text-foreground hover:bg-accent hover:text-accent-foreground"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="py-6">
          <div className="px-4 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
