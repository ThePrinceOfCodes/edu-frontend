"use client"

import { useEffect, useState } from "react"

import type { Class } from "@/interfaces/resource-interface"
import { resourceService } from "@/services/resource-service"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function ClassesPage() {
  const [classes, setClasses] = useState<Class[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  async function loadClasses() {
    setLoadError(null)
    setLoading(true)
    try {
      const result = await resourceService.getClasses({ limit: 100, page: 1 })
      setClasses(result.results)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Unable to load classes.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadClasses()
  }, [])

  const uniqueSchoolTypes = [...new Set(classes.map((c) => c.schoolTypeId))]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Classes</h2>
      </div>

      <div className="border-b">
        <button className="border-b-2 border-primary px-1 py-2 text-sm font-medium text-foreground">
          Statistics
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{classes.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">School Types Covered</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{uniqueSchoolTypes.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Unique Codes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{new Set(classes.map((c) => c.code)).size}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Classes Table</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loadError ? <p className="text-sm text-destructive">{loadError}</p> : null}
          {loading ? <p className="text-sm text-muted-foreground">Loading...</p> : null}
          {!loading && classes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No classes found.</p>
          ) : null}
          {!loading && classes.length > 0 ? (
            <div className="overflow-x-auto rounded-md border">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-muted/40 text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Name</th>
                    <th className="px-3 py-2 font-medium">Code</th>
                    <th className="px-3 py-2 font-medium">School Type ID</th>
                    <th className="px-3 py-2 font-medium">ID</th>
                  </tr>
                </thead>
                <tbody>
                  {classes.map((item) => (
                    <tr key={item._id ?? item.id ?? `${item.code}-${item.schoolTypeId}`} className="border-t">
                      <td className="px-3 py-2">{item.name}</td>
                      <td className="px-3 py-2 font-mono">{item.code}</td>
                      <td className="px-3 py-2 text-muted-foreground">{item.schoolTypeId}</td>
                      <td className="px-3 py-2 text-muted-foreground">{item._id ?? item.id ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
