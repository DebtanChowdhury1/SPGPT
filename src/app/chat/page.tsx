"use client";

import { useState, useEffect, useRef, type KeyboardEvent } from "react";
import Sidebar, { type SidebarThread } from "@/components/Sidebar";
import {
  Bot,
  Loader2,
  Menu,
  Send,
  Sparkles,
  User,
  Wand2,
  X,
} from "lucide-react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const quickPrompts = [
  {
    title: "Brainstorm campaign ideas",
    description: "Generate creative angles for my upcoming product launch.",
    prompt: "Help me brainstorm five creative campaign ideas for launching our new AI productivity app.",
  },
  {
    title: "Explain a complex topic",
    description: "Break down technical subjects into friendly language.",
    prompt: "Explain large language models to a beginner with a relatable real-world example.",
  },
  {
    title: "Summarize this text",
    description: "Turn long content into key bullet points.",
    prompt: "Summarize the key takeaways from the latest AI trends report in bullet points.",
  },
  {
    title: "Write helpful code",
    description: "Get tailored snippets or debugging help.",
    prompt: "Write a reusable React hook that debounces a value with TypeScript types.",
  },
];

const isJsonResponse = (response: Response) =>
  response.headers.get("content-type")?.includes("application/json") ?? false;

export default function ChatPage() {
  const [threadId, setThreadId] = useState<string | null>(null);
  const [threadTitle, setThreadTitle] = useState("Select a chat");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const skipFetchRef = useRef(false);

  useEffect(() => {
    const saved = localStorage.getItem("currentThreadId");
    if (saved) {
      setThreadId(saved);
    }
  }, []);

  const handleSelectThread = (thread: SidebarThread | null) => {
    const nextId = thread?._id ?? null;
    setThreadId(nextId);
    setThreadTitle(thread?.title ?? "Start a new chat");
    setMessages([]);

    if (nextId) {
      localStorage.setItem("currentThreadId", nextId);
    } else {
      localStorage.removeItem("currentThreadId");
    }

    setIsSidebarOpen(false);
  };

  const ensureActiveThread = async (): Promise<string | null> => {
    if (threadId) return threadId;

    try {
      const res = await fetch("/api/threads/new", { method: "POST" });
      if (!isJsonResponse(res)) {
        throw new Error("Failed to create thread");
      }

      const data = await res.json();
      if (!res.ok || !data.thread?._id) {
        throw new Error(data.error || "Failed to create thread");
      }

      skipFetchRef.current = true;
      handleSelectThread(data.thread);
      return data.thread._id as string;
    } catch (err) {
      console.error("Error creating thread:", err);
      return null;
    }
  };

  useEffect(() => {
    if (!threadId) return;

    if (skipFetchRef.current) {
      skipFetchRef.current = false;
      return;
    }

    const loadMessages = async () => {
      setHistoryLoading(true);
      try {
        const res = await fetch(`/api/threads/${threadId}`);
        if (!isJsonResponse(res)) {
          throw new Error("Failed to load messages");
        }
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to load messages");
        }
        setMessages(data.chats || []);
        setThreadTitle(data.thread?.title || "New Chat");
      } catch (err) {
        console.error("Error loading messages:", err);
        setMessages([]);
      } finally {
        setHistoryLoading(false);
      }
    };

    loadMessages();
  }, [threadId]);

  useEffect(() => {
    if (!chatRef.current) return;
    chatRef.current.scrollTo({
      top: chatRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
  }, [input]);

  const sendMessage = async () => {
    const content = input.trim();
    if (!content || loading) return;

    const activeThreadId = threadId ?? (await ensureActiveThread());
    if (!activeThreadId) return;

    const userMessage: Message = { role: "user", content };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content, threadId: activeThreadId }),
      });

      if (!isJsonResponse(res)) {
        throw new Error("Failed to send message");
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to send message");
      }

      if (data.reply) {
        const assistantMessage: Message = { role: "assistant", content: data.reply };
        setMessages((prev) => [...prev, assistantMessage]);
      }
    } catch (err) {
      console.error("Error sending message:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            err instanceof Error
              ? `⚠️ ${err.message}`
              : "Sorry, something went wrong. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  const handlePromptClick = async (prompt: string) => {
    if (!threadId) {
      const created = await ensureActiveThread();
      if (!created) return;
    }

    setInput(prompt);
    textareaRef.current?.focus();
  };

  return (
    <main className="flex h-screen bg-slate-50 text-slate-900 transition-colors duration-300 dark:bg-[#030304] dark:text-white">
      <Sidebar
        onSelectThread={handleSelectThread}
        currentThreadId={threadId}
        className="hidden lg:flex"
      />

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200/70 bg-white/80 px-4 py-4 backdrop-blur transition-colors duration-300 dark:border-white/5 dark:bg-black/40 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-600 transition hover:bg-slate-200/70 dark:border-white/10 dark:bg-white/5 dark:text-white/80 dark:hover:bg-white/10 lg:hidden"
              aria-label="Open conversations"
            >
              <Menu size={18} />
            </button>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-white/40">Chat thread</p>
              <h1 className="text-lg font-semibold text-slate-900 dark:text-white">{threadTitle}</h1>
            </div>
          </div>

          <div className="hidden items-center gap-2 text-sm font-medium text-slate-600 dark:text-white/70 lg:flex">
            <Sparkles size={16} className="text-emerald-500 dark:text-emerald-300" />
            Powered by Gemini 2.0 Flash
          </div>
        </header>

        <div className="relative flex-1 overflow-hidden">
          <div ref={chatRef} className="h-full overflow-y-auto">
            <div className="mx-auto flex w-full max-w-3xl flex-col">
              {!threadId ? (
                <section className="flex flex-1 items-center justify-center px-6 py-12 text-center">
                  <div>
                    <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
                      <Sparkles size={28} />
                    </div>
                    <h2 className="text-3xl font-semibold tracking-tight">Welcome to SPGPT</h2>
                    <p className="mt-2 text-base text-slate-600 dark:text-white/70">
                      Select an existing conversation or start a fresh chat to begin exploring.
                    </p>
                    <div className="mt-8 grid gap-3 sm:grid-cols-2">
                      {quickPrompts.map((item) => (
                        <button
                          key={item.title}
                          type="button"
                          onClick={() => handlePromptClick(item.prompt)}
                          className="rounded-2xl border border-slate-200/70 bg-white px-5 py-4 text-left transition hover:border-emerald-300/40 hover:bg-emerald-50 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-emerald-500/10"
                        >
                          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-300">
                            <Wand2 size={16} />
                            <span className="text-xs font-semibold uppercase tracking-wide">Quick start</span>
                          </div>
                          <p className="mt-2 text-sm font-medium text-slate-900 dark:text-white">{item.title}</p>
                          <p className="text-xs text-slate-500 dark:text-white/60">{item.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </section>
              ) : historyLoading ? (
                <div className="flex flex-1 items-center justify-center py-20 text-slate-500 dark:text-white/60">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Loading conversation...
                </div>
              ) : (
                <>
                  {messages.length === 0 ? (
                    <section className="px-6 py-10">
                      <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200/70 bg-white p-8 shadow-xl transition-colors duration-300 dark:border-white/10 dark:bg-white/[0.03]">
                        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-300">
                          <Wand2 size={18} />
                          <span className="text-sm font-semibold uppercase tracking-wide">Inspiration</span>
                        </div>
                        <h3 className="mt-3 text-xl font-semibold text-slate-900 dark:text-white">What would you like to explore?</h3>
                        <p className="mt-2 text-sm text-slate-600 dark:text-white/60">
                          Try one of these starter prompts or ask anything you have in mind.
                        </p>
                        <div className="mt-6 grid gap-3 sm:grid-cols-2">
                          {quickPrompts.map((item) => (
                            <button
                              key={item.title}
                              type="button"
                              onClick={() => handlePromptClick(item.prompt)}
                              className="rounded-2xl border border-slate-200/70 bg-white px-4 py-4 text-left transition hover:border-emerald-400/40 hover:bg-emerald-50 dark:border-white/10 dark:bg-[#0a0a0f] dark:hover:bg-emerald-500/5"
                            >
                              <p className="text-sm font-medium text-slate-900 dark:text-white">{item.title}</p>
                              <p className="mt-1 text-xs text-slate-600 dark:text-white/60">{item.description}</p>
                            </button>
                          ))}
                        </div>
                      </div>
                    </section>
                  ) : (
                    messages.map((message, index) => (
                      <article
                        key={`${message.role}-${index}-${message.content.slice(0, 8)}`}
                        className={`px-4 transition-colors duration-300 ${message.role === "assistant" ? "bg-slate-100 dark:bg-white/[0.02]" : ""}`}
                      >
                        <div className="mx-auto flex w-full max-w-3xl gap-4 px-2 py-8">
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                              message.role === "assistant"
                                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"
                                : "bg-slate-900/5 text-slate-900 dark:bg-white/10 dark:text-white"
                            }`}
                          >
                            {message.role === "assistant" ? <Bot size={20} /> : <User size={20} />}
                          </div>
                          <p className="flex-1 whitespace-pre-wrap leading-relaxed text-slate-700 dark:text-white/90">{message.content}</p>
                        </div>
                      </article>
                    ))
                  )}

                  {loading && (
                    <article className="px-4">
                      <div className="mx-auto flex w-full max-w-3xl gap-4 px-2 py-8">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-300">
                          <Bot size={20} className="animate-pulse" />
                        </div>
                        <div className="flex-1 text-slate-500 dark:text-white/60">SPGPT is composing a response…</div>
                      </div>
                    </article>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200/70 bg-white/80 px-4 py-4 backdrop-blur transition-colors duration-300 dark:border-white/10 dark:bg-[#060608]/90 lg:px-8">
          <div className="mx-auto w-full max-w-3xl rounded-3xl border border-slate-200/70 bg-white p-4 shadow-2xl backdrop-blur transition-colors duration-300 dark:border-white/10 dark:bg-black/40">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={threadId ? "Ask SPGPT anything..." : "Select or create a chat to start messaging."}
              rows={1}
              className="max-h-[200px] w-full resize-none bg-transparent text-sm leading-relaxed text-slate-700 placeholder:text-slate-400 focus:outline-none dark:text-white dark:placeholder:text-white/40"
            />

            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-xs text-slate-500 dark:text-white/40">
                SPGPT may display inaccuracies. Verify critical information.
              </p>
              <button
                type="button"
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-white/10 dark:disabled:text-white/30"
                aria-label="Send message"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send size={18} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setIsSidebarOpen(false)}
            aria-hidden="true"
          />
          <div className="relative ml-auto h-full w-[280px]">
            <Sidebar
              onSelectThread={handleSelectThread}
              currentThreadId={threadId}
              className="h-full"
            />
            <button
              type="button"
              onClick={() => setIsSidebarOpen(false)}
              className="absolute right-3 top-3 rounded-full bg-slate-200 p-2 text-slate-700 transition hover:bg-slate-300 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
              aria-label="Close conversations"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
