"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Building2, Plus, Search, Calendar, DollarSign } from "lucide-react"

export function ClientManagement() {
  const [searchTerm, setSearchTerm] = useState("")
  const [isAddingClient, setIsAddingClient] = useState(false)

  // Mock client data
  const clients = [
    {
      id: 1,
      name: "TechCorp Solutions",
      contact: "John Smith",
      email: "john@techcorp.com",
      phone: "+1 (555) 123-4567",
      status: "Active",
      projects: 3,
      revenue: "$125,000",
      lastContact: "2024-01-15",
      address: "123 Tech Street, Silicon Valley, CA",
    },
    {
      id: 2,
      name: "Digital Innovations Ltd",
      contact: "Sarah Johnson",
      email: "sarah@digitalinnovations.com",
      phone: "+1 (555) 987-6543",
      status: "Active",
      projects: 2,
      revenue: "$89,500",
      lastContact: "2024-01-12",
      address: "456 Innovation Ave, New York, NY",
    },
    {
      id: 3,
      name: "StartupXYZ",
      contact: "Mike Chen",
      email: "mike@startupxyz.com",
      phone: "+1 (555) 456-7890",
      status: "Prospect",
      projects: 0,
      revenue: "$0",
      lastContact: "2024-01-10",
      address: "789 Startup Blvd, Austin, TX",
    },
  ]

  const filteredClients = clients.filter(
    (client) =>
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.contact.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Client Management</h1>
          <p className="text-muted-foreground">Manage your client relationships and business opportunities</p>
        </div>
        <Dialog open={isAddingClient} onOpenChange={setIsAddingClient}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Client
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Client</DialogTitle>
              <DialogDescription>Create a new client profile</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="clientName">Company Name</Label>
                <Input id="clientName" placeholder="Enter company name" />
              </div>
              <div>
                <Label htmlFor="contactName">Contact Person</Label>
                <Input id="contactName" placeholder="Enter contact name" />
              </div>
              <div>
                <Label htmlFor="clientEmail">Email</Label>
                <Input id="clientEmail" type="email" placeholder="Enter email" />
              </div>
              <div>
                <Label htmlFor="clientPhone">Phone</Label>
                <Input id="clientPhone" placeholder="Enter phone number" />
              </div>
              <div>
                <Label htmlFor="clientStatus">Status</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="prospect">Prospect</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={() => setIsAddingClient(false)}>
                Add Client
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="active">Active Clients</TabsTrigger>
          <TabsTrigger value="prospects">Prospects</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">24</div>
                <p className="text-xs text-muted-foreground">+2 from last month</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">18</div>
                <p className="text-xs text-muted-foreground">+5 from last month</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$425,000</div>
                <p className="text-xs text-muted-foreground">+12% from last month</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">New Prospects</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">8</div>
                <p className="text-xs text-muted-foreground">+3 from last week</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search clients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Projects</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Last Contact</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients
                  .filter((client) => client.status === "Active")
                  .map((client) => (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">{client.name}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{client.contact}</div>
                          <div className="text-sm text-muted-foreground">{client.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="default">{client.status}</Badge>
                      </TableCell>
                      <TableCell>{client.projects}</TableCell>
                      <TableCell>{client.revenue}</TableCell>
                      <TableCell>{client.lastContact}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="prospects" className="space-y-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Contact</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients
                  .filter((client) => client.status === "Prospect")
                  .map((client) => (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">{client.name}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{client.contact}</div>
                          <div className="text-sm text-muted-foreground">{client.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{client.status}</Badge>
                      </TableCell>
                      <TableCell>{client.lastContact}</TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm">
                          Convert to Client
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
