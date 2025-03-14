import { Suspense } from "react"
import LoginTabs from "@/components/login-tabs"

export default function LoginPage() {
  return (
    <div className="container mx-auto py-10">
      <Suspense fallback={<div>Loading...</div>}>
        <LoginTabs />
      </Suspense>
    </div>
  )
}

