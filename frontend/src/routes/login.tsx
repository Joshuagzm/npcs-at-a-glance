import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useAuth } from '@/components/auth-provider'
import { useAppForm } from '@/components/form/app-form'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

type Mode = 'login' | 'register'

// Register enforces a minimum password length; login only requires a non-empty
// password (existing accounts may pre-date the rule), so the schema depends on
// the current mode.
const loginFormSchema = (mode: Mode) =>
  z.object({
    userName: z.string().refine((v) => v.trim().length >= 3, {
      message: 'Username must be at least 3 characters',
    }),
    password:
      mode === 'register'
        ? z.string().min(8, 'Password must be at least 8 characters')
        : z.string().min(1, 'Password is required'),
  })

function LoginPage() {
  const { login, register } = useAuth()
  const navigate = useNavigate()

  const [mode, setMode] = useState<Mode>('login')
  const [error, setError] = useState<string | null>(null)

  const schema = loginFormSchema(mode)

  const form = useAppForm({
    defaultValues: { userName: '', password: '' },
    validators: { onMount: schema, onChange: schema },
    onSubmit: async ({ value }) => {
      setError(null)
      try {
        if (mode === 'login') {
          await login(value.userName, value.password)
        } else {
          await register(value.userName, value.password)
        }
        await navigate({ to: '/' })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong.')
      }
    },
  })

  const switchMode = (next: Mode) => {
    if (next === mode) return
    setMode(next)
    setError(null)
    // The password rule differs between modes, so re-check validity against the
    // new schema rather than waiting for the next keystroke.
    form.validateAllFields('change')
  }

  return (
    <div className="flex justify-center pt-12">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>
            {mode === 'login' ? 'Sign in' : 'Create an account'}
          </CardTitle>
          <CardDescription>
            {mode === 'login'
              ? 'Sign in to manage your NPCs.'
              : 'Register a new account to get started.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={mode === 'login' ? 'default' : 'outline'}
              onClick={() => switchMode('login')}
            >
              Sign in
            </Button>
            <Button
              type="button"
              variant={mode === 'register' ? 'default' : 'outline'}
              onClick={() => switchMode('register')}
            >
              Register
            </Button>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              form.handleSubmit()
            }}
            className="space-y-4"
          >
            <form.AppField name="userName">
              {(field) => (
                <field.TextField
                  label="Username"
                  required
                  autoComplete="username"
                />
              )}
            </form.AppField>

            <form.AppField name="password">
              {(field) => (
                <field.TextField
                  label="Password"
                  type="password"
                  required
                  autoComplete={
                    mode === 'login' ? 'current-password' : 'new-password'
                  }
                />
              )}
            </form.AppField>

            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}

            <form.AppForm>
              <form.SubmitButton
                label={mode === 'login' ? 'Sign in' : 'Create account'}
                pendingLabel="Please wait…"
                className="w-full"
              />
            </form.AppForm>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
