import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Chat } from "@/models/Chat";
import { Thread } from "@/models/Thread";
import { auth } from "@clerk/nextjs/server";

const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024; // 5 MB

const approximateBytesFromBase64 = (data: string) =>
  Math.floor((data.length * 3) / 4);

const formatFileSize = (bytes?: number) => {
  if (!bytes || Number.isNaN(bytes)) return "unknown size";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  const formatted = size >= 10 || unitIndex === 0 ? size.toFixed(0) : size.toFixed(1);
  return `${formatted} ${units[unitIndex]}`;
};

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const threadId: string | undefined = body.threadId;
    const textMessage = typeof body.message === "string" ? body.message : "";
    const rawAttachment = body.attachment as
      | {
          name?: string;
          type?: string;
          size?: number | string;
          data?: string;
        }
      | undefined;

    if (!threadId) {
      return NextResponse.json({ error: "Thread ID is required" }, { status: 400 });
    }

    const normalizedAttachment = rawAttachment
      ? {
          name: rawAttachment.name,
          type: rawAttachment.type,
          size:
            typeof rawAttachment.size === "number"
              ? rawAttachment.size
              : typeof rawAttachment.size === "string"
              ? Number(rawAttachment.size)
              : undefined,
          data: typeof rawAttachment.data === "string" ? rawAttachment.data : undefined,
        }
      : undefined;

    if (!textMessage.trim() && !normalizedAttachment) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    if (normalizedAttachment?.data) {
      const approxBytes = approximateBytesFromBase64(normalizedAttachment.data);
      if (approxBytes > MAX_ATTACHMENT_BYTES) {
        return NextResponse.json(
          {
            error: `Attachments must be ${formatFileSize(MAX_ATTACHMENT_BYTES)} or smaller.`,
          },
          { status: 413 }
        );
      }
    }

    await connectToDatabase();

    const thread = await Thread.findOne({ _id: threadId, userId });
    if (!thread) {
      return NextResponse.json({ error: "Invalid thread" }, { status: 400 });
    }

    await Chat.create({
      userId,
      threadId,
      role: "user",
      content: textMessage,
      attachment: normalizedAttachment
        ? {
            name: normalizedAttachment.name,
            type: normalizedAttachment.type,
            size: normalizedAttachment.size,
          }
        : undefined,
    });

    if (thread.title === "New Chat" && textMessage.trim()) {
      const cleanTitle = textMessage.trim().slice(0, 50);
      await Thread.findByIdAndUpdate(threadId, { title: cleanTitle });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Missing Gemini API key");
    }

    const endpoint =
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

    const parts: Array<Record<string, unknown>> = [];

    if (textMessage) {
      parts.push({ text: textMessage });
    }

    if (normalizedAttachment?.data) {
      parts.push({
        text: `The user provided an attachment named "${normalizedAttachment.name || "attachment"}" (${normalizedAttachment.type || "unknown type"}, ${formatFileSize(
          normalizedAttachment.size
        )}). Use its contents to support your answer.`,
      });
      parts.push({
        inlineData: {
          mimeType: normalizedAttachment.type || "application/octet-stream",
          data: normalizedAttachment.data,
        },
      });
    } else if (normalizedAttachment?.name) {
      parts.push({
        text: `The user referenced a file named "${normalizedAttachment.name}", but its contents were unavailable.`,
      });
    }

    if (parts.length === 0) {
      parts.push({
        text: "The user needs help, but no prompt text or attachment was provided.",
      });
    }

    const response = await fetch(`${endpoint}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "Gemini API request failed");
    }

    const data = await response.json();
    const reply =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "No response from Gemini 2.0.";

    await Chat.create({ userId, threadId, role: "assistant", content: reply });

    return NextResponse.json({ reply });
  } catch (err) {
    console.error("Chat API Error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}