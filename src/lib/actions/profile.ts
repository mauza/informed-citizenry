"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const profileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  address: z.string().max(300).optional(),
});

export async function updateProfile(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;

  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    address: formData.get("address"),
  });

  if (!parsed.success) return;

  await db
    .update(users)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(users.id, session.user.id));

  revalidatePath("/settings");
}
