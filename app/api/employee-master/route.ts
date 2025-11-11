import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

// Simple file-based storage for employee master
const EMPLOYEE_MASTER_FILE = path.join(process.cwd(), 'data', 'employee-master.json')

// Ensure data directory exists
async function ensureDataDirectory() {
  const dataDir = path.dirname(EMPLOYEE_MASTER_FILE)
  try {
    await fs.access(dataDir)
  } catch {
    await fs.mkdir(dataDir, { recursive: true })
  }
}

// Read employee master from file
async function readEmployeeMaster() {
  try {
    await ensureDataDirectory()
    const data = await fs.readFile(EMPLOYEE_MASTER_FILE, 'utf8')
    return JSON.parse(data)
  } catch (error) {
    return []
  }
}

// Write employee master to file
async function writeEmployeeMaster(employees: any[]) {
  await ensureDataDirectory()
  await fs.writeFile(EMPLOYEE_MASTER_FILE, JSON.stringify(employees, null, 2))
}

export async function GET() {
  try {
    const employees = await readEmployeeMaster()
    return NextResponse.json({
      success: true,
      employees: employees
    })
  } catch (error) {
    console.error('Error fetching employee master:', error)
    return NextResponse.json(
      { error: 'Failed to fetch employee master' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const employees = data.employees || data

    if (!Array.isArray(employees)) {
      return NextResponse.json(
        { error: 'Invalid employee data format' },
        { status: 400 }
      )
    }

    // Validate employee structure
    const validEmployees = employees.filter(emp => 
      emp.employeeCode && emp.employeeName
    )

    if (validEmployees.length === 0) {
      return NextResponse.json(
        { error: 'No valid employees found' },
        { status: 400 }
      )
    }

    await writeEmployeeMaster(validEmployees)

    return NextResponse.json({
      success: true,
      message: `Successfully saved ${validEmployees.length} employees`,
      count: validEmployees.length
    })

  } catch (error) {
    console.error('Error saving employee master:', error)
    return NextResponse.json(
      { error: 'Failed to save employee master' },
      { status: 500 }
    )
  }
}