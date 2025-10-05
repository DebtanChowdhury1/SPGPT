import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Chat } from "@/models/Chat";
import { auth } from "@clerk/nextjs/server";

export async function GET(req: Request, context: { params: Promise<{ threadId: string }> }) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ chats: [] });

    // ✅ Await params before using
    const { threadId } = await context.params;

    await connectToDatabase();
    const chats = await Chat.find({ userId, threadId }).sort({ createdAt: 1 });
    return NextResponse.json({ chats });
  } catch (err) {
    console.error("Thread fetch error:", err);
    return NextResponse.json({ chats: [] });
  }
}
