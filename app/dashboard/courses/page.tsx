import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function CoursesPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Courses</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        Create and maintain course content here.
      </CardContent>
    </Card>
  )
}
