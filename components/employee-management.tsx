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
import { Mail, Edit, Trash2, Users, Search, UserPlus } from "lucide-react"

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
}

export function EmployeeManagement() {
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
    password: "",
    department: "",
    position: "",
  })

  useEffect(() => {
    fetchEmployees()
  }, [])

  const fetchEmployees = async () => {
    try {
      setIsLoading(true)
      const res = await fetch("/api/employees", { cache: "no-store" })
      
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
        // Update existing employee
        const res = await fetch(`/api/employees/${editingEmployee.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            role: newEmployee.role,
            first_name: newEmployee.firstName,
            last_name: newEmployee.lastName,
            department: newEmployee.department,
            position: newEmployee.position,
          }),
        })
        if (!res.ok) throw new Error((await res.json()).error || "Failed")
      } else {
        // Create new employee
        const res = await fetch("/api/employees", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: newEmployee.email,
            password: newEmployee.password,
            firstName: newEmployee.firstName,
            lastName: newEmployee.lastName,
            role: newEmployee.role,
            department: newEmployee.department,
            position: newEmployee.position,
          }),
        })
        if (!res.ok) throw new Error((await res.json()).error || "Failed")
      }

      setNewEmployee({ email: "", firstName: "", lastName: "", role: "employee", password: "", department: "", position: "" })
      setEditingEmployee(null)
      setIsCreateDialogOpen(false)
      fetchEmployees()
    } catch (error: any) {
      console.error("Error saving employee:", error.message)
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
      await fetch(`/api/employees/${employeeToDelete.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "inactive" }),
      })
      fetchEmployees()
    } catch (error) {
      console.error("Error deactivating employee:", error)
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
          <p className="text-muted-foreground">Manage employee accounts and access across dionix.ai</p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="secondary">{activeEmployees} Active</Badge>
          <Badge variant="outline">{totalEmployees} Total</Badge>
          <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
            setIsCreateDialogOpen(open)
            if (!open) {
              setEditingEmployee(null)
              setIsUpdating(false)
              setNewEmployee({ email: "", firstName: "", lastName: "", role: "employee", password: "", department: "", position: "" })
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Add Employee
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingEmployee ? "Edit Employee" : "Create New Employee"}</DialogTitle>
                <DialogDescription>
                  {editingEmployee 
                    ? "Update employee information and access permissions."
                    : "Add a new employee to the dionix.ai system. They will receive portal access credentials."
                  }
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={newEmployee.firstName}
                      onChange={(e) => setNewEmployee({ ...newEmployee, firstName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={newEmployee.lastName}
                      onChange={(e) => setNewEmployee({ ...newEmployee, lastName: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newEmployee.email}
                    onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
                    disabled={!!editingEmployee}
                  />
                </div>
                {!editingEmployee && (
                  <div className="space-y-2">
                    <Label htmlFor="password">Temporary Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={newEmployee.password}
                      onChange={(e) => setNewEmployee({ ...newEmployee, password: e.target.value })}
                    />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Select
                      value={newEmployee.department}
                      onValueChange={(value) => setNewEmployee({ ...newEmployee, department: value })}
                    >
                      <SelectTrigger>
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
                    <Label htmlFor="role">Role</Label>
                    <Select
                      value={newEmployee.role}
                      onValueChange={(value) => setNewEmployee({ ...newEmployee, role: value })}
                    >
                      <SelectTrigger>
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
                  <Label htmlFor="position">Position</Label>
                  <Input
                    id="position"
                    value={newEmployee.position}
                    onChange={(e) => setNewEmployee({ ...newEmployee, position: e.target.value })}
                    placeholder="e.g. Frontend Developer"
                  />
                </div>
                <Button onClick={handleCreateEmployee} className="w-full" disabled={isUpdating}>
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
            Employee Directory ({filteredEmployees.length})
          </CardTitle>
          <CardDescription>All employees with portal access to dionix.ai systems</CardDescription>
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
                          setNewEmployee({
                            email: employee.email,
                            firstName: employee.first_name || "",
                            lastName: employee.last_name || "",
                            role: (employee.role as any) || "employee",
                            password: "",
                            department: employee.department || "",
                            position: employee.position || "",
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
      {deleteConfirmOpen && <div style={{position: 'fixed', top: 0, left: 0, background: 'red', color: 'white', zIndex: 9999, padding: '10px'}}>DIALOG SHOULD BE OPEN</div>}
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
