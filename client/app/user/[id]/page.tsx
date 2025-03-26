import { Suspense } from "react"
import ProfileForm from "@/components/profile-form"

export default function UserProfilePage() {
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-3">User Profile</h1>
      <Suspense fallback={<div>Loading...</div>}>
        <ProfileForm />
      </Suspense>
    </div>
  )
}

