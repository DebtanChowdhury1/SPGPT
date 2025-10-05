import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Thread } from "@/models/Thread";
import { Chat } from "@/models/Chat";
import { auth } from "@clerk/nextjs/server";

export async function DELETE(
  req: Request,
  context: { params: Promise<{ threadId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { threadId } = await context.params;
    await connectToDatabase();

    await Chat.deleteMany({ threadId, userId });
    await Thread.deleteOne({ _id: threadId, userId });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete error:", err);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
