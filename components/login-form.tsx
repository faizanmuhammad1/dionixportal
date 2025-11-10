"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { signInWithEmail, getCurrentUser, type User } from "@/lib/auth"
import { Eye, EyeOff, Lock, Mail, Loader2, AlertCircle } from "lucide-react"
import Image from "next/image"

const lightModeLogoSrc =
  "https://res.cloudinary.com/dnqyibnud/image/upload/v1758975261/main-logo-dark_zivcxt.png"
const darkModeLogoSrc =
  "https://res.cloudinary.com/dnqyibnud/image/upload/v1758975274/main-logo_sxwdaf.png"

interface LoginFormProps {
  onLogin: (user: User) => void
}

export function LoginForm({ onLogin }: LoginFormProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const authData = await signInWithEmail(email, password)
      if (authData.user) {
        const resolved = await getCurrentUser()
        if (resolved) onLogin(resolved)
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed. Please check your credentials.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <Card className="w-full max-w-md shadow-2xl relative z-10 animate-scale-in border-2 backdrop-blur-sm bg-card/95">
        <CardHeader className="space-y-3 pb-6">
          {/* Logo */}
          <div className="flex justify-center mb-4">
            <div className="relative w-24 h-24">
              <Image
                src={lightModeLogoSrc}
                alt="Dionix.ai"
                width={96}
                height={96}
                className="block dark:hidden object-contain"
              />
              <Image
                src={darkModeLogoSrc}
                alt="Dionix.ai"
                width={96}
                height={96}
                className="hidden dark:block object-contain"
              />
            </div>
          </div>
          
          <CardTitle className="text-3xl font-bold text-center">
            Welcome Back
          </CardTitle>
          <CardDescription className="text-center text-base">
            Sign in to access your dashboard
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Input */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-11 transition-all focus:ring-2 focus:ring-primary/20"
                  required
                  autoComplete="email"
                  disabled={isLoading}
                />
              </div>
            </div>
            
            {/* Password Input */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 h-11 transition-all focus:ring-2 focus:ring-primary/20"
                  required
                  autoComplete="current-password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            
            {/* Error Message */}
            {error && (
              <Alert variant="destructive" className="animate-slide-in-down">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="ml-2">{error}</AlertDescription>
              </Alert>
            )}
            
            {/* Submit Button */}
            <Button 
              type="submit" 
              className="w-full h-11 text-base font-medium shadow-lg hover:shadow-xl transition-all" 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          {/* Help Section */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                Need Help?
              </span>
            </div>
          </div>

          <div className="p-4 bg-muted/50 rounded-lg border border-border/50 backdrop-blur-sm">
            <p className="text-sm text-muted-foreground text-center leading-relaxed">
              Contact your system administrator for access credentials or password reset assistance
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
