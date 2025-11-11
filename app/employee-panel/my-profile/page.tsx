"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Upload, FileText, Download, X } from "lucide-react"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { useUser } from "@clerk/nextjs"
import { useQuery, useMutation } from "@tanstack/react-query"
import { createSupabaseClient } from "@/lib/supabase"

const supabase = createSupabaseClient()

export default function MyProfilePage() {
  const { user } = useUser()
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null)
  const [profilePhotoBlobUrl, setProfilePhotoBlobUrl] = useState<string>("")
  const [loadedPhotoUrl, setLoadedPhotoUrl] = useState<string>("")

  // Profile data
  const [profileData, setProfileData] = useState({
    fullName: user?.fullName || "",
    email: user?.primaryEmailAddress?.emailAddress || "",
    phone: "",
    dateOfBirth: "",
    education: "",
    motherName: "",
    address: ""
  })

  // Validation errors
  const [validationErrors, setValidationErrors] = useState({
    phone: '',
    education: '',
    motherName: '',
    address: ''
  })

  // Documents
  const [documents, setDocuments] = useState<Record<string, File | null>>({
    aadharCard: null,
    panCard: null,
    sscMarksheet: null,
    hscMarksheet: null,
    finalYearMarksheet: null
  })

  // Load profile data
  const { data: existingData } = useQuery({
    queryKey: ['profile-documents'],
    queryFn: async () => {
      const res = await fetch('/api/profile/documents')
      if (!res.ok) throw new Error('Failed to fetch profile')
      return res.json()
    }
  })

  useEffect(() => {
    if (existingData?.profileData) {
      setProfileData(prev => ({
        ...prev,
        fullName: existingData.profileData.name || user?.fullName || prev.fullName,
        email: existingData.profileData.email || user?.primaryEmailAddress?.emailAddress || prev.email,
        phone: existingData.profileData.phone || "",
        dateOfBirth: existingData.profileData.dateOfBirth 
          ? new Date(existingData.profileData.dateOfBirth).toISOString().split('T')[0]
          : "",
        education: existingData.profileData.education || "",
        motherName: existingData.profileData.motherName || "",
        address: existingData.profileData.address || ""
      }))
    }
  }, [existingData, user])

  // Validation functions
  const validatePhone = (phone: string): string => {
    if (!phone) return ''
    if (phone.length !== 10) return 'Phone number must be exactly 10 digits'
    if (!/^\d{10}$/.test(phone)) return 'Phone number must contain only digits'
    return ''
  }

  const validateEducation = (education: string): string => {
    if (!education) return ''
    if (education.length > 20) return 'Maximum 20 characters allowed'
    if (!/^[a-zA-Z\s.,\-]*$/.test(education)) return 'Only letters, spaces, dots, commas, and hyphens allowed'
    return ''
  }

  const validateMotherName = (motherName: string): string => {
    if (!motherName) return ''
    if (motherName.length > 50) return 'Maximum 50 characters allowed'
    if (!/^[a-zA-Z\s]*$/.test(motherName)) return 'Only letters and spaces allowed'
    return ''
  }

  const validateAddress = (address: string): string => {
    if (!address) return ''
    if (address.length > 100) return 'Maximum 100 characters allowed'
    return ''
  }

  // Load profile photo
  useEffect(() => {
    if (existingData?.documents?.passportPhoto) {
      loadProfilePhoto(existingData.documents.passportPhoto)
    }
  }, [existingData])

  const loadProfilePhoto = async (filePath: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('employee-documents')
        .createSignedUrl(filePath, 3600)

      if (error) throw error
      if (data?.signedUrl) {
        setLoadedPhotoUrl(data.signedUrl)
      }
    } catch (error) {
      console.error('Error loading photo:', error)
    }
  }

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type - only allow JPEG, JPG, and PNG
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png']
      if (!allowedTypes.includes(file.type.toLowerCase())) {
        toast.error('Only JPEG, JPG, and PNG images are allowed')
        return
      }
      
      setProfilePhoto(file)
      const blobUrl = URL.createObjectURL(file)
      setProfilePhotoBlobUrl(blobUrl)
      toast.success('Photo selected. Click "Save Profile" to upload.')
    }
  }

  const removePhoto = () => {
    setProfilePhoto(null)
    setProfilePhotoBlobUrl("")
    if (profilePhotoBlobUrl) {
      URL.revokeObjectURL(profilePhotoBlobUrl)
    }
  }

  const handleDocumentUpload = async (file: File, type: string) => {
    const userId = user?.id
    if (!userId) return null

    // Validate file type - only allow PDF, JPEG, JPG, and PNG
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      toast.error('Only PDF, JPEG, JPG, and PNG files are allowed')
      throw new Error('Invalid file type')
    }
    
    // Validate file size - max 20MB
    const maxSize = 20 * 1024 * 1024 // 20MB in bytes
    if (file.size > maxSize) {
      toast.error('File size must be less than 20MB')
      throw new Error('File too large')
    }

    const filePath = `${userId}/${type}-${Date.now()}-${file.name}`
    const { error } = await supabase.storage
      .from('employee-documents')
      .upload(filePath, file)

    if (error) throw error
    return filePath
  }

  const saveProfileMutation = useMutation({
    mutationFn: async () => {
      const userId = user?.id
      if (!userId) throw new Error('No user ID')

      let photoPath = existingData?.documents?.passportPhoto || null

      // Upload profile photo if new one selected
      if (profilePhoto) {
        photoPath = await handleDocumentUpload(profilePhoto, 'profile-photo')
      }

      // Upload documents
      const documentPaths: Record<string, string | null> = {}
      for (const [type, file] of Object.entries(documents)) {
        if (file) {
          documentPaths[type] = await handleDocumentUpload(file, type)
        }
      }

      // Save to database
      const response = await fetch('/api/profile/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          profileData,
          documents: {
            passportPhoto: photoPath,
            ...documentPaths
          }
        })
      })

      if (!response.ok) throw new Error('Failed to save profile')
      return response.json()
    },
    onSuccess: () => {
      toast.success('Profile updated successfully!')
      setDocuments({
        aadharCard: null,
        panCard: null,
        sscMarksheet: null,
        hscMarksheet: null,
        finalYearMarksheet: null
      })
      setProfilePhoto(null)
      setProfilePhotoBlobUrl("")
    },
    onError: (error) => {
      toast.error(`Failed to update profile: ${error.message}`)
    }
  })

  const handleSaveProfile = () => {
    saveProfileMutation.mutate()
  }

  const handleDocumentChange = (type: string, file: File | null) => {
    if (file) {
      // Validate file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
      if (!allowedTypes.includes(file.type.toLowerCase())) {
        toast.error('Only PDF, JPEG, JPG, and PNG files are allowed')
        return
      }
      
      // Validate file size - max 20MB
      const maxSize = 20 * 1024 * 1024 // 20MB in bytes
      if (file.size > maxSize) {
        toast.error('File size must be less than 20MB')
        return
      }
    }
    
    setDocuments(prev => ({ ...prev, [type]: file }))
  }

  const previewDocument = async (filePath: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('employee-documents')
        .createSignedUrl(filePath, 60)

      if (error) throw error
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank')
      }
    } catch (error) {
      toast.error('Failed to preview document')
    }
  }

  const deleteDocument = async (type: string) => {
    try {
      const userId = user?.id
      if (!userId) return

      // Get the existing document path to delete from Supabase
      const existingPath = existingData?.documents?.[type]
      
      // Delete from Supabase bucket if exists
      if (existingPath && typeof existingPath === 'string') {
        console.log('Deleting from Supabase bucket:', existingPath)
        const { error: deleteError } = await supabase.storage
          .from('employee-documents')
          .remove([existingPath])
        
        if (deleteError) {
          console.error('Error deleting from bucket:', deleteError)
          // Continue even if bucket deletion fails
        }
      }

      // Update database to remove the document reference
      await fetch('/api/profile/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documents: {
            [type]: null
          }
        })
      })

      toast.success('Document deleted successfully')
      
      // Refetch data to update UI
      window.location.reload()
    } catch (error) {
      console.error('Error deleting document:', error)
      toast.error('Failed to delete document')
    }
  }

  const renderDocumentUpload = (label: string, type: string, existingPath?: string) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      {existingPath ? (
        <div className="flex items-center gap-2 p-3 border rounded-lg bg-gray-50">
          <FileText className="h-5 w-5 text-gray-600" />
          <span className="flex-1 text-sm truncate">Document uploaded</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => previewDocument(existingPath)}
            className="h-8"
          >
            <FileText className="mr-1 h-4 w-4" />
            Preview
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => deleteDocument(type)}
            className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : documents[type] ? (
        <div className="flex items-center gap-2 p-3 border rounded-lg bg-blue-50">
          <FileText className="h-5 w-5 text-blue-600" />
          <span className="flex-1 text-sm truncate">{documents[type]!.name}</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handleDocumentChange(type, null)}
            className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="relative">
          <Input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(e) => handleDocumentChange(type, e.target.files?.[0] || null)}
            className="hidden"
            id={`upload-${type}`}
          />
          <label
            htmlFor={`upload-${type}`}
            className="flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
          >
            <Upload className="h-5 w-5 text-gray-600" />
            <span className="text-sm text-gray-600">Click to upload (PDF, JPG, PNG, max 20MB)</span>
          </label>
        </div>
      )}
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Profile</h2>
        <p className="text-muted-foreground">
          View and update your personal information
        </p>
      </div>

      {/* Profile Photo */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Photo</CardTitle>
          <CardDescription>Upload or change your profile picture</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src={profilePhotoBlobUrl || loadedPhotoUrl || user?.imageUrl} />
              <AvatarFallback>{user?.firstName?.[0]}{user?.lastName?.[0]}</AvatarFallback>
            </Avatar>
            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <label htmlFor="photo-upload" className="cursor-pointer">
                  <Upload className="mr-2 h-4 w-4" />
                  {loadedPhotoUrl || profilePhotoBlobUrl ? "Change Photo" : "Add Photo"}
                  <input
                    id="photo-upload"
                    type="file"
                    accept="image/jpeg,image/jpg,image/png"
                    className="hidden"
                    onChange={handlePhotoSelect}
                  />
                </label>
              </Button>
              {(profilePhoto || loadedPhotoUrl) && (
                <Button variant="ghost" size="sm" onClick={removePhoto}>
                  <X className="mr-1 h-3 w-3" />
                  Remove
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>Your basic details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input value={profileData.fullName} disabled />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={profileData.email} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                placeholder="9876543210"
                value={profileData.phone}
                onChange={(e) => {
                  const value = e.target.value
                  const digitsOnly = value.replace(/\D/g, '')
                  if (digitsOnly.length <= 10) {
                    setProfileData({...profileData, phone: digitsOnly})
                    setValidationErrors(prev => ({ ...prev, phone: validatePhone(digitsOnly) }))
                  }
                }}
                maxLength={10}
                className={validationErrors.phone ? 'border-red-500 focus-visible:ring-red-500' : ''}
              />
              {validationErrors.phone && (
                <p className="text-xs text-red-600">{validationErrors.phone}</p>
              )}
              {!validationErrors.phone && (
                <p className="text-xs text-muted-foreground">10 digits only</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="dob">Date of Birth</Label>
              <Input
                id="dob"
                type="date"
                value={profileData.dateOfBirth}
                onChange={(e) => setProfileData({...profileData, dateOfBirth: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="education">Education Qualification</Label>
              <Input
                id="education"
                placeholder="e.g., B.Tech, MBA"
                value={profileData.education}
                onChange={(e) => {
                  const value = e.target.value
                  setProfileData({...profileData, education: value})
                  setValidationErrors(prev => ({ ...prev, education: validateEducation(value) }))
                }}
                maxLength={20}
                className={validationErrors.education ? 'border-red-500 focus-visible:ring-red-500' : ''}
              />
              {validationErrors.education && (
                <p className="text-xs text-red-600">{validationErrors.education}</p>
              )}
              {!validationErrors.education && (
                <p className="text-xs text-muted-foreground">Max 20 characters (letters only)</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="motherName">Mother's Name</Label>
              <Input
                id="motherName"
                placeholder="Full name"
                value={profileData.motherName}
                onChange={(e) => {
                  const value = e.target.value
                  setProfileData({...profileData, motherName: value})
                  setValidationErrors(prev => ({ ...prev, motherName: validateMotherName(value) }))
                }}
                maxLength={50}
                className={validationErrors.motherName ? 'border-red-500 focus-visible:ring-red-500' : ''}
              />
              {validationErrors.motherName && (
                <p className="text-xs text-red-600">{validationErrors.motherName}</p>
              )}
              {!validationErrors.motherName && (
                <p className="text-xs text-muted-foreground">Max 50 characters (letters only)</p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Permanent Address</Label>
            <Textarea
              id="address"
              placeholder="Enter your full address"
              rows={3}
              value={profileData.address}
              onChange={(e) => {
                const value = e.target.value
                setProfileData({...profileData, address: value})
                setValidationErrors(prev => ({ ...prev, address: validateAddress(value) }))
              }}
              maxLength={100}
              className={validationErrors.address ? 'border-red-500 focus-visible:ring-red-500' : ''}
            />
            {validationErrors.address && (
              <p className="text-xs text-red-600">{validationErrors.address}</p>
            )}
            <p className="text-xs text-muted-foreground">{profileData.address.length}/100 characters</p>
          </div>
        </CardContent>
      </Card>

      {/* Documents */}
      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
          <CardDescription>Upload your important documents</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {renderDocumentUpload("Aadhar Card", "aadharCard", existingData?.documents?.aadharCard)}
            {renderDocumentUpload("PAN Card", "panCard", existingData?.documents?.panCard)}
            {renderDocumentUpload("SSC Marksheet", "sscMarksheet", existingData?.documents?.sscMarksheet)}
            {renderDocumentUpload("HSC Marksheet", "hscMarksheet", existingData?.documents?.hscMarksheet)}
            {renderDocumentUpload("Final Year Marksheet", "finalYearMarksheet", existingData?.documents?.finalYearMarksheet)}
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          size="lg"
          onClick={handleSaveProfile}
          disabled={
            saveProfileMutation.isPending ||
            Object.values(validationErrors).some(error => error !== '')
          }
        >
          {saveProfileMutation.isPending ? "Saving..." : "Save Profile"}
        </Button>
        {Object.values(validationErrors).some(error => error !== '') && (
          <p className="text-xs text-red-600 mt-2 ml-3">Please fix validation errors before saving</p>
        )}
      </div>
    </div>
  )
}
