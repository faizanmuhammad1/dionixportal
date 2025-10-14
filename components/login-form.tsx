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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 dark:from-slate-950 dark:via-blue-950 dark:to-slate-900 p-4 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-slate-200 dark:bg-grid-slate-800 opacity-20" style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, rgb(148 163 184 / 0.2) 1px, transparent 0)`,
        backgroundSize: '40px 40px'
      }} />
      
      {/* Animated Gradient Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-400 dark:bg-blue-600 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-20 animate-blob" />
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-purple-400 dark:bg-purple-600 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
      <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-pink-400 dark:bg-pink-600 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-20 animate-blob animation-delay-4000" />
      
      <Card className="w-full max-w-md shadow-2xl relative z-10 animate-scale-in border-2 backdrop-blur-sm bg-card/95">
        <CardHeader className="space-y-3 pb-6">
          {/* Logo */}
          <div className="flex justify-center mb-2">
            <div className="relative w-16 h-16 rounded-xl bg-primary/10 p-3 backdrop-blur-sm">
              <div className="relative w-full h-full">
                <Image
                  src="/images/darklogo.svg"
                  alt="Dionix.ai"
                  fill
                  className="object-contain block dark:hidden"
                />
                <Image
                  src="/images/logo.svg"
                  alt="Dionix.ai"
                  fill
                  className="object-contain hidden dark:block"
                />
              </div>
            </div>
          </div>
          
          <CardTitle className="text-3xl font-bold text-center bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
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
