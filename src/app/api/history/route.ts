import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Chat } from "@/models/Chat";
import { auth } from "@clerk/nextjs/server";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ chats: [] });

    await connectToDatabase();
    const chats = await Chat.find({ userId }).sort({ createdAt: 1 });
    return NextResponse.json({ chats });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ chats: [] });
  }
}
