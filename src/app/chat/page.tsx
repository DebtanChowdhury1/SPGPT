"use client";

import { useState, useEffect, useRef } from "react";
import Sidebar from "@/components/Sidebar";

export default function ChatPage() {
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  // ✅ Persist selected thread across refresh
  useEffect(() => {
    const saved = localStorage.getItem("currentThreadId");
    if (saved) setThreadId(saved);
  }, []);

  useEffect(() => {
    if (threadId) localStorage.setItem("currentThreadId", threadId);
  }, [threadId]);

  // ✅ Load messages when thread changes
  useEffect(() => {
    if (!threadId) return;
    const load = async () => {
      try {
        const res = await fetch(`/api/threads/${threadId}`);
        if (!res.ok) throw new Error("Failed to load messages");
        const data = await res.json();
        setMessages(data.chats || []);
      } catch (err) {
        console.error("Error loading messages:", err);
        setMessages([]);
      }
    };
    load();
  }, [threadId]);

  // ✅ Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // ✅ Send message to Gemini + store in DB
  const sendMessage = async () => {
    if (!input.trim() || !threadId) return;

    const newMsg = { role: "user", content: input };
    setMessages((prev) => [...prev, newMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input, threadId }),
      });

      const data = await res.json();
      if (data.reply) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      }
    } catch (err) {
      console.error("Error sending message:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !loading) sendMessage();
  };

  return (
    <main className="flex h-screen bg-gray-100 text-gray-900 transition-colors duration-300 dark:bg-gray-950 dark:text-gray-100">
      {/* Sidebar with thread list */}
      <Sidebar onSelectThread={setThreadId} currentThread={threadId} />

      <div className="flex flex-1 flex-col bg-white transition-colors duration-300 dark:bg-gray-900">
        {!threadId ? (
          // Empty state when no thread selected
          <div className="flex flex-1 flex-col items-center justify-center">
            <p className="text-gray-500 dark:text-gray-400">Select or start a new chat 🧠</p>
          </div>
        ) : (
          <>
            {/* Chat window */}
            <div
              ref={chatRef}
              className="flex-1 space-y-3 overflow-y-auto p-4"
            >
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`max-w-lg rounded-2xl p-3 ${
                    m.role === "user"
                      ? "ml-auto bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-900 dark:bg-gray-800 dark:text-gray-100"
                  }`}
                >
                  {m.content}
                </div>
              ))}
              {loading && <p className="text-sm text-gray-500 dark:text-gray-400">SPGPT is thinking...</p>}
            </div>

            {/* Input bar */}
            <div className="flex gap-2 border-t border-gray-200 p-4 dark:border-gray-800">
              <input
                type="text"
                placeholder="Ask SPGPT anything..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                className="flex-1 rounded-lg bg-gray-50 p-3 text-gray-900 outline-none transition-colors dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-400"
              />
              <button
                onClick={sendMessage}
                disabled={loading}
                className="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
