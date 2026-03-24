import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function StudentsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Students</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        Manage student records from this section.
      </CardContent>
    </Card>
  )
}
