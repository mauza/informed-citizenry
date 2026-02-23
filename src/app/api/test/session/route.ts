import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, sessions } from "@/db/schema";
import { nanoid } from "nanoid";

export async function POST(request: NextRequest) {
  if (process.env.E2E_TESTING !== "true") {
    return NextResponse.json(
      { error: "Test endpoints are only available in E2E testing mode" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { email = "test@example.com", name = "Test User" } = body;

    const userId = nanoid();
    const sessionToken = nanoid();
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await db.insert(users).values({
      id: userId,
      email,
      name,
      emailVerified: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await db.insert(sessions).values({
      sessionToken,
      userId,
      expires,
    });

    const response = NextResponse.json({
      success: true,
      userId,
      sessionToken,
    });

    response.cookies.set({
      name: "authjs.session-token",
      value: sessionToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires,
    });

    return response;
  } catch (error) {
    console.error("Failed to create test session:", error);
    return NextResponse.json(
      { error: "Failed to create test session" },
      { status: 500 }
    );
  }
}
