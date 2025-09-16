"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Mail, Edit, Trash2, Users, Search, UserPlus } from "lucide-react"
import { createBrowserClient } from "@supabase/ssr"

interface Employee {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  status: string
  createdAt: string
  department?: string
  position?: string
  lastLogin?: string
}

export function EmployeeManagement() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [newEmployee, setNewEmployee] = useState({
    email: "",
    firstName: "",
    lastName: "",
    role: "employee",
    password: "",
    department: "",
    position: "",
  })

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  useEffect(() => {
    fetchEmployees()
  }, [])

  const fetchEmployees = async () => {
    const mockEmployees: Employee[] = [
      {
        id: "1",
        email: "john.doe@dionix.ai",
        firstName: "John",
        lastName: "Doe",
        role: "employee",
        status: "active",
        createdAt: "2024-01-15",
        department: "Engineering",
        position: "Frontend Developer",
        lastLogin: "2024-01-20T10:30:00Z",
      },
      {
        id: "2",
        email: "jane.smith@dionix.ai",
        firstName: "Jane",
        lastName: "Smith",
        role: "manager",
        status: "active",
        createdAt: "2024-01-20",
        department: "Design",
        position: "UI/UX Manager",
        lastLogin: "2024-01-20T09:15:00Z",
      },
      {
        id: "3",
        email: "mike.johnson@dionix.ai",
        firstName: "Mike",
        lastName: "Johnson",
        role: "employee",
        status: "active",
        createdAt: "2024-01-10",
        department: "Engineering",
        position: "Backend Developer",
        lastLogin: "2024-01-19T16:45:00Z",
      },
      {
        id: "4",
        email: "sarah.wilson@dionix.ai",
        firstName: "Sarah",
        lastName: "Wilson",
        role: "employee",
        status: "inactive",
        createdAt: "2024-01-05",
        department: "Marketing",
        position: "Content Specialist",
        lastLogin: "2024-01-18T14:20:00Z",
      },
      {
        id: "5",
        email: "alex.brown@dionix.ai",
        firstName: "Alex",
        lastName: "Brown",
        role: "employee",
        status: "active",
        createdAt: "2024-01-25",
        department: "Sales",
        position: "Account Executive",
        lastLogin: "2024-01-20T11:30:00Z",
      },
    ]
    setEmployees(mockEmployees)
  }

  const handleCreateEmployee = async () => {
    try {
      // Create user in Supabase Auth
      const { data, error } = await supabase.auth.admin.createUser({
        email: newEmployee.email,
        password: newEmployee.password,
        user_metadata: {
          firstName: newEmployee.firstName,
          lastName: newEmployee.lastName,
          role: newEmployee.role,
          department: newEmployee.department,
          position: newEmployee.position,
        },
      })

      if (error) throw error

      // Reset form and close dialog
      setNewEmployee({
        email: "",
        firstName: "",
        lastName: "",
        role: "employee",
        password: "",
        department: "",
        position: "",
      })
      setIsCreateDialogOpen(false)
      fetchEmployees()
    } catch (error: any) {
      console.error("Error creating employee:", error.message)
    }
  }

  const filteredEmployees = employees.filter(
    (employee) =>
      employee.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.position?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const activeEmployees = employees.filter((emp) => emp.status === "active").length
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
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Add Employee
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Employee</DialogTitle>
                <DialogDescription>
                  Add a new employee to the dionix.ai system. They will receive portal access credentials.
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
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Temporary Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={newEmployee.password}
                    onChange={(e) => setNewEmployee({ ...newEmployee, password: e.target.value })}
                  />
                </div>
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
                <Button onClick={handleCreateEmployee} className="w-full">
                  Create Employee
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
              {filteredEmployees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell className="font-medium">
                    {employee.firstName} {employee.lastName}
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
                    {employee.lastLogin ? new Date(employee.lastLogin).toLocaleDateString() : "Never"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" title="Send Email">
                        <Mail className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" title="Edit Employee">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" title="Deactivate">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
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
            <div className="text-2xl font-bold">{totalEmployees}</div>
            <p className="text-xs text-muted-foreground">Across all departments</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Active Employees</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeEmployees}</div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Departments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{new Set(employees.map((emp) => emp.department)).size}</div>
            <p className="text-xs text-muted-foreground">Active departments</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">New This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2</div>
            <p className="text-xs text-muted-foreground">Recent hires</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
