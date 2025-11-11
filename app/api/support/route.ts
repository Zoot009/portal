import { NextRequest, NextResponse } from 'next/server';

// Mock support tickets data
const mockTickets = [
  {
    id: 1,
    title: 'Password Reset Issue',
    description: 'Cannot reset password using the forgot password feature',
    status: 'OPEN',
    priority: 'HIGH',
    category: 'ACCOUNT',
    createdBy: 1,
    createdByName: 'John Doe',
    createdAt: new Date('2024-01-15T10:00:00Z'),
    updatedAt: new Date('2024-01-15T10:00:00Z'),
  },
  {
    id: 2,
    title: 'Attendance Tracking Problem',
    description: 'My attendance is not being tracked properly when I clock in',
    status: 'IN_PROGRESS',
    priority: 'MEDIUM',
    category: 'ATTENDANCE',
    createdBy: 2,
    createdByName: 'Jane Smith',
    createdAt: new Date('2024-01-14T14:30:00Z'),
    updatedAt: new Date('2024-01-14T16:00:00Z'),
  },
  {
    id: 3,
    title: 'Leave Application Not Working',
    description: 'Unable to submit leave application, getting an error message',
    status: 'RESOLVED',
    priority: 'MEDIUM',
    category: 'LEAVE',
    createdBy: 3,
    createdByName: 'Bob Johnson',
    createdAt: new Date('2024-01-13T09:00:00Z'),
    updatedAt: new Date('2024-01-13T17:00:00Z'),
  },
];

// GET /api/support - Get all support tickets
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const category = searchParams.get('category');
    const createdBy = searchParams.get('createdBy');

    let filteredTickets = [...mockTickets];

    // Apply filters
    if (status) {
      filteredTickets = filteredTickets.filter(ticket => 
        ticket.status === status
      );
    }

    if (priority) {
      filteredTickets = filteredTickets.filter(ticket => 
        ticket.priority === priority
      );
    }

    if (category) {
      filteredTickets = filteredTickets.filter(ticket => 
        ticket.category === category
      );
    }

    if (createdBy) {
      filteredTickets = filteredTickets.filter(ticket => 
        ticket.createdBy === parseInt(createdBy)
      );
    }

    // Sort by created date (newest first)
    filteredTickets.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({
      success: true,
      data: filteredTickets,
      total: filteredTickets.length,
    });
  } catch (error: any) {
    console.error('Error fetching support tickets:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch support tickets',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

// POST /api/support - Create new support ticket
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, priority, category, createdBy, createdByName } = body;

    // Validation
    if (!title || !description || !category) {
      return NextResponse.json(
        {
          success: false,
          error: 'Title, description, and category are required',
        },
        { status: 400 }
      );
    }

    const newTicket = {
      id: Math.max(...mockTickets.map(t => t.id)) + 1,
      title,
      description,
      status: 'OPEN',
      priority: priority || 'MEDIUM',
      category,
      createdBy: createdBy ? parseInt(createdBy) : 1,
      createdByName: createdByName || 'Anonymous',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // In real app, this would be saved to database
    mockTickets.push(newTicket);

    return NextResponse.json({
      success: true,
      data: newTicket,
      message: 'Support ticket created successfully',
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating support ticket:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create support ticket',
        message: error.message,
      },
      { status: 500 }
    );
  }
}