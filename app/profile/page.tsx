'use client'

import { useState, useEffect } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useUser } from '@clerk/nextjs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Upload, X, Eye, FileText, Save, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'

interface Document {
  id: string
  name: string
  url: string
  uploadedAt: Date
}

export default function ProfilePage() {
  const { user } = useUser()
  
  const [profileSettings, setProfileSettings] = useState({
    name: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    education: '',
    motherName: '',
    address: '',
    profilePhoto: '/api/placeholder/80/80'
  })

  const [validationErrors, setValidationErrors] = useState({
    phone: '',
    education: '',
    motherName: '',
    address: ''
  })

  const [documents, setDocuments] = useState<{
    aadharCard: Document | null
    panCard: Document | null
    sscMarksheet: Document | null
    hscMarksheet: Document | null
    finalYearMarksheet: Document | null
  }>({
    aadharCard: null,
    panCard: null,
    sscMarksheet: null,
    hscMarksheet: null,
    finalYearMarksheet: null
  })

  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null)
  
  // Load documents from database
  const { data: profileData, refetch } = useQuery({
    queryKey: ['profile-documents'],
    queryFn: async () => {
      const res = await fetch('/api/profile/documents')
      if (!res.ok) throw new Error('Failed to load documents')
      return res.json()
    }
  })

  // Update state when data loads
  useEffect(() => {
    if (profileData) {
      console.log('Loading profile data:', profileData)
      // Update documents
      const loadedDocs: any = {}
      Object.entries(profileData.documents || {}).forEach(([key, path]) => {
        if (path && typeof path === 'string') {
          // Extract filename from path
          const pathParts = path.split('/')
          const fileName = pathParts[pathParts.length - 1] || 'Document'
          
          loadedDocs[key] = {
            id: path,
            name: fileName,
            url: path,
            uploadedAt: new Date()
          }
          console.log(`Loaded ${key}:`, loadedDocs[key])
        } else {
          loadedDocs[key] = null
        }
      })
      setDocuments(loadedDocs)
      console.log('Final documents state:', loadedDocs)

      // Update profile settings from database
      if (profileData.profileData) {
        setProfileSettings(prev => ({
          ...prev,
          name: profileData.profileData.name || user?.fullName || prev.name,
          email: profileData.profileData.email || user?.primaryEmailAddress?.emailAddress || prev.email,
          phone: profileData.profileData.phone || prev.phone,
          dateOfBirth: profileData.profileData.dateOfBirth 
            ? new Date(profileData.profileData.dateOfBirth).toISOString().split('T')[0] 
            : prev.dateOfBirth,
          education: profileData.profileData.education || prev.education,
          motherName: profileData.profileData.motherName || prev.motherName,
          address: profileData.profileData.address || prev.address,
        }))
      }
      
      // Load profile photo with signed URL if it exists
      if (profileData.profilePhoto && typeof profileData.profilePhoto === 'string') {
        loadProfilePhoto(profileData.profilePhoto)
      } else if (user?.imageUrl) {
        setProfileSettings(prev => ({ ...prev, profilePhoto: user.imageUrl }))
      }
    }
  }, [profileData, user])
  
  // Function to load profile photo with signed URL
  const loadProfilePhoto = async (photoPath: string) => {
    try {
      // If it's already a full URL, use it directly
      if (photoPath.startsWith('http')) {
        setProfileSettings(prev => ({ ...prev, profilePhoto: photoPath }))
        return
      }
      
      // Otherwise, get signed URL from Supabase
      const { data, error } = await supabase.storage
        .from('employee-documents')
        .createSignedUrl(photoPath, 365 * 24 * 60 * 60) // 1 year
      
      if (error) {
        console.error('Error loading profile photo:', error)
        // If photo not found, use default
        if (error.message.includes('Object not found') || error.message.includes('Bucket not found')) {
          setProfileSettings(prev => ({ ...prev, profilePhoto: user?.imageUrl || '/api/placeholder/80/80' }))
        }
        return
      }
      
      if (data?.signedUrl) {
        setProfileSettings(prev => ({ ...prev, profilePhoto: data.signedUrl }))
      }
    } catch (error) {
      console.error('Error loading profile photo:', error)
      // Fallback to default photo
      setProfileSettings(prev => ({ ...prev, profilePhoto: user?.imageUrl || '/api/placeholder/80/80' }))
    }
  }

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

  const saveProfileMutation = useMutation({
    mutationFn: async (data: typeof profileSettings) => {
      let photoPath = null
      
      // Upload photo to Supabase if it's a local blob URL (newly selected)
      if (data.profilePhoto && data.profilePhoto.startsWith('blob:')) {
        const userId = user?.id || 'anonymous'
        
        // Delete old photo from bucket before uploading new one
        if (profileData?.profilePhoto && typeof profileData.profilePhoto === 'string' && !profileData.profilePhoto.startsWith('http')) {
          try {
            const { error: deleteError } = await supabase.storage
              .from('employee-documents')
              .remove([profileData.profilePhoto])
            
            if (deleteError) {
              console.error('Error deleting old photo:', deleteError)
              // Continue with upload even if deletion fails
            }
          } catch (err) {
            console.error('Error removing old photo:', err)
            // Continue with upload
          }
        }
        
        // Convert blob URL back to file
        const response = await fetch(data.profilePhoto)
        const blob = await response.blob()
        const file = new File([blob], `profile-photo-${Date.now()}.jpg`, { type: blob.type })
        
        // Upload to Supabase Storage
        const filePath = `${userId}/profile-photo/${Date.now()}_${file.name}`
        const { data: uploadData, error } = await supabase.storage
          .from('employee-documents')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          })
        
        if (error) {
          console.error('Upload error:', error)
          throw new Error('Failed to upload photo')
        }
        
        photoPath = uploadData.path
      } else if (data.profilePhoto === (user?.imageUrl || '/api/placeholder/80/80')) {
        // User removed the photo, delete from storage if exists
        if (profileData?.profilePhoto && typeof profileData.profilePhoto === 'string' && !profileData.profilePhoto.startsWith('http')) {
          await supabase.storage
            .from('employee-documents')
            .remove([profileData.profilePhoto])
        }
        photoPath = null // Set to null in database
      }
      
      const res = await fetch('/api/profile/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          profileData: {
            phone: data.phone,
            dateOfBirth: data.dateOfBirth,
            education: data.education,
            motherName: data.motherName,
            address: data.address,
            profilePhoto: photoPath
          }
        })
      })
      
      if (!res.ok) throw new Error('Failed to save profile')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Profile saved successfully!')
      refetch()
    },
    onError: () => {
      toast.error('Failed to save profile')
    }
  })

  const handleFileUpload = async (docType: keyof typeof documents, file: File) => {
    setUploadingDoc(docType)
    
    try {
      // Validate file type - only allow PDF, JPEG, JPG, and PNG
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
      if (!allowedTypes.includes(file.type.toLowerCase())) {
        toast.error('Only PDF, JPEG, JPG, and PNG files are allowed')
        setUploadingDoc(null)
        return
      }
      
      // Validate file size - max 20MB
      const maxSize = 20 * 1024 * 1024 // 20MB in bytes
      if (file.size > maxSize) {
        toast.error('File size must be less than 20MB')
        setUploadingDoc(null)
        return
      }
      
      // Get user ID from Clerk
      const userId = user?.id || 'anonymous'
      
      // Upload to Supabase Storage
      const filePath = `${userId}/${docType}/${Date.now()}_${file.name}`
      const { data, error } = await supabase.storage
        .from('employee-documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })
      
      if (error) throw error
      
      const newDoc: Document = {
        id: data.path,
        name: file.name,
        url: data.path, // Store path instead of public URL
        uploadedAt: new Date()
      }
      
      setDocuments(prev => ({
        ...prev,
        [docType]: newDoc
      }))
      
      // Save to database - send documents object to preserve other fields
      await fetch('/api/profile/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documents: {
            [docType]: data.path
          }
        })
      })
      
      toast.success(`${docType} uploaded successfully!`)
      refetch()
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Failed to upload document')
    } finally {
      setUploadingDoc(null)
    }
  }

  const handleDeleteDocument = async (docType: keyof typeof documents) => {
    try {
      const doc = documents[docType]
      if (!doc) return
      
      // Delete from Supabase Storage bucket
      const { error } = await supabase.storage
        .from('employee-documents')
        .remove([doc.url]) // Use doc.url which contains the file path
      
      if (error) {
        console.error('Error deleting from bucket:', error)
        // Continue even if bucket deletion fails (file might not exist)
      }
      
      // Update local state
      setDocuments(prev => ({
        ...prev,
        [docType]: null
      }))
      
      // Update database - send documents object to preserve other fields
      await fetch('/api/profile/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documents: {
            [docType]: null
          }
        })
      })
      
      toast.success('Document deleted successfully!')
      refetch()
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('Failed to delete document')
    }
  }

  const handlePhotoSelect = (file: File) => {
    // Validate file type - only allow JPEG, JPG, and PNG
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png']
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      toast.error('Only JPEG, JPG, and PNG images are allowed')
      return
    }
    
    // Just show preview, don't upload yet
    const localPreviewUrl = URL.createObjectURL(file)
    setProfileSettings(prev => ({
      ...prev,
      profilePhoto: localPreviewUrl
    }))
    toast.success('Photo selected. Click "Save Profile" to upload.')
  }

  const handleDeletePhoto = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    
    console.log('=== handleDeletePhoto FIRED ===')
    console.log('profileData:', profileData)
    console.log('profileData?.profilePhoto:', profileData?.profilePhoto)
    console.log('profileSettings.profilePhoto:', profileSettings.profilePhoto)
    
    try {
      // Delete from Supabase bucket if photo exists
      if (profileData?.profilePhoto && typeof profileData.profilePhoto === 'string') {
        console.log('Attempting to delete photo from bucket:', profileData.profilePhoto)
        const { error: deleteError } = await supabase.storage
          .from('employee-documents')
          .remove([profileData.profilePhoto])
        
        if (deleteError) {
          console.error('Error deleting photo from bucket:', deleteError)
        } else {
          console.log('✅ Photo deleted from bucket successfully')
        }
      }
      
      // Update database immediately to remove photo
      console.log('Updating database to remove photo...')
      const response = await fetch('/api/profile/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          profileData: {
            profilePhoto: null
          }
        })
      })
      
      const result = await response.json()
      console.log('API response:', result)
      
      if (!response.ok) {
        throw new Error('Failed to update database')
      }
      
      // Reset to default
      console.log('Resetting photo to default')
      setProfileSettings(prev => ({
        ...prev,
        profilePhoto: user?.imageUrl || '/api/placeholder/80/80'
      }))
      
      console.log('✅ Database updated successfully')
      toast.success('Photo removed successfully!')
      await refetch()
      console.log('✅ Data refetched')
    } catch (error) {
      console.error('❌ Error in handleDeletePhoto:', error)
      toast.error('Failed to remove photo')
    }
  }

  const handlePreview = (url: string) => {
    window.open(url, '_blank')
  }

  const handlePreviewDocument = async (filePath: string) => {
    try {
      // Generate a signed URL valid for 60 seconds
      const { data, error } = await supabase.storage
        .from('employee-documents')
        .createSignedUrl(filePath, 60)
      
      if (error) {
        console.error('Preview error:', error)
        
        if (error.message.includes('Bucket not found')) {
          toast.error('Storage not configured. Please create "employee-documents" bucket in Supabase.')
        } else if (error.message.includes('Object not found')) {
          toast.error('Document file not found. Please re-upload the document.')
        } else {
          toast.error('Failed to preview document')
        }
        return
      }
      
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank')
      }
    } catch (error) {
      console.error('Preview error:', error)
      toast.error('Failed to preview document')
    }
  }

  const handleSaveProfile = () => {
    saveProfileMutation.mutate(profileSettings)
  }

  const renderDocumentUpload = (
    docType: keyof typeof documents,
    label: string
  ) => {
    const doc = documents[docType]
    const isUploading = uploadingDoc === docType

    return (
      <div className="space-y-2">
        <Label>{label}</Label>
        {doc ? (
          <div className="flex items-center gap-2 p-3 border rounded-lg bg-gray-50">
            <FileText className="h-5 w-5 text-gray-600" />
            <span className="flex-1 text-sm truncate">{doc.name}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handlePreviewDocument(doc.url)}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDeleteDocument(docType)}
            >
              <Trash2 className="h-4 w-4 text-red-600" />
            </Button>
          </div>
        ) : (
          <div className="relative">
            <Input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFileUpload(docType, file)
              }}
              disabled={isUploading}
              className="hidden"
              id={`upload-${docType}`}
            />
            <label
              htmlFor={`upload-${docType}`}
              className="flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <Upload className="h-5 w-5 text-gray-600" />
              <span className="text-sm text-gray-600">
                {isUploading ? 'Uploading...' : 'Click to upload'}
              </span>
            </label>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Profile</h2>
        <p className="text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>

      {/* Profile Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Settings</CardTitle>
          <CardDescription>
            Update your personal information and preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profileSettings.profilePhoto} />
              <AvatarFallback>JD</AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-2">
              <input
                type="file"
                id="photo-upload"
                accept="image/jpeg,image/jpg,image/png"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handlePhotoSelect(file)
                }}
              />
              <Button 
                variant="outline"
                type="button"
                onClick={() => document.getElementById('photo-upload')?.click()}
              >
                Add Photo
              </Button>
              {/* Show Remove button if there's a custom photo (from database or newly selected) */}
              {(profileData?.profilePhoto || profileSettings.profilePhoto.startsWith('blob:')) && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  type="button"
                  onClick={handleDeletePhoto}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Remove
                </Button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input
                value={profileSettings.name}
                onChange={(e) => setProfileSettings({...profileSettings, name: e.target.value})}
                maxLength={100}
                disabled
                className="bg-gray-50 cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground">Name is managed by your account</p>
            </div>
            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input
                type="email"
                value={profileSettings.email}
                onChange={(e) => setProfileSettings({...profileSettings, email: e.target.value})}
                disabled
                className="bg-gray-50 cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground">Email is managed by your account</p>
            </div>
            <div className="space-y-2">
              <Label>Phone Number (India)</Label>
              <Input
                value={profileSettings.phone}
                onChange={(e) => {
                  const value = e.target.value
                  // Only allow numbers, max 10 digits (Indian mobile number)
                  const digitsOnly = value.replace(/\D/g, '')
                  if (digitsOnly.length <= 10) {
                    setProfileSettings({...profileSettings, phone: digitsOnly})
                    setValidationErrors(prev => ({ ...prev, phone: validatePhone(digitsOnly) }))
                  }
                }}
                placeholder="9876543210"
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
              <Label>Date of Birth</Label>
              <Input
                type="date"
                value={profileSettings.dateOfBirth}
                onChange={(e) => setProfileSettings({...profileSettings, dateOfBirth: e.target.value})}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="space-y-2">
              <Label>Education Qualification</Label>
              <Input
                value={profileSettings.education}
                onChange={(e) => {
                  const value = e.target.value
                  setProfileSettings({...profileSettings, education: value})
                  setValidationErrors(prev => ({ ...prev, education: validateEducation(value) }))
                }}
                placeholder="e.g., B.Tech, MBA"
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
              <Label>Mother's Name</Label>
              <Input
                value={profileSettings.motherName}
                onChange={(e) => {
                  const value = e.target.value
                  setProfileSettings({...profileSettings, motherName: value})
                  setValidationErrors(prev => ({ ...prev, motherName: validateMotherName(value) }))
                }}
                maxLength={50}
                placeholder="Mother's full name"
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
            <Label>Permanent Address</Label>
            <Textarea
              value={profileSettings.address}
              onChange={(e) => {
                const value = e.target.value
                setProfileSettings({...profileSettings, address: value})
                setValidationErrors(prev => ({ ...prev, address: validateAddress(value) }))
              }}
              placeholder="Enter your complete address"
              rows={3}
              maxLength={100}
              className={validationErrors.address ? 'border-red-500 focus-visible:ring-red-500' : ''}
            />
            {validationErrors.address && (
              <p className="text-xs text-red-600">{validationErrors.address}</p>
            )}
            <p className="text-xs text-muted-foreground">{profileSettings.address.length}/100 characters</p>
          </div>
        </CardContent>
      </Card>

      {/* Documents Upload */}
      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
          <CardDescription>
            Upload and manage your important documents
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderDocumentUpload('aadharCard', 'Aadhar Card')}
            {renderDocumentUpload('panCard', 'PAN Card')}
            {renderDocumentUpload('sscMarksheet', 'SSC Marksheet')}
            {renderDocumentUpload('hscMarksheet', 'HSC Marksheet')}
            {renderDocumentUpload('finalYearMarksheet', 'Final Year Marksheet')}
          </div>
        </CardContent>
      </Card>

      {/* Save Button at the end */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSaveProfile} 
          disabled={
            saveProfileMutation.isPending || 
            Object.values(validationErrors).some(error => error !== '')
          } 
          size="lg"
        >
          <Save className="mr-2 h-4 w-4" />
          Save Profile
        </Button>
        {Object.values(validationErrors).some(error => error !== '') && (
          <p className="text-xs text-red-600 mt-2 ml-3">Please fix validation errors before saving</p>
        )}
      </div>
    </div>
  )
}
