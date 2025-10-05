import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Chat } from "@/models/Chat";
import { Thread } from "@/models/Thread";
import { auth } from "@clerk/nextjs/server";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { message, threadId } = await req.json();
    await connectToDatabase();

    // Check that thread exists
    const thread = await Thread.findOne({ _id: threadId, userId });
    if (!thread)
      return NextResponse.json({ error: "Invalid thread" }, { status: 400 });

    // Save user message
    await Chat.create({ userId, threadId, role: "user", content: message });

    // 🔥 Auto-rename thread if it's still "New Chat"
    if (thread.title === "New Chat") {
      const cleanTitle = message.trim().slice(0, 50);
      await Thread.findByIdAndUpdate(threadId, { title: cleanTitle });
    }

    // === Gemini 2.0 Flash API ===
    const apiKey = process.env.GEMINI_API_KEY!;
    const endpoint =
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

    const response = await fetch(`${endpoint}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: message }] }],
      }),
    });

    const data = await response.json();
    const reply =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "No response from Gemini 2.0.";

    // Save assistant message
    await Chat.create({ userId, threadId, role: "assistant", content: reply });

    return NextResponse.json({ reply });
  } catch (err) {
    console.error("Chat API Error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
