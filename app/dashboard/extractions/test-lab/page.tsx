"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

function formatResult(value: unknown) {
  return JSON.stringify(value ?? {}, null, 2)
}

export default function ExtractionTestLabPage() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<any>(null)

  async function runTest(path: string) {
    if (!file) return
    setLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.set("image", file)

      const response = await fetch(path, { method: "POST", body: formData })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload?.message || "Test failed")
      setResult(payload)
    } catch (testError) {
      setError(testError instanceof Error ? testError.message : "Unable to run test")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Extraction Test Lab</h2>
        <p className="text-sm text-muted-foreground">Run backend OCR and Pi tests from the admin console.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Upload</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Input type="file" accept="image/*,.pdf" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
          <div className="flex gap-2">
            <Button type="button" onClick={() => void runTest("/api/attendant-extractions/test/document-ai")} disabled={!file || loading}>
              Run Document AI
            </Button>
            <Button type="button" variant="outline" onClick={() => void runTest("/api/attendant-extractions/test/pi")} disabled={!file || loading}>
              Run Pi
            </Button>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </CardContent>
      </Card>

      {result ? (
        <Card>
          <CardHeader><CardTitle>Result</CardTitle></CardHeader>
          <CardContent>
            <pre className="overflow-auto rounded-md border bg-muted p-3 text-xs">{formatResult(result)}</pre>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
