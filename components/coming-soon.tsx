import { Construction } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface ComingSoonProps {
  title: string
  description?: string
}

export function ComingSoon({ title, description }: ComingSoonProps) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Construction className="h-8 w-8 text-muted-foreground" />
          </div>
          <CardTitle className="text-2xl">{title}</CardTitle>
          <CardDescription>
            {description || "This feature is currently under development and will be available soon."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            We're working hard to bring you this feature. Stay tuned for updates!
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
