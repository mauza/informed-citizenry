"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { checkRateLimit } from "@/lib/rate-limit";

const profileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  address: z.string().max(300).optional(),
});

export async function updateProfile(formData: FormData): Promise<{ success?: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "You must be signed in." };
  }

  // Rate limiting: max 10 profile updates per minute per user
  const rateLimit = await checkRateLimit(`profile:${session.user.id}`, {
    maxRequests: 10,
    windowMs: 60000,
  });
  
  if (!rateLimit.success) {
    return { error: "Rate limit exceeded. Please try again later." };
  }

  const name = formData.get("name");
  const address = formData.get("address");

  const parsed = profileSchema.safeParse({
    name: name === null ? undefined : name,
    address: address === null ? undefined : address,
  });

  if (!parsed.success) {
    return { error: "Invalid input. Please check your data and try again." };
  }

  // Check if there's any actual data to update
  const hasDataToUpdate = parsed.data.name !== undefined || parsed.data.address !== undefined;
  if (!hasDataToUpdate) {
    return { error: "No data provided to update." };
  }

  try {
    await db
      .update(users)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(users.id, session.user.id));

    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    console.error("Profile update error:", error);
    return { error: "Failed to update profile. Please try again." };
  }
}
