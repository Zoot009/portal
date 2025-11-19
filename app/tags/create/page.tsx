'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

export default function CreateTagPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    tagName: '',
    timeMinutes: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tagName: formData.tagName,
          timeMinutes: parseInt(formData.timeMinutes),
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create tag')
      }
      
      toast.success('Tag created successfully!')
      router.push('/tags')
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Failed to create tag')
      console.error('Error creating tag:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/tags">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Create Tag</h2>
          <p className="text-muted-foreground">
            Add a new tag to your system
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Tag Information</CardTitle>
            <CardDescription>
              Fill in the details for the new tag
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Tag Name */}
            <div className="space-y-2">
              <Label htmlFor="tagName">
                Tag Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="tagName"
                name="tagName"
                placeholder="e.g., Frontend Development"
                value={formData.tagName}
                onChange={handleInputChange}
                required
              />
            </div>

            {/* Time Allocated */}
            <div className="space-y-2">
              <Label htmlFor="timeMinutes">
                Time Allocated (minutes) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="timeMinutes"
                name="timeMinutes"
                type="number"
                placeholder="e.g., 480"
                value={formData.timeMinutes}
                onChange={handleInputChange}
                required
                min="0"
              />
              <p className="text-xs text-muted-foreground">
                {formData.timeMinutes && !isNaN(Number(formData.timeMinutes)) && (
                  <>
                    {Math.floor(Number(formData.timeMinutes) / 60)}h {Number(formData.timeMinutes) % 60}m
                  </>
                )}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={isSubmitting} className="flex-1">
                <Save className="mr-2 h-4 w-4" />
                {isSubmitting ? 'Creating...' : 'Create Tag'}
              </Button>
              <Button type="button" variant="outline" asChild className="flex-1">
                <Link href="/tags">Cancel</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
