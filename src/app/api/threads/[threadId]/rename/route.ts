import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Thread } from "@/models/Thread";
import { auth } from "@clerk/nextjs/server";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ threadId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { threadId } = await context.params;
    const { title } = await req.json();

    await connectToDatabase();
    const updated = await Thread.findOneAndUpdate(
      { _id: threadId, userId },
      { title },
      { new: true }
    );

    return NextResponse.json({ thread: updated });
  } catch (err) {
    console.error("Rename error:", err);
    return NextResponse.json({ error: "Rename failed" }, { status: 500 });
  }
}
