"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function MyTagsPage() {
  const router = useRouter()
  
  useEffect(() => {
    router.push("/employee-panel/my-tags/submit")
  }, [router])

  return null
}
