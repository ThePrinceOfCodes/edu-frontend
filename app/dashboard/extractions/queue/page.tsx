"use client"

import { useEffect, useState } from "react"
import type { QueueJob, QueueStatus } from "@/interfaces/resource-interface"
import { resourceService } from "@/services/resource-service"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type TabType = "status" | "waiting" | "active" | "failed"

export default function QueueManagementPage() {
  const [status, setStatus] = useState<QueueStatus | null>(null)
  const [jobs, setJobs] = useState<QueueJob[]>([])
  const [activeTab, setActiveTab] = useState<TabType>("status")
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function loadStatus() {
    try {
      const result = await resourceService.getQueueStatus()
      setStatus(result)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load queue status")
    }
  }

  async function loadJobs(type: TabType) {
    if (type === "status") return
    setLoading(true)
    try {
      const result = await resourceService.getQueueJobs(type as "waiting" | "active" | "failed", 0, 50)
      setJobs(result.jobs)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load jobs")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadStatus()
  }, [])

  useEffect(() => {
    void loadJobs(activeTab)
  }, [activeTab])

  async function handlePause() {
    setActionLoading("pause")
    try {
      await resourceService.pauseQueue()
      await loadStatus()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to pause queue")
    } finally {
      setActionLoading(null)
    }
  }

  async function handleResume() {
    setActionLoading("resume")
    try {
      await resourceService.resumeQueue()
      await loadStatus()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to resume queue")
    } finally {
      setActionLoading(null)
    }
  }

  async function handleClean() {
    setActionLoading("clean")
    try {
      await resourceService.cleanQueue()
      await loadStatus()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to clean queue")
    } finally {
      setActionLoading(null)
    }
  }

  async function handleRetryFailed() {
    setActionLoading("retry")
    try {
      await resourceService.retryFailedJobs()
      await loadStatus()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to retry failed jobs")
    } finally {
      setActionLoading(null)
    }
  }

  const tabs: { id: TabType; label: string }[] = [
    { id: "status", label: "Status" },
    { id: "waiting", label: "Waiting" },
    { id: "active", label: "Active" },
    { id: "failed", label: "Failed" },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Queue Management</h2>
        <p className="text-sm text-muted-foreground">Monitor and manage the attendant extraction queue.</p>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? "default" : "outline"}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {activeTab === "status" && status ? (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-4">
            <Button
              onClick={() => void handlePause()}
              disabled={actionLoading !== null || status.paused}
            >
              {actionLoading === "pause" ? "Pausing..." : "Pause Queue"}
            </Button>
            <Button
              variant="outline"
              onClick={() => void handleResume()}
              disabled={actionLoading !== null || !status.paused}
            >
              {actionLoading === "resume" ? "Resuming..." : "Resume Queue"}
            </Button>
            <Button
              variant="outline"
              onClick={() => void handleClean()}
              disabled={actionLoading !== null}
            >
              {actionLoading === "clean" ? "Cleaning..." : "Clean Old Jobs"}
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleRetryFailed()}
              disabled={actionLoading !== null || status.counts.failed === 0}
            >
              {actionLoading === "retry" ? "Retrying..." : `Retry Failed (${status.counts.failed})`}
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Status</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant={status.paused ? "secondary" : "default"}>
                  {status.paused ? "Paused" : "Active"}
                </Badge>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Waiting</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{status.counts.waiting}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Active</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{status.counts.active}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Completed</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{status.counts.completed}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Failed</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold text-destructive">{status.counts.failed}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Delayed</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{status.counts.delayed}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}

      {activeTab !== "status" ? (
        <Card>
          <CardHeader>
            <CardTitle className="capitalize">{activeTab} Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : jobs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No {activeTab} jobs.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Attempts</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Failed Reason</TableHead>
                    <TableHead>Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell className="font-mono text-xs">{job.id}</TableCell>
                      <TableCell>{job.name}</TableCell>
                      <TableCell>{job.attemptsMade}</TableCell>
                      <TableCell>{Math.round(job.progress as number)}%</TableCell>
                      <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                        {job.failedReason || "-"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {job.timestamp ? new Date(job.timestamp).toLocaleString() : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}