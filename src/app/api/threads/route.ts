import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Thread } from "@/models/Thread";
import { auth } from "@clerk/nextjs/server";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ threads: [] });

    await connectToDatabase();
    const threads = await Thread.find({ userId }).sort({ updatedAt: -1 });
    return NextResponse.json({ threads });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ threads: [] });
  }
}
