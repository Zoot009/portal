import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get employee info from Clerk userId
    const employee = await prisma.employee.findUnique({
      where: { clerkUserId: userId },
    });

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    // Fetch deleted breaks for this employee
    const deletedBreaks = await prisma.deletedBreakRecord.findMany({
      where: {
        employeeId: employee.id,
      },
      orderBy: {
        deletedAt: "desc",
      },
    });

    return NextResponse.json(deletedBreaks);
  } catch (error) {
    console.error("Error fetching deleted breaks:", error);
    return NextResponse.json(
      { error: "Failed to fetch deleted breaks" },
      { status: 500 }
    );
  }
}
