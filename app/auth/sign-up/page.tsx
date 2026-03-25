import { redirect } from "next/navigation"

export default function LegacySignUpPage() {
  redirect("/auth/request-access")
}
