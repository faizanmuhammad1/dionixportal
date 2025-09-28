"use client";

import { useState, useEffect } from "react";
import { LoginForm } from "@/components/login-form";
import { DashboardLayout } from "@/components/dashboard-layout";
import { DashboardOverview } from "@/components/dashboard-overview";
import { ClientProjectSubmissions } from "@/components/client-project-submissions";
import { EmployeeManagement } from "@/components/employee-management";
import { EnhancedEmailCenter } from "@/components/enhanced-email-center";
import { AllContacts } from "@/components/all-contacts";
import { ContactSubmissions } from "@/components/contact-submissions";
import { EmployeeDashboard } from "@/components/employee-dashboard";
import { JobManagement } from "@/components/job-management";
import { UnifiedProjectManagement } from "@/components/unified-project-management";
import { EmployeeProjectCenter } from "@/components/employee-project-center";
import { ComingSoon } from "@/components/coming-soon";
import { getCurrentUser, signOut, type User } from "@/lib/auth";
import { useSession } from "@/hooks/use-session";
import { ProtectedRoute } from "@/components/protected-route";

export default function HomePage() {
  const { user, loading, signOut, refreshSession } = useSession();
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [currentView, setCurrentView] = useState<
    | "dashboard"
    | "contact-center"
    | "email-center"
    | "project-center"
    | "team-directory"
    | "career-hub"
    | "activity-log"
    | "support"
    | "time-tracking"
    | "attendance"
    | "clients"
    | "invoicing"
    | "analytics"
    | "documents"
    | "knowledge"
    | "notifications"
    | "data"
    | "my-time"
    | "performance"
    | "my-documents"
    | "employee-support"
    | "client-submissions"
    | "settings"
  >("dashboard");

  const [projects, setProjects] = useState([
    {
      id: "1",
      name: "Website Redesign",
      description: "Complete overhaul of company website",
      status: "active" as const,
      priority: "high" as const,
      start_date: "2024-01-15",
      end_date: "2024-03-15",
      assigned_employees: ["emp1", "emp2"],
      progress: 65,
      budget: 50000,
      client: "TechCorp Inc",
    },
    {
      id: "2",
      name: "Mobile App Development",
      description: "iOS and Android app for customer portal",
      status: "planning" as const,
      priority: "medium" as const,
      start_date: "2024-02-01",
      end_date: "2024-06-01",
      assigned_employees: ["emp3"],
      progress: 15,
      budget: 75000,
      client: "StartupXYZ",
    },
  ]);

  const [tasks, setTasks] = useState([
    {
      id: "1",
      title: "Design Homepage Mockup",
      description: "Create wireframes and mockups for new homepage",
      status: "in-progress" as const,
      priority: "high" as const,
      assigned_to: "emp1",
      project_id: "1",
      due_date: "2024-01-25",
      created_at: "2024-01-15T10:00:00Z",
    },
    {
      id: "2",
      title: "Setup Development Environment",
      description: "Configure development tools and repositories",
      status: "completed" as const,
      priority: "medium" as const,
      assigned_to: "emp2",
      project_id: "2",
      due_date: "2024-01-20",
      created_at: "2024-01-10T09:00:00Z",
      completed_at: "2024-01-18T15:30:00Z",
    },
  ]);

  const [employees] = useState([
    { id: "emp1", name: "John Smith", email: "john@dionix.ai" },
    { id: "emp2", name: "Sarah Johnson", email: "sarah@dionix.ai" },
    { id: "emp3", name: "Mike Chen", email: "mike@dionix.ai" },
  ]);

  const handleCreateProject = (project: any) => {
    const newProject = { ...project, id: Date.now().toString() };
    setProjects([...projects, newProject]);
  };

  const handleUpdateProject = (id: string, updates: any) => {
    setProjects(projects.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  };

  const handleDeleteProject = (id: string) => {
    setProjects(projects.filter((p) => p.id !== id));
    setTasks(tasks.filter((t) => t.project_id !== id));
  };

  const handleViewProject = (project: any) => {
    console.log("[v0] Viewing project:", project);
  };

  const handleCreateTask = (task: any) => {
    const newTask = {
      ...task,
      id: Date.now().toString(),
      created_at: new Date().toISOString(),
    };
    setTasks([...tasks, newTask]);
  };

  const handleUpdateTask = (id: string, updates: any) => {
    setTasks(tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  };

  const handleDeleteTask = (id: string) => {
    setTasks(tasks.filter((t) => t.id !== id));
  };

  const handleSendEmail = (email: any) => {
    console.log("[v0] Sending email:", email);
    // Here you would integrate with your email service
  };

  const handleSaveEmailDraft = (email: any) => {
    console.log("[v0] Saving email draft:", email);
    // Here you would save to your database
  };

  // Authentication is now handled by useSession hook

  const handleLogin = async (loggedInUser: User) => {
    // Refresh session to get updated user data
    await refreshSession();
    // Default employee landing to project center (tasks/projects)
    if (loggedInUser.role === "employee") {
      setCurrentView("project-center");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      // Session will be automatically cleared by useSession hook
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
      setCurrentView("dashboard");
    }
  };

  const handleNavigation = (view: typeof currentView) => {
    setCurrentView(view);
  };

  // Add timeout mechanism to prevent infinite loading
  useEffect(() => {
    if (loading) {
      const timeout = setTimeout(() => {
        setLoadingTimeout(true);
      }, 10000); // Reduced to 10 second timeout

      return () => clearTimeout(timeout);
    } else {
      setLoadingTimeout(false);
    }
  }, [loading]);

  // Add a fallback mechanism to force refresh if loading gets stuck
  useEffect(() => {
    if (loading && !loadingTimeout) {
      const fallbackTimeout = setTimeout(() => {
        console.warn("Loading timeout reached, forcing refresh");
        window.location.reload();
      }, 20000); // 20 second absolute timeout

      return () => clearTimeout(fallbackTimeout);
    }
  }, [loading, loadingTimeout]);

  const handleDashboardNavigation = (section: string) => {
    // Map dashboard sections to view names
    const sectionMap: Record<string, typeof currentView> = {
      "contact-center": "contact-center",
      "email-center": "email-center",
      "project-center": "project-center",
      "team-directory": "team-directory",
      "career-hub": "career-hub",
      "activity-log": "activity-log",
    };

    const mappedView = sectionMap[section] || "dashboard";
    setCurrentView(mappedView);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
          {loadingTimeout && (
            <div className="mt-4">
              <p className="text-sm text-red-600 mb-2">Loading is taking longer than expected</p>
              <button 
                onClick={() => window.location.reload()} 
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Refresh Page
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginForm onLogin={handleLogin} />;
  }

  return (
    <DashboardLayout
      user={user}
      onLogout={handleLogout}
      onNavigate={(v) => handleNavigation(v as any)}
      currentView={currentView}
    >
      {currentView === "dashboard" &&
        (user.role === "admin" ? (
          <DashboardOverview
            user={user}
            onNavigate={handleDashboardNavigation}
          />
        ) : (
          <EmployeeDashboard user={user} />
        ))}

      {/* Admin Views */}
      {currentView === "contact-center" && user.role === "admin" && (
        <AllContacts />
      )}
      {currentView === "email-center" && user.role === "admin" && (
        <EnhancedEmailCenter />
      )}
      {currentView === "project-center" && user.role === "admin" && (
        <UnifiedProjectManagement />
      )}
      {currentView === "client-submissions" && user.role === "admin" && (
        <ClientProjectSubmissions />
      )}
      {currentView === "team-directory" && user.role === "admin" && (
        <EmployeeManagement />
      )}
      {currentView === "career-hub" && user.role === "admin" && (
        <JobManagement />
      )}

      {/* Coming soon components for incomplete features */}
      {currentView === "activity-log" && user.role === "admin" && (
        <ComingSoon title="Activity Log" />
      )}
      {currentView === "support" && user.role === "admin" && (
        <ComingSoon title="Support Center" />
      )}
      {currentView === "time-tracking" && user.role === "admin" && (
        <ComingSoon title="Time Tracker" />
      )}
      {currentView === "attendance" && user.role === "admin" && (
        <ComingSoon title="Attendance Hub" />
      )}
      {currentView === "clients" && user.role === "admin" && (
        <ComingSoon title="Client Portal" />
      )}
      {currentView === "invoicing" && user.role === "admin" && (
        <ComingSoon title="Finance Center" />
      )}
      {currentView === "analytics" && user.role === "admin" && (
        <ComingSoon title="Analytics Hub" />
      )}
      {currentView === "documents" && user.role === "admin" && (
        <ComingSoon title="Document Library" />
      )}
      {currentView === "knowledge" && user.role === "admin" && (
        <ComingSoon title="Knowledge Hub" />
      )}
      {currentView === "notifications" && user.role === "admin" && (
        <ComingSoon title="Notifications" />
      )}
      {currentView === "data" && user.role === "admin" && (
        <ComingSoon title="Data Center" />
      )}

      {/* Employee views */}
      {/* Email center disabled for employees */}
      {currentView === "project-center" && user.role === "employee" && (
        <EmployeeProjectCenter user={user} />
      )}

      {/* Coming soon components for employee features */}
      {currentView === "my-time" && user.role === "employee" && (
        <ComingSoon title="Time Tracker" />
      )}
      {currentView === "performance" && user.role === "employee" && (
        <ComingSoon title="Performance Dashboard" />
      )}
      {currentView === "my-documents" && user.role === "employee" && (
        <ComingSoon title="My Documents" />
      )}
      {currentView === "employee-support" && user.role === "employee" && (
        <ComingSoon title="Help Desk" />
      )}

      {currentView === "settings" && <ComingSoon title="Settings Panel" />}
    </DashboardLayout>
  );
}
