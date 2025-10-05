import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Chat } from "@/models/Chat";

export async function GET() {
  await connectToDatabase();

  const chats = await Chat.find().limit(2); // just fetch sample
  return NextResponse.json({ ok: true, total: chats.length });
}
