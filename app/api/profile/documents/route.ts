import { NextRequest, NextResponse } from 'next/server'
import { getCurrentEmployee } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

// GET - Fetch user's documents
export async function GET(request: NextRequest) {
  try {
    const employee = await getCurrentEmployee()
    
    if (!employee) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch full employee data including documents
    const employeeData = await prisma.employee.findUnique({
      where: { employeeCode: employee.employeeCode },
      select: {
        id: true,
        name: true,
        fullName: true,
        email: true,
        employeeCode: true,
        passportPhoto: true,
        aadharCard: true,
        panCard: true,
        sscMarksheet: true,
        hscMarksheet: true,
        finalYearMarksheet: true,
        contactNumber: true,
        dateOfBirth: true,
        educationQualification: true,
        motherName: true,
        permanentAddress: true,
      }
    })

    if (!employeeData) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    const response = {
      documents: {
        aadharCard: employeeData.aadharCard,
        panCard: employeeData.panCard,
        sscMarksheet: employeeData.sscMarksheet,
        hscMarksheet: employeeData.hscMarksheet,
        finalYearMarksheet: employeeData.finalYearMarksheet,
        passportPhoto: employeeData.passportPhoto,
      },
      profileData: {
        name: employeeData.fullName || employeeData.name,
        email: employeeData.email,
        phone: employeeData.contactNumber,
        dateOfBirth: employeeData.dateOfBirth,
        education: employeeData.educationQualification,
        motherName: employeeData.motherName,
        address: employeeData.permanentAddress,
      },
      // Add profilePhoto at root level for nav-user component
      profilePhoto: employeeData.passportPhoto
    }
    
    console.log('GET /api/profile/documents - Returning for', employee.employeeCode, ':', JSON.stringify(response, null, 2))
    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching documents:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Save document paths
export async function POST(request: NextRequest) {
  try {
    const employee = await getCurrentEmployee()
    
    if (!employee) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { documents, profileData } = body

    // Update document or profile data
    const updateData: any = {}
    
    // Handle documents object - only update fields that are explicitly provided
    if (documents) {
      if ('aadharCard' in documents) updateData.aadharCard = documents.aadharCard
      if ('panCard' in documents) updateData.panCard = documents.panCard
      if ('sscMarksheet' in documents) updateData.sscMarksheet = documents.sscMarksheet
      if ('hscMarksheet' in documents) updateData.hscMarksheet = documents.hscMarksheet
      if ('finalYearMarksheet' in documents) updateData.finalYearMarksheet = documents.finalYearMarksheet
      if ('passportPhoto' in documents) updateData.passportPhoto = documents.passportPhoto
      console.log('POST /api/profile/documents - Saving documents:', documents)
    }

    if (profileData) {
      if (profileData.phone) updateData.contactNumber = profileData.phone
      if (profileData.dateOfBirth) updateData.dateOfBirth = new Date(profileData.dateOfBirth)
      if (profileData.education) updateData.educationQualification = profileData.education
      if (profileData.motherName) updateData.motherName = profileData.motherName
      if (profileData.address) updateData.permanentAddress = profileData.address
      // Handle profile photo from profileData - only update if explicitly provided
      if ('profilePhoto' in profileData) updateData.passportPhoto = profileData.profilePhoto
      console.log('POST /api/profile/documents - Saving profileData:', profileData)
    }

    console.log('POST /api/profile/documents - Final updateData for', employee.employeeCode, ':', updateData)

    const updatedEmployee = await prisma.employee.update({
      where: { employeeCode: employee.employeeCode },
      data: updateData
    })
    
    console.log('POST /api/profile/documents - Updated employee:', {
      aadharCard: updatedEmployee.aadharCard,
      panCard: updatedEmployee.panCard,
      sscMarksheet: updatedEmployee.sscMarksheet,
      hscMarksheet: updatedEmployee.hscMarksheet,
      finalYearMarksheet: updatedEmployee.finalYearMarksheet,
      passportPhoto: updatedEmployee.passportPhoto,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving document:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
