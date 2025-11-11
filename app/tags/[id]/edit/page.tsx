'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

// Mock data for demonstration
const mockTags = [
  {
    id: 1,
    tagName: "Frontend Development",
    timeMinutes: 480,
    category: "Development",
    isActive: true,
    createdAt: "2024-01-15",
    assignmentCount: 15,
    logCount: 145
  },
  {
    id: 2,
    tagName: "Backend API",
    timeMinutes: 360,
    category: "Development",
    isActive: true,
    createdAt: "2024-01-20",
    assignmentCount: 12,
    logCount: 98
  },
]

export default function EditTagPage() {
  const router = useRouter()
  const params = useParams()
  const tagId = params?.id
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [formData, setFormData] = useState({
    tagName: '',
    timeMinutes: '',
    isActive: true,
  })

  useEffect(() => {
    // Simulate fetching tag data
    const fetchTag = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 500))
        const tag = mockTags.find(t => t.id === Number(tagId))
        
        if (tag) {
          setFormData({
            tagName: tag.tagName,
            timeMinutes: tag.timeMinutes.toString(),
            isActive: tag.isActive,
          })
        }
      } catch (error) {
        toast.error('Failed to load tag')
      } finally {
        setIsLoading(false)
      }
    }

    fetchTag()
  }, [tagId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      toast.success('Tag updated successfully!')
      router.push('/tags')
    } catch (error) {
      toast.error('Failed to update tag')
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Loading...</div>
      </div>
    )
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
          <h2 className="text-3xl font-bold tracking-tight">Edit Tag</h2>
          <p className="text-muted-foreground">
            Update tag information
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Tag Information</CardTitle>
            <CardDescription>
              Update the details for this tag
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

            {/* Active Status */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="isActive">Active Status</Label>
                <p className="text-sm text-muted-foreground">
                  Set whether this tag is active or inactive
                </p>
              </div>
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => 
                  setFormData(prev => ({ ...prev, isActive: checked }))
                }
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={isSubmitting} className="flex-1">
                <Save className="mr-2 h-4 w-4" />
                {isSubmitting ? 'Updating...' : 'Update Tag'}
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
