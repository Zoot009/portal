
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const user = await prisma.employee.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Return empty data since gamification tables were removed
    return NextResponse.json({
      success: true,
      employees: [],
    });
  } catch (error) {
    console.error("Error fetching employee coins:", error);
    return NextResponse.json(
      { error: "Failed to fetch employee coins data" },
      { status: 500 }
    );
  }
}
