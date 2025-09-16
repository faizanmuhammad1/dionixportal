"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { getProjects, type Project } from "@/lib/project-store"

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [search, setSearch] = useState("")

  useEffect(() => {
    setProjects(getProjects())
  }, [])

  const filtered = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.client.toLowerCase().includes(search.toLowerCase()) ||
      (p.description || "").toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="space-y-6 max-w-6xl mx-auto px-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-muted-foreground">Browse and open project details</p>
        </div>
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search projects..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
        </div>
      </div>

      <div className="grid gap-4">
        {filtered.map((project) => (
          <Link key={project.id} href={`/projects/${project.id}`} className="block">
            <Card>
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-lg font-semibold">{project.name}</h3>
                    <p className="text-sm text-muted-foreground">{project.client}</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="secondary">{project.status}</Badge>
                    <Badge variant="outline">{project.priority}</Badge>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{project.description}</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="text-sm">Members: {project.assigned_employees.length}</div>
                  <div className="text-sm">Tasks: {project.tasks.length}</div>
                  <div className="text-sm">Budget: ${project.budget.toLocaleString()}</div>
                  <div className="text-sm">Progress: {project.progress}%</div>
                </div>
                <div className="mt-2"><Progress value={project.progress} /></div>
              </CardContent>
            </Card>
          </Link>
        ))}
        {filtered.length === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>No projects found</CardTitle>
            </CardHeader>
          </Card>
        )}
      </div>
    </div>
  )
}


