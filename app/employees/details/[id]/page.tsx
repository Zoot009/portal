'use client'

import { useQuery } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, User, Phone, Calendar, FileText, Download } from 'lucide-react'
import { createSupabaseClient } from '@/lib/supabase'
import { useState, useEffect } from 'react'

interface Employee {
  id: number
  name: string
  email: string
  employeeCode: string
  role: string
  department?: string
  designation?: string
  isActive: boolean
  joinDate?: string
  contactNumber?: string
  dateOfBirth?: string
  motherName?: string
  permanentAddress?: string
  educationQualification?: string
  fullName?: string
  profileCompleted?: boolean
  aadharCard?: string
  panCard?: string
  sscMarksheet?: string
  hscMarksheet?: string
  finalYearMarksheet?: string
  photo?: string
  passportPhoto?: string
}

export default function EmployeeDetailView() {
  const params = useParams()
  const router = useRouter()
  const employeeId = params.id as string
  const [documentUrls, setDocumentUrls] = useState<Record<string, string>>({})

  const { data: employee, isLoading } = useQuery({
    queryKey: ['employee', employeeId],
    queryFn: async () => {
      const response = await fetch(`/api/employees/${employeeId}`)
      if (!response.ok) throw new Error('Failed to fetch employee')
      const result = await response.json()
      return result.data
    }
  })

  // Load signed URLs for documents
  useEffect(() => {
    const loadDocumentUrls = async () => {
      if (!employee) return

      console.log('Loading document URLs for employee:', employee.employeeCode)
      console.log('Employee data:', {
        passportPhoto: employee.passportPhoto,
        aadharCard: employee.aadharCard,
        panCard: employee.panCard,
      })

      const supabase = createSupabaseClient()
      const documents = {
        passportPhoto: employee.passportPhoto,
        aadharCard: employee.aadharCard,
        panCard: employee.panCard,
        sscMarksheet: employee.sscMarksheet,
        hscMarksheet: employee.hscMarksheet,
        finalYearMarksheet: employee.finalYearMarksheet,
      }

      const urls: Record<string, string> = {}

      for (const [key, filePath] of Object.entries(documents)) {
        if (filePath) {
          try {
            console.log(`Attempting to load ${key} from path:`, filePath)
            const { data, error } = await supabase.storage
              .from('employee-documents')
              .createSignedUrl(filePath, 3600) // 1 hour expiry

            if (error) {
              console.error(`Supabase error for ${key}:`, error)
              // Try public URL as fallback
              const { data: publicUrlData } = supabase.storage
                .from('employee-documents')
                .getPublicUrl(filePath)
              
              if (publicUrlData?.publicUrl) {
                console.log(`Using public URL for ${key}:`, publicUrlData.publicUrl)
                urls[key] = publicUrlData.publicUrl
              }
            } else if (data?.signedUrl) {
              console.log(`Signed URL for ${key}:`, data.signedUrl)
              urls[key] = data.signedUrl
            }
          } catch (error) {
            console.error(`Error loading ${key}:`, error)
            // Try public URL as fallback
            try {
              const { data: publicUrlData } = supabase.storage
                .from('employee-documents')
                .getPublicUrl(filePath)
              
              if (publicUrlData?.publicUrl) {
                console.log(`Using public URL fallback for ${key}:`, publicUrlData.publicUrl)
                urls[key] = publicUrlData.publicUrl
              }
            } catch (publicError) {
              console.error(`Public URL fallback failed for ${key}:`, publicError)
            }
          }
        }
      }

      console.log('Final document URLs:', urls)
      setDocumentUrls(urls)
    }

    loadDocumentUrls()
  }, [employee])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Loading employee details...</div>
      </div>
    )
  }

  if (!employee) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p className="text-xl mb-4">Employee not found</p>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 -m-4">
      <div className="flex items-center gap-4 px-6 pt-6">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Employee Profile</h2>
          <p className="text-muted-foreground">
            Complete details and submitted documents
          </p>
        </div>
      </div>

      {/* Profile Header Card */}
      <div className="px-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              <Avatar className="h-32 w-32 ring-4 ring-background">
                <AvatarImage src={documentUrls.passportPhoto || '/placeholder.svg'} />
                <AvatarFallback className="text-3xl">
                  {employee.name.split(' ').map((n: string) => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-center sm:text-left">
                <h3 className="text-3xl font-bold">{employee.fullName || employee.name}</h3>
                <p className="text-muted-foreground text-lg mt-1">{employee.employeeCode}</p>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-4">
                  <Badge variant="outline" className="text-sm px-3 py-1">{employee.role}</Badge>
                  <Badge variant={employee.isActive ? 'default' : 'secondary'} className="text-sm px-3 py-1">
                    {employee.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                  {employee.profileCompleted !== undefined && (
                    <Badge variant={employee.profileCompleted ? 'default' : 'secondary'} className="text-sm px-3 py-1">
                      {employee.profileCompleted ? 'Profile Complete' : 'Profile Incomplete'}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 px-6">
        {/* Basic Information */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <p className="text-sm text-muted-foreground col-span-1">Full Name</p>
              <p className="font-medium col-span-2">{employee.fullName || employee.name}</p>
            </div>
            <Separator />
            <div className="grid grid-cols-3 gap-2">
              <p className="text-sm text-muted-foreground col-span-1">Employee Code</p>
              <p className="font-medium col-span-2">{employee.employeeCode}</p>
            </div>
            <Separator />
            <div className="grid grid-cols-3 gap-2">
              <p className="text-sm text-muted-foreground col-span-1">Designation</p>
              <p className="font-medium col-span-2">{employee.designation || 'Not provided'}</p>
            </div>
            <Separator />
            <div className="grid grid-cols-3 gap-2">
              <p className="text-sm text-muted-foreground col-span-1">Department</p>
              <p className="font-medium col-span-2">{employee.department || 'Not provided'}</p>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Phone className="h-5 w-5" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <p className="text-sm text-muted-foreground col-span-1">Email</p>
              <p className="font-medium col-span-2 break-all">{employee.email}</p>
            </div>
            <Separator />
            <div className="grid grid-cols-3 gap-2">
              <p className="text-sm text-muted-foreground col-span-1">Phone Number</p>
              <p className="font-medium col-span-2">{employee.contactNumber || 'Not provided'}</p>
            </div>
            <Separator />
            <div className="grid grid-cols-3 gap-2">
              <p className="text-sm text-muted-foreground col-span-1">Address</p>
              <p className="font-medium col-span-2">{employee.permanentAddress || 'Not provided'}</p>
            </div>
          </CardContent>
        </Card>

        {/* Personal Information */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <p className="text-sm text-muted-foreground col-span-1">Date of Birth</p>
              <p className="font-medium col-span-2">
                {employee.dateOfBirth 
                  ? new Date(employee.dateOfBirth).toLocaleDateString('en-GB') 
                  : 'Not provided'}
              </p>
            </div>
            <Separator />
            <div className="grid grid-cols-3 gap-2">
              <p className="text-sm text-muted-foreground col-span-1">Mother's Name</p>
              <p className="font-medium col-span-2">{employee.motherName || 'Not provided'}</p>
            </div>
            <Separator />
            <div className="grid grid-cols-3 gap-2">
              <p className="text-sm text-muted-foreground col-span-1">Education</p>
              <p className="font-medium col-span-2">{employee.educationQualification || 'Not provided'}</p>
            </div>
          </CardContent>
        </Card>

        {/* Employment Details */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-5 w-5" />
              Employment Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <p className="text-sm text-muted-foreground col-span-1">Join Date</p>
              <p className="font-medium col-span-2">
                {employee.joinDate 
                  ? new Date(employee.joinDate).toLocaleDateString('en-GB') 
                  : 'Not provided'}
              </p>
            </div>
            <Separator />
            <div className="grid grid-cols-3 gap-2">
              <p className="text-sm text-muted-foreground col-span-1">Role</p>
              <p className="font-medium col-span-2">{employee.role}</p>
            </div>
            <Separator />
            <div className="grid grid-cols-3 gap-2">
              <p className="text-sm text-muted-foreground col-span-1">Status</p>
              <div className="col-span-2">
                <Badge variant={employee.isActive ? 'default' : 'secondary'}>
                  {employee.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Documents Section */}
      <div className="px-6 pb-6">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5" />
              Submitted Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* Passport Photo */}
              <div className="border rounded-lg p-4 space-y-3 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm">Passport Photo</p>
                  {employee.passportPhoto ? (
                    <Badge variant="default" className="text-xs">Uploaded</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">Not Uploaded</Badge>
                  )}
                </div>
                {employee.passportPhoto && documentUrls.passportPhoto && (
                  <a 
                    href={documentUrls.passportPhoto} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Button variant="outline" size="sm" className="w-full">
                      <Download className="h-4 w-4 mr-2" />
                      View Document
                    </Button>
                  </a>
                )}
              </div>

              {/* Aadhar Card */}
              <div className="border rounded-lg p-4 space-y-3 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm">Aadhar Card</p>
                  {employee.aadharCard ? (
                    <Badge variant="default" className="text-xs">Uploaded</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">Not Uploaded</Badge>
                  )}
                </div>
                {employee.aadharCard && documentUrls.aadharCard && (
                  <a 
                    href={documentUrls.aadharCard} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Button variant="outline" size="sm" className="w-full">
                      <Download className="h-4 w-4 mr-2" />
                      View Document
                    </Button>
                  </a>
                )}
              </div>

              {/* PAN Card */}
              <div className="border rounded-lg p-4 space-y-3 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm">PAN Card</p>
                  {employee.panCard ? (
                    <Badge variant="default" className="text-xs">Uploaded</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">Not Uploaded</Badge>
                  )}
                </div>
                {employee.panCard && documentUrls.panCard && (
                  <a 
                    href={documentUrls.panCard} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Button variant="outline" size="sm" className="w-full">
                      <Download className="h-4 w-4 mr-2" />
                      View Document
                    </Button>
                  </a>
                )}
              </div>

              {/* SSC (10th) Marksheet */}
              <div className="border rounded-lg p-4 space-y-3 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm">SSC (10th) Marksheet</p>
                  {employee.sscMarksheet ? (
                    <Badge variant="default" className="text-xs">Uploaded</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">Not Uploaded</Badge>
                  )}
                </div>
                {employee.sscMarksheet && documentUrls.sscMarksheet && (
                  <a 
                    href={documentUrls.sscMarksheet} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Button variant="outline" size="sm" className="w-full">
                      <Download className="h-4 w-4 mr-2" />
                      View Document
                    </Button>
                  </a>
                )}
              </div>

              {/* HSC (12th) Marksheet */}
              <div className="border rounded-lg p-4 space-y-3 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm">HSC (12th) Marksheet</p>
                  {employee.hscMarksheet ? (
                    <Badge variant="default" className="text-xs">Uploaded</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">Not Uploaded</Badge>
                  )}
                </div>
                {employee.hscMarksheet && documentUrls.hscMarksheet && (
                  <a 
                    href={documentUrls.hscMarksheet} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Button variant="outline" size="sm" className="w-full">
                      <Download className="h-4 w-4 mr-2" />
                      View Document
                    </Button>
                  </a>
                )}
              </div>

              {/* Final Year Marksheet */}
              <div className="border rounded-lg p-4 space-y-3 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm">Final Year Marksheet</p>
                  {employee.finalYearMarksheet ? (
                    <Badge variant="default" className="text-xs">Uploaded</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">Not Uploaded</Badge>
                  )}
                </div>
                {employee.finalYearMarksheet && documentUrls.finalYearMarksheet && (
                  <a 
                    href={documentUrls.finalYearMarksheet} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Button variant="outline" size="sm" className="w-full">
                      <Download className="h-4 w-4 mr-2" />
                      View Document
                    </Button>
                  </a>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
