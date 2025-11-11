import { NextRequest, NextResponse } from 'next/server';

// Mock settings data - in real app, this would come from database
const mockSettings = {
  companyName: 'Company Portal',
  workingHours: {
    start: '09:00',
    end: '17:30',
  },
  timezone: 'UTC+5:30',
  weekendDays: ['Saturday', 'Sunday'],
  publicHolidays: [
    { date: '2024-01-01', name: 'New Year Day' },
    { date: '2024-12-25', name: 'Christmas Day' },
  ],
  leaveSettings: {
    annualLeaveQuota: 21,
    sickLeaveQuota: 12,
    maxConsecutiveDays: 15,
  },
  attendanceSettings: {
    graceTime: 15, // minutes
    halfDayThreshold: 4, // hours
    autoMarkAbsent: true,
  },
};

// GET /api/settings - Get system settings
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');

    if (category) {
      const categoryData = mockSettings[category as keyof typeof mockSettings];
      if (!categoryData) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid settings category',
          },
          { status: 400 }
        );
      }
      
      return NextResponse.json({
        success: true,
        data: { [category]: categoryData },
      });
    }

    return NextResponse.json({
      success: true,
      data: mockSettings,
    });
  } catch (error: any) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch settings',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

// PUT /api/settings - Update system settings
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request body
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request body',
        },
        { status: 400 }
      );
    }

    // In real app, this would update the database
    // For now, we'll just simulate updating the settings
    const updatedSettings = { ...mockSettings, ...body };

    return NextResponse.json({
      success: true,
      data: updatedSettings,
      message: 'Settings updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update settings',
        message: error.message,
      },
      { status: 500 }
    );
  }
}