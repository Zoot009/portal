import { NextRequest, NextResponse } from 'next/server';

// Mock support comments data
const mockComments = [
  {
    id: 1,
    ticketId: 1,
    message: 'Thank you for reporting this issue. We are investigating it now.',
    authorId: 100,
    authorName: 'Support Agent',
    authorType: 'AGENT',
    createdAt: new Date('2024-01-15T11:00:00Z'),
  },
  {
    id: 2,
    ticketId: 1,
    message: 'I tried the temporary solution but it still does not work.',
    authorId: 1,
    authorName: 'John Doe',
    authorType: 'USER',
    createdAt: new Date('2024-01-15T12:30:00Z'),
  },
  {
    id: 3,
    ticketId: 2,
    message: 'Please try using the manual check-in feature while we fix this.',
    authorId: 101,
    authorName: 'Tech Support',
    authorType: 'AGENT',
    createdAt: new Date('2024-01-14T16:00:00Z'),
  },
];

// GET /api/support/comments - Get comments for support tickets
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const ticketId = searchParams.get('ticketId');

    let filteredComments = [...mockComments];

    // Filter by ticket ID if provided
    if (ticketId) {
      filteredComments = filteredComments.filter(comment => 
        comment.ticketId === parseInt(ticketId)
      );
    }

    // Sort by created date (oldest first for conversation flow)
    filteredComments.sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    return NextResponse.json({
      success: true,
      data: filteredComments,
      total: filteredComments.length,
    });
  } catch (error: any) {
    console.error('Error fetching support comments:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch support comments',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

// POST /api/support/comments - Add new comment to support ticket
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ticketId, message, authorId, authorName, authorType } = body;

    // Validation
    if (!ticketId || !message || !authorId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Ticket ID, message, and author ID are required',
        },
        { status: 400 }
      );
    }

    const newComment = {
      id: Math.max(...mockComments.map(c => c.id)) + 1,
      ticketId: parseInt(ticketId),
      message,
      authorId: parseInt(authorId),
      authorName: authorName || 'Anonymous',
      authorType: authorType || 'USER',
      createdAt: new Date(),
    };

    // In real app, this would be saved to database
    mockComments.push(newComment);

    return NextResponse.json({
      success: true,
      data: newComment,
      message: 'Comment added successfully',
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating support comment:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create support comment',
        message: error.message,
      },
      { status: 500 }
    );
  }
}