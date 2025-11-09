"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Mail, Edit, Trash2, Users, Search, UserPlus, Calendar } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Employee {
  id: string
  email: string
  first_name: string
  last_name: string
  role: string
  status: string
  created_at: string
  department?: string
  position?: string
  last_login?: string
  phone?: string
  hire_date?: string
  employment_type?: string
}

export function EmployeeManagement() {
  const { toast } = useToast()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [newEmployee, setNewEmployee] = useState({
    email: "",
    firstName: "",
    lastName: "",
    role: "employee",
    department: "",
    position: "",
    phone: "",
    hireDate: "",
    employmentType: "full-time",
    password: "",
  })

  useEffect(() => {
    fetchEmployees()
  }, [])

  const fetchEmployees = async () => {
    try {
      setIsLoading(true)
      const res = await fetch("/api/employees", { cache: "no-store", credentials: "same-origin" })
      
      if (!res.ok) {
        const errorData = await res.json()
        console.error("Failed to fetch employees:", errorData)
        return
      }
      const data = await res.json()
      setEmployees(data)
    } catch (error) {
      console.error("Error fetching employees:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateEmployee = async () => {
    try {
      setIsUpdating(true)
      if (editingEmployee) {
        // Update existing employee - send both camelCase and snake_case for compatibility
        const res = await fetch(`/api/employees/${editingEmployee.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            role: newEmployee.role,
            first_name: newEmployee.firstName,
            firstName: newEmployee.firstName, // also send camelCase
            last_name: newEmployee.lastName,
            lastName: newEmployee.lastName, // also send camelCase
            department: newEmployee.department,
            position: newEmployee.position,
            phone: newEmployee.phone,
            hire_date: newEmployee.hireDate || null,
            hireDate: newEmployee.hireDate || null, // also send camelCase
            employment_type: newEmployee.employmentType,
            employmentType: newEmployee.employmentType, // also send camelCase
          }),
          credentials: "same-origin",
        })
        if (!res.ok) {
          const errorData = await res.json()
          throw new Error(errorData.error || "Failed to update employee")
        }
        toast({
          title: "Success",
          description: "Employee updated successfully!",
          variant: "default",
        })
      } else {
        // Create new employee directly
        const res = await fetch("/api/employees", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: newEmployee.email,
            firstName: newEmployee.firstName,
            lastName: newEmployee.lastName,
            role: newEmployee.role,
            department: newEmployee.department,
            position: newEmployee.position,
            phone: newEmployee.phone,
            hireDate: newEmployee.hireDate || null,
            employmentType: newEmployee.employmentType,
            password: newEmployee.password || undefined,
          }),
          credentials: "same-origin",
        })
        if (!res.ok) {
          const errorData = await res.json()
          throw new Error(errorData.error || "Failed to create employee")
        }
        const result = await res.json()
        const successMessage = result.message || "Employee created successfully!"
        
        toast({
          title: "Success",
          description: successMessage + (result.note ? ` ${result.note}` : ''),
          variant: "default",
        })
        
        // Refresh employee list to show newly created employee immediately
        await fetchEmployees()
      }

      setNewEmployee({ 
        email: "", 
        firstName: "", 
        lastName: "", 
        role: "employee", 
        department: "", 
        position: "",
        phone: "",
        hireDate: "",
        employmentType: "full-time",
        password: ""
      })
      setEditingEmployee(null)
      setIsCreateDialogOpen(false)
    } catch (error: any) {
      console.error("Error saving employee:", error.message)
      toast({
        title: "Error",
        description: error.message || "Failed to save employee",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDeleteClick = (employee: Employee) => {
    console.log("Delete clicked for employee:", employee.first_name, employee.last_name)
    setEmployeeToDelete(employee)
    setDeleteConfirmOpen(true)
    console.log("Dialog should be open now")
  }

  const handleDeleteConfirm = async () => {
    if (!employeeToDelete) return
    
    try {
      setDeactivatingId(employeeToDelete.id)
      const res = await fetch(`/api/employees/${employeeToDelete.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
      })
      
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Failed to deactivate employee")
      }
      
      toast({
        title: "Success",
        description: "Employee deactivated successfully!",
        variant: "default",
      })
      fetchEmployees()
    } catch (error: any) {
      console.error("Error deactivating employee:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to deactivate employee",
        variant: "destructive",
      })
    } finally {
      setDeactivatingId(null)
      setDeleteConfirmOpen(false)
      setEmployeeToDelete(null)
    }
  }

  const filteredEmployees = employees.filter(
    (employee) =>
      (employee.first_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (employee.last_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (employee.department || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (employee.position || "").toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const activeEmployees = employees.filter((emp) => emp.status === "active").length
  const newThisMonth = (() => {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    return employees.filter((emp) => {
      const created = emp.created_at ? new Date(emp.created_at) : null
      return !!created && created >= monthStart
    }).length
  })()
  const totalEmployees = employees.length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Employee Management</h1>
          <p className="text-muted-foreground">Create and manage employee accounts</p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="secondary">{activeEmployees} Active</Badge>
          <Badge variant="outline">{totalEmployees} Total</Badge>
          <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
            setIsCreateDialogOpen(open)
            if (!open) {
              setEditingEmployee(null)
              setIsUpdating(false)
              setNewEmployee({ email: "", firstName: "", lastName: "", role: "employee", department: "", position: "", phone: "", hireDate: "", employmentType: "full-time" })
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Add Employee
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl">{editingEmployee ? "Edit Employee" : "Create New Employee"}</DialogTitle>
                <DialogDescription className="text-sm">
                  {editingEmployee 
                    ? "Update employee information and access permissions."
                    : "Add a new employee to the dionix.ai system. They will receive portal access credentials."
                  }
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-sm font-medium">First Name</Label>
                    <Input
                      id="firstName"
                      value={newEmployee.firstName}
                      onChange={(e) => setNewEmployee({ ...newEmployee, firstName: e.target.value })}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-sm font-medium">Last Name</Label>
                    <Input
                      id="lastName"
                      value={newEmployee.lastName}
                      onChange={(e) => setNewEmployee({ ...newEmployee, lastName: e.target.value })}
                      className="h-10"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newEmployee.email}
                    onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
                    disabled={!!editingEmployee}
                    className="h-10"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="department" className="text-sm font-medium">Department</Label>
                    <Select
                      value={newEmployee.department}
                      onValueChange={(value) => setNewEmployee({ ...newEmployee, department: value })}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Engineering">Engineering</SelectItem>
                        <SelectItem value="Design">Design</SelectItem>
                        <SelectItem value="Marketing">Marketing</SelectItem>
                        <SelectItem value="Sales">Sales</SelectItem>
                        <SelectItem value="HR">Human Resources</SelectItem>
                        <SelectItem value="Finance">Finance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role" className="text-sm font-medium">Role</Label>
                    <Select
                      value={newEmployee.role}
                      onValueChange={(value) => setNewEmployee({ ...newEmployee, role: value })}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="employee">Employee</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="position" className="text-sm font-medium">Position</Label>
                  <Input
                    id="position"
                    value={newEmployee.position}
                    onChange={(e) => setNewEmployee({ ...newEmployee, position: e.target.value })}
                    placeholder="e.g. Frontend Developer"
                    className="h-10"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm font-medium">
                      Phone <span className="text-muted-foreground font-normal">(Optional)</span>
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={newEmployee.phone}
                      onChange={(e) => setNewEmployee({ ...newEmployee, phone: e.target.value })}
                      placeholder="+1 (555) 000-0000"
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="employmentType" className="text-sm font-medium">Employment Type</Label>
                    <Select
                      value={newEmployee.employmentType}
                      onValueChange={(value) => setNewEmployee({ ...newEmployee, employmentType: value })}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full-time">Full-Time</SelectItem>
                        <SelectItem value="part-time">Part-Time</SelectItem>
                        <SelectItem value="contract">Contract</SelectItem>
                        <SelectItem value="intern">Intern</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="hireDate" className="text-sm font-medium">
                    Hire Date <span className="text-muted-foreground font-normal">(Optional)</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="hireDate"
                      type="date"
                      value={newEmployee.hireDate}
                      onChange={(e) => setNewEmployee({ ...newEmployee, hireDate: e.target.value })}
                      className="h-10 pr-10"
                      placeholder="mm/dd/yyyy"
                    />
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
                
                {!editingEmployee && (
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium">
                      Password <span className="text-muted-foreground font-normal">(Optional)</span>
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      value={newEmployee.password}
                      onChange={(e) => setNewEmployee({ ...newEmployee, password: e.target.value })}
                      placeholder="Leave empty to auto-generate"
                      className="h-10"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Leave empty to auto-generate a secure password. The employee can log in immediately with this password.
                    </p>
                  </div>
                )}
                
                <div className="pt-4 border-t">
                  <Button onClick={handleCreateEmployee} className="w-full h-11" disabled={isUpdating}>
                    {isUpdating ? (
                      <span className="flex items-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        {editingEmployee ? "Updating Employee..." : "Creating Employee..."}
                      </span>
                    ) : (
                      editingEmployee ? "Update Employee" : "Create Employee"
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search employees..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Employees ({filteredEmployees.length})
          </CardTitle>
          <CardDescription>Manage employee accounts and access</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                // Loading skeleton rows
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={`skeleton-${index}`}>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-28" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-8 w-8" />
                        <Skeleton className="h-8 w-8" />
                        <Skeleton className="h-8 w-8" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                filteredEmployees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium">
                      {employee.first_name} {employee.last_name}
                    </TableCell>
                    <TableCell>{employee.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{employee.department}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{employee.position}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">
                        {employee.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={employee.status === "active" ? "default" : "secondary"}>{employee.status}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {employee.last_login ? new Date(employee.last_login).toLocaleDateString() : "Never"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" title="Send Email">
                          <Mail className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" title="Edit Employee" onClick={() => {
                          setEditingEmployee(employee)
                          setIsCreateDialogOpen(true)
                          // Format hire_date for date input (YYYY-MM-DD)
                          const hireDateFormatted = employee.hire_date 
                            ? new Date(employee.hire_date).toISOString().split('T')[0]
                            : ""
                          setNewEmployee({
                            email: employee.email,
                            firstName: employee.first_name || "",
                            lastName: employee.last_name || "",
                            role: (employee.role as any) || "employee",
                            department: employee.department || "",
                            position: employee.position || "",
                            phone: employee.phone || "",
                            hireDate: hireDateFormatted,
                            employmentType: employee.employment_type || "full-time",
                            password: "" // Don't populate password for editing
                          })
                        }}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          title="Deactivate" 
                          disabled={deactivatingId === employee.id}
                          onClick={() => handleDeleteClick(employee)}
                        >
                          {deactivatingId === employee.id ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-32" />
              </>
            ) : (
              <>
                <div className="text-2xl font-bold">{totalEmployees}</div>
                <p className="text-xs text-muted-foreground">Across all departments</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Active Employees</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-24" />
              </>
            ) : (
              <>
                <div className="text-2xl font-bold">{activeEmployees}</div>
                <p className="text-xs text-muted-foreground">Currently active</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Departments</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <>
                <Skeleton className="h-8 w-8 mb-2" />
                <Skeleton className="h-3 w-28" />
              </>
            ) : (
              <>
                <div className="text-2xl font-bold">{new Set(employees.map((emp) => emp.department)).size}</div>
                <p className="text-xs text-muted-foreground">Active departments</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">New This Month</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <>
                <Skeleton className="h-8 w-8 mb-2" />
                <Skeleton className="h-3 w-20" />
              </>
            ) : (
              <>
                <div className="text-2xl font-bold">{newThisMonth}</div>
                <p className="text-xs text-muted-foreground">Recent hires</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Employee</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate{" "}
              <strong>
                {employeeToDelete?.first_name} {employeeToDelete?.last_name}
              </strong>? 
              This action will remove their access to the portal. This action can be undone by reactivating the employee.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Deactivate Employee
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
