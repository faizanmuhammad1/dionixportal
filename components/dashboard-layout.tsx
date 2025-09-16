"use client"

import type React from "react"
import {
  Mail,
  FolderOpen,
  CheckSquare,
  Briefcase,
  LayoutDashboard,
  MessageSquare,
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
} from "lucide-react"
import Image from "next/image"
import { ThemeToggle } from "@/components/theme-toggle"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import type { User } from "@/lib/auth"

interface DashboardLayoutProps {
  user: User
  children: React.ReactNode
  onLogout: () => void
  onNavigate: (view: string) => void
  currentView: string
}

export function DashboardLayout({ user, children, onLogout, onNavigate, currentView }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [sidebarHovered, setSidebarHovered] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)

  const navigation = [
    // Core Dashboard
    { name: "Overview", href: "dashboard", icon: LayoutDashboard, current: currentView === "dashboard" },

    ...(user.role === "admin"
      ? [
          // Communication Hub
          { name: "Email Center", href: "email-center", icon: Mail, current: currentView === "email-center" },
          {
            name: "Contact Directory",
            href: "contact-center",
            icon: MessageSquare,
            current: currentView === "contact-center",
          },
          {
            name: "Support Center",
            href: "support",
            icon: Headphones,
            current: currentView === "support",
            comingSoon: true,
          },

          // Project Hub
          {
            name: "Project Center",
            href: "project-center",
            icon: FolderOpen,
            current: currentView === "project-center",
          },
          {
            name: "Task Board",
            href: "task-management",
            icon: CheckSquare,
            current: currentView === "task-management",
            comingSoon: true,
          },
          {
            name: "Time Tracker",
            href: "time-tracking",
            icon: Clock,
            current: currentView === "time-tracking",
            comingSoon: true,
          },

          // Team Management
          { name: "Career Portal", href: "career-hub", icon: Briefcase, current: currentView === "career-hub" },
          { name: "Team Directory", href: "team-directory", icon: Users, current: currentView === "team-directory" },
          {
            name: "Attendance Hub",
            href: "attendance",
            icon: UserCheck,
            current: currentView === "attendance",
            comingSoon: true,
          },

          // Business Operations
          {
            name: "Client Portal",
            href: "clients",
            icon: Building2,
            current: currentView === "clients",
            comingSoon: true,
          },
          {
            name: "Finance Center",
            href: "invoicing",
            icon: DollarSign,
            current: currentView === "invoicing",
            comingSoon: true,
          },
          {
            name: "Analytics Hub",
            href: "analytics",
            icon: BarChart3,
            current: currentView === "analytics",
            comingSoon: true,
          },

          // Content Management
          {
            name: "Document Library",
            href: "documents",
            icon: FileText,
            current: currentView === "documents",
            comingSoon: true,
          },
          {
            name: "Knowledge Hub",
            href: "knowledge",
            icon: Archive,
            current: currentView === "knowledge",
            comingSoon: true,
          },

          // System Settings
          {
            name: "Notifications",
            href: "notifications",
            icon: Bell,
            current: currentView === "notifications",
            comingSoon: true,
          },
          { name: "Data Center", href: "data", icon: Database, current: currentView === "data", comingSoon: true },
        ]
      : [
          // Employee Dashboard
          { name: "My Tasks", href: "project-center", icon: CheckSquare, current: currentView === "project-center" },
          { name: "My Projects", href: "project-center", icon: FolderOpen, current: currentView === "project-center" },
          { name: "My Inbox", href: "email-center", icon: Mail, current: currentView === "email-center" },
          { name: "Time Tracker", href: "my-time", icon: Clock, current: currentView === "my-time", comingSoon: true },
          {
            name: "Performance",
            href: "performance",
            icon: Target,
            current: currentView === "performance",
            comingSoon: true,
          },
          {
            name: "My Documents",
            href: "my-documents",
            icon: FileText,
            current: currentView === "my-documents",
            comingSoon: true,
          },
          {
            name: "Help Desk",
            href: "employee-support",
            icon: Headphones,
            current: currentView === "employee-support",
            comingSoon: true,
          },
        ]),

    // Settings (always last)
    { name: "Settings", href: "settings", icon: Settings, current: currentView === "settings", comingSoon: true },
  ]

  const availableNav = navigation.filter((item) => !item.comingSoon)
  const comingSoonNav = navigation.filter((item) => item.comingSoon)

  const handleNavClick = (href: string) => {
    onNavigate(href)
    setSidebarOpen(false) // Close mobile sidebar on navigation
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? "block" : "hidden"}`}>
        <div className="fixed inset-0 bg-black/20 dark:bg-black/50" onClick={() => setSidebarOpen(false)} />
        <div className="fixed left-0 top-0 h-full w-64 bg-card border-r border-border shadow-lg flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="relative w-6 h-6">
                <Image src="/images/logo.svg" alt="Dionix.ai" width={24} height={24} className="block dark:hidden" />
                <Image
                  src="/images/logo.svg"
                  alt="Dionix.ai"
                  width={24}
                  height={24}
                  className="hidden dark:block invert brightness-0 contrast-100"
                />
              </div>
              <span className="text-lg font-semibold text-foreground">dionix.ai</span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(false)}>
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
                <div className="px-2 py-1 text-xs uppercase tracking-wide text-muted-foreground">Coming soon</div>
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
                      <span className="ml-auto text-xs bg-muted text-muted-foreground px-2 py-1 rounded">Soon</span>
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
          <div className="flex items-center h-16 px-4 border-b border-border flex-shrink-0">
            {(!sidebarCollapsed || sidebarHovered) && (
              <div className="flex items-center gap-2">
                <div className="relative w-7 h-7">
                  <Image src="/images/logo.svg" alt="Dionix.ai" width={28} height={28} className="block dark:hidden" />
                  <Image
                    src="/images/logo.svg"
                    alt="Dionix.ai"
                    width={28}
                    height={28}
                    className="hidden dark:block invert brightness-0 contrast-100"
                  />
                </div>
                <span className="text-lg font-semibold text-foreground">dionix.ai</span>
              </div>
            )}
            {sidebarCollapsed && !sidebarHovered && (
              <div className="flex items-center justify-center w-full">
                <div className="relative w-7 h-7">
                  <Image src="/images/logo.svg" alt="Dionix.ai" width={28} height={28} className="block dark:hidden" />
                  <Image
                    src="/images/logo.svg"
                    alt="Dionix.ai"
                    width={28}
                    height={28}
                    className="hidden dark:block invert brightness-0 contrast-100"
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
                  sidebarCollapsed && !sidebarHovered ? "justify-center px-2" : "justify-start"
                } ${
                  item.current
                    ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                    : "text-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
                onClick={() => handleNavClick(item.href)}
                title={sidebarCollapsed && !sidebarHovered ? item.name : undefined}
              >
                <item.icon className={`h-4 w-4 ${sidebarCollapsed && !sidebarHovered ? "" : "mr-2"}`} />
                {(!sidebarCollapsed || sidebarHovered) && item.name}
              </Button>
            ))}
            {comingSoonNav.length > 0 && (
              <div className="mt-4">
                {(!sidebarCollapsed || sidebarHovered) && (
                  <div className="px-2 py-1 text-xs uppercase tracking-wide text-muted-foreground">Coming soon</div>
                )}
                <div className="mt-1 space-y-2">
                  {comingSoonNav.map((item) => (
                    <Button
                      key={item.name}
                      variant="ghost"
                      className={`w-full transition-all duration-200 ${
                        sidebarCollapsed && !sidebarHovered ? "justify-center px-2" : "justify-start"
                      } text-foreground hover:bg-accent hover:text-accent-foreground`}
                      onClick={() => {}}
                      disabled
                      title={sidebarCollapsed && !sidebarHovered ? item.name : "Coming soon"}
                    >
                      <item.icon className={`h-4 w-4 ${sidebarCollapsed && !sidebarHovered ? "" : "mr-2"}`} />
                      {(!sidebarCollapsed || sidebarHovered) && (
                        <>
                          {item.name}
                          <span className="ml-auto text-xs bg-muted text-muted-foreground px-2 py-1 rounded">Soon</span>
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
              {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className={`transition-all duration-300 ${sidebarCollapsed && !sidebarHovered ? "lg:pl-16" : "lg:pl-64"}`}>
        {/* Top navigation */}
        <div className="sticky top-0 z-40 flex h-16 items-center gap-x-4 border-b border-border bg-card px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-4 w-4" />
          </Button>

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex flex-1 items-center lg:hidden">
              <div className="flex items-center gap-2">
                <div className="relative w-6 h-6">
                  <Image src="/images/logo.svg" alt="Dionix.ai" width={24} height={24} className="block dark:hidden" />
                  <Image
                    src="/images/logo.svg"
                    alt="Dionix.ai"
                    width={24}
                    height={24}
                    className="hidden dark:block invert brightness-0 contrast-100"
                  />
                </div>
                <span className="text-lg font-semibold text-foreground">dionix.ai</span>
              </div>
            </div>
            <div className="hidden lg:flex lg:flex-1" />
            <div className="flex flex-1" />
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              <ThemeToggle />
              <DropdownMenu open={profileMenuOpen} onOpenChange={setProfileMenuOpen}>
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
                <DropdownMenuContent className="w-56 bg-card border-border" align="end">
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      <p className="font-medium text-foreground">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                      <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
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
  )
}
