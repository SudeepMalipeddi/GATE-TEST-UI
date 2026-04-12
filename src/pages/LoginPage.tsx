import { useState } from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { BookOpen, Lock, User } from 'lucide-react'

interface Props {
  onLogin: (username: string) => void
}

export function LoginPage({ onLogin }: Props) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (username.trim()) onLogin(username.trim())
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-primary rounded-2xl shadow-lg mb-2">
            <BookOpen className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Assessment Examination Center</h1>
          <p className="text-sm text-muted-foreground">Sign in to access your examination</p>
        </div>

        {/* Login card */}
        <Card className="shadow-lg border-0 ring-1 ring-slate-200">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Candidate Login</CardTitle>
            <CardDescription className="text-xs">
              Enter your credentials provided by the examination authority
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="username" className="text-xs font-medium">
                  Username / Roll Number
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="username"
                    placeholder="e.g. GATE2024001"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    className="pl-9 text-sm"
                    autoComplete="username"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="pl-9 text-sm"
                    autoComplete="current-password"
                  />
                </div>
              </div>
            </CardContent>

            <CardFooter className="pt-2">
              <Button type="submit" className="w-full" disabled={!username.trim()}>
                Sign In to Examination Portal
              </Button>
            </CardFooter>
          </form>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          For technical issues, contact the exam helpdesk
        </p>
      </div>
    </div>
  )
}
