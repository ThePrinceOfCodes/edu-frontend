"use client"

import Link from "next/link"
import { FormEvent, useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { request } from "@/services/http"

type IntentResponse = {
  ok?: boolean
  message?: string
}

export default function RequestAccessPage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [company, setCompany] = useState("")
  const [message, setMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSuccessMessage(null)
    setIsSubmitting(true)

    try {
      const response = await request<IntentResponse>("/api/auth/client-intent", {
        method: "POST",
        body: {
          name,
          email,
          company,
          message,
        },
      })

      setSuccessMessage(
        response.message ?? "Your request has been submitted. Sales will pick it up from here."
      )
      setName("")
      setEmail("")
      setCompany("")
      setMessage("")
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to submit your request. Please try again."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden p-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,theme(colors.primary/.12),transparent_45%)]" />
      <Card className="relative w-full max-w-md border-border/60 shadow-sm">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="text-2xl">Request access</CardTitle>
          <p className="text-sm text-muted-foreground">
            We do not offer self-signup. Share your intent and our sales team will contact you.
          </p>
        </CardHeader>
        <CardContent>
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Jane Doe"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Company (optional)</Label>
              <Input
                id="company"
                type="text"
                placeholder="Your school or organization"
                value={company}
                onChange={(event) => setCompany(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="intent-message">Intent</Label>
              <textarea
                id="intent-message"
                className="flex min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-hidden focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Tell us what you need and your timeline."
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                required
              />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            {successMessage ? <p className="text-sm text-emerald-600">{successMessage}</p> : null}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit intent"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/auth/sign-in" className="text-foreground underline">
                Sign in
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}