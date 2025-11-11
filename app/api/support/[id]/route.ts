import { NextRequest, NextResponse } from 'next/server';

// Mock support ticket data
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
    responses: [],
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
    responses: [
      {
        id: 1,
        message: 'We are looking into this issue. Please try using the manual check-in feature for now.',
        respondedBy: 'Admin',
        respondedAt: new Date('2024-01-14T16:00:00Z'),
      }
    ],
  },
];

// GET /api/support/[id] - Get single support ticket
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ticket = mockTickets.find(t => t.id === parseInt(id));

    if (!ticket) {
      return NextResponse.json(
        {
          success: false,
          error: 'Support ticket not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: ticket,
    });
  } catch (error: any) {
    console.error('Error fetching support ticket:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch support ticket',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

// PATCH /api/support/[id] - Update support ticket
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, response, respondedBy } = body;

    const ticketIndex = mockTickets.findIndex(t => t.id === parseInt(id));
    if (ticketIndex === -1) {
      return NextResponse.json(
        {
          success: false,
          error: 'Support ticket not found',
        },
        { status: 404 }
      );
    }

    // Update ticket
    if (status) {
      mockTickets[ticketIndex].status = status;
    }

    // Add response if provided
    if (response) {
      mockTickets[ticketIndex].responses.push({
        id: mockTickets[ticketIndex].responses.length + 1,
        message: response,
        respondedBy: respondedBy || 'Admin',
        respondedAt: new Date(),
      });
    }

    mockTickets[ticketIndex].updatedAt = new Date();

    return NextResponse.json({
      success: true,
      data: mockTickets[ticketIndex],
      message: 'Support ticket updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating support ticket:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update support ticket',
        message: error.message,
      },
      { status: 500 }
    );
  }
}