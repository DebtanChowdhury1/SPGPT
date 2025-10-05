import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Thread } from "@/models/Thread";
import { auth } from "@clerk/nextjs/server";

export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectToDatabase();
    const thread = await Thread.create({ userId });
    return NextResponse.json({ thread });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to create thread" }, { status: 500 });
  }
}
