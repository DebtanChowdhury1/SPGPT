"use client";

import {
  useState,
  useEffect,
  useRef,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import Sidebar, { type SidebarThread } from "@/components/Sidebar";
import {
  Bot,
  FileText,
  Loader2,
  Menu,
  Paperclip,
  Send,
  Sparkles,
  Timer,
  User,
  Wand2,
  X,
} from "lucide-react";

type AttachmentMeta = {
  name: string;
  type?: string;
  size?: number;
};

type PendingAttachment = AttachmentMeta & { data: string };

export type Message = {
  role: "user" | "assistant";
  content: string;
  attachment?: AttachmentMeta | null;
};

const quickPrompts = [
  {
    title: "Brainstorm campaign ideas",
    description: "Generate creative angles for my upcoming product launch.",
    prompt:
      "Help me brainstorm five creative campaign ideas for launching our new AI productivity app.",
  },
  {
    title: "Explain a complex topic",
    description: "Break down technical subjects into friendly language.",
    prompt:
      "Explain large language models to a beginner with a relatable real-world example.",
  },
  {
    title: "Summarize this text",
    description: "Turn long content into key bullet points.",
    prompt:
      "Summarize the key takeaways from the latest AI trends report in bullet points.",
  },
  {
    title: "Write helpful code",
    description: "Get tailored snippets or debugging help.",
    prompt: "Write a reusable React hook that debounces a value with TypeScript types.",
  },
];

const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024; // 5 MB

const formatFileSize = (bytes?: number) => {
  if (!bytes || Number.isNaN(bytes)) return "";
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

const readFileAsBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Unsupported file result"));
        return;
      }
      const [, base64 = ""] = result.split("base64,");
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error ?? new Error("Unable to read file"));
    reader.readAsDataURL(file);
  });

const isJsonResponse = (response: Response) =>
  response.headers.get("content-type")?.includes("application/json") ?? false;

export default function ChatWorkspace() {
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
  const [isTemporary, setIsTemporary] = useState(false);
  const previousThreadIdRef = useRef<string | null>(null);
  const [pendingAttachment, setPendingAttachment] = useState<PendingAttachment | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("currentThreadId");
    if (saved) {
      setThreadId(saved);
      previousThreadIdRef.current = saved;
    }
  }, []);

  const handleSelectThread = (thread: SidebarThread | null) => {
    setIsTemporary(false);
    const nextId = thread?._id ?? null;
    setThreadId(nextId);
    setThreadTitle(thread?.title ?? "Start a new chat");
    setMessages([]);

    if (nextId) {
      previousThreadIdRef.current = nextId;
      localStorage.setItem("currentThreadId", nextId);
    } else {
      previousThreadIdRef.current = null;
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

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_ATTACHMENT_BYTES) {
      setError(`Attachment is too large. Maximum size is ${formatFileSize(MAX_ATTACHMENT_BYTES)}.`);
      event.target.value = "";
      return;
    }

    try {
      const data = await readFileAsBase64(file);
      setPendingAttachment({
        name: file.name,
        size: file.size,
        type: file.type || "application/octet-stream",
        data,
      });
      setError(null);
    } catch (err) {
      console.error("File read error:", err);
      setError("We couldn't read that file. Please try another format.");
    } finally {
      event.target.value = "";
    }
  };

  const removeAttachment = () => {
    setPendingAttachment(null);
  };

  const startTemporaryChat = () => {
    previousThreadIdRef.current = threadId;
    setIsTemporary(true);
    setThreadId(null);
    setThreadTitle("Temporary chat");
    setMessages([]);
    setHistoryLoading(false);
    setIsSidebarOpen(false);
    localStorage.removeItem("currentThreadId");
    setError(null);
  };

  const exitTemporaryChat = () => {
    setIsTemporary(false);
    setMessages([]);
    const previousId = previousThreadIdRef.current;
    if (previousId) {
      setHistoryLoading(true);
      setThreadId(previousId);
      setThreadTitle("Loading chat...");
      localStorage.setItem("currentThreadId", previousId);
    } else {
      setHistoryLoading(false);
      setThreadId(null);
      setThreadTitle("Select a chat");
      localStorage.removeItem("currentThreadId");
    }
    setError(null);
  };

  const sendMessage = async () => {
    if (loading) return;

    const content = input.trim();
    if (!content && !pendingAttachment) return;

    setError(null);
    setLoading(true);

    let activeThreadId = threadId;

    if (!isTemporary) {
      activeThreadId = threadId ?? (await ensureActiveThread());
      if (!activeThreadId) {
        setLoading(false);
        return;
      }
    }

    const attachmentPayload = pendingAttachment;
    const sanitizedAttachment = attachmentPayload
      ? {
          name: attachmentPayload.name,
          size: attachmentPayload.size,
          type: attachmentPayload.type,
        }
      : undefined;

    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content,
        attachment: sanitizedAttachment,
      },
    ]);
    setInput("");
    setPendingAttachment(null);

    const payload: Record<string, unknown> = {
      message: content,
    };

    if (attachmentPayload) {
      payload.attachment = {
        name: attachmentPayload.name,
        size: attachmentPayload.size,
        type: attachmentPayload.type,
        data: attachmentPayload.data,
      };
    }

    if (!isTemporary && activeThreadId) {
      payload.threadId = activeThreadId;
    }

    try {
      const res = await fetch(isTemporary ? "/api/chat/temporary" : "/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
              ? `Sorry, something went wrong: ${err.message}`
              : "Sorry, something went wrong. Please try again.",
        },
      ]);
      if (err instanceof Error) {
        setError(err.message);
      }
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
    if (!threadId && !isTemporary) {
      const created = await ensureActiveThread();
      if (!created) return;
    }

    setInput(prompt);
    textareaRef.current?.focus();
  };

  return (
    <main className="flex h-screen bg-gradient-to-br from-[#05060d] via-[#07090f] to-[#04050a] text-slate-100">
      <Sidebar onSelectThread={handleSelectThread} currentThreadId={threadId} className="hidden lg:flex" />

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-white/5 bg-white/5 px-4 py-4 backdrop-blur lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/10 text-slate-200 transition hover:bg-white/20 lg:hidden"
              aria-label="Open conversations"
            >
              <Menu size={18} />
            </button>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">
                {isTemporary ? "Temporary session" : "Chat thread"}
              </p>
              <h1 className="text-lg font-semibold text-white">{threadTitle}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={isTemporary ? exitTemporaryChat : startTemporaryChat}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                isTemporary
                  ? "border-emerald-400/60 bg-emerald-500/10 text-emerald-200"
                  : "border-white/10 text-slate-200 hover:border-emerald-400 hover:text-emerald-200"
              }`}
            >
              <Timer size={14} />
              {isTemporary ? "Exit temporary chat" : "Start temporary chat"}
            </button>
          </div>
        </header>

        <div className="relative flex-1 overflow-hidden">
          <div ref={chatRef} className="h-full overflow-y-auto">
            <div className="mx-auto flex w-full max-w-3xl flex-col">
              {!threadId && !isTemporary ? (
                <section className="flex flex-1 items-center justify-center px-6 py-12 text-center text-slate-300">
                  <div>
                    <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-300">
                      <Sparkles size={28} />
                    </div>
                    <h2 className="text-3xl font-semibold tracking-tight text-white">Welcome to SPGPT</h2>
                    <p className="mt-2 text-base text-slate-400">
                      Select an existing conversation, start a fresh chat, or launch a temporary session to begin exploring.
                    </p>
                    <div className="mt-8 grid gap-3 sm:grid-cols-2">
                      {quickPrompts.map((item) => (
                        <button
                          key={item.title}
                          type="button"
                          onClick={() => handlePromptClick(item.prompt)}
                          className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-left transition hover:border-emerald-400/50 hover:bg-white/10"
                        >
                          <div className="flex items-center gap-2 text-emerald-300">
                            <Wand2 size={16} />
                            <span className="text-xs font-semibold uppercase tracking-wide">Quick start</span>
                          </div>
                          <p className="mt-2 text-sm font-medium text-white">{item.title}</p>
                          <p className="text-xs text-slate-400">{item.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </section>
              ) : historyLoading ? (
                <div className="flex flex-1 items-center justify-center py-20 text-slate-400">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Loading conversation...
                </div>
              ) : (
                <>
                  {messages.length === 0 ? (
                    <section className="px-6 py-10">
                      <div className="mx-auto max-w-2xl rounded-3xl border border-white/10 bg-white/5 p-8 shadow-[0_20px_50px_rgba(8,12,20,0.35)]">
                        <div className="flex items-center gap-2 text-emerald-300">
                          <Wand2 size={18} />
                          <span className="text-sm font-semibold uppercase tracking-wide">Inspiration</span>
                        </div>
                        <h3 className="mt-3 text-xl font-semibold text-white">What would you like to explore?</h3>
                        <p className="mt-2 text-sm text-slate-400">
                          Try one of these starter prompts or ask anything you have in mind.
                        </p>
                        <div className="mt-6 grid gap-3 sm:grid-cols-2">
                          {quickPrompts.map((item) => (
                            <button
                              key={item.title}
                              type="button"
                              onClick={() => handlePromptClick(item.prompt)}
                              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-left transition hover:border-emerald-400/40 hover:bg-white/10"
                            >
                              <p className="text-sm font-medium text-white">{item.title}</p>
                              <p className="mt-1 text-xs text-slate-400">{item.description}</p>
                            </button>
                          ))}
                        </div>
                      </div>
                    </section>
                  ) : (
                    messages.map((message, index) => {
                      const isAssistant = message.role === "assistant";
                      const keySeed = (message.content || message.attachment?.name || "message").slice(0, 8);
                      return (
                        <article key={`${message.role}-${index}-${keySeed}`} className="px-4 transition-colors duration-300">
                          <div className="mx-auto flex w-full max-w-3xl gap-4 px-2 py-8">
                            <div
                              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                                isAssistant
                                  ? "bg-emerald-500/15 text-emerald-200"
                                  : "bg-white/10 text-white"
                              }`}
                            >
                              {isAssistant ? <Bot size={20} /> : <User size={20} />}
                            </div>
                            <div className="flex-1 space-y-3">
                              {message.content && (
                                <p className="whitespace-pre-wrap leading-relaxed text-slate-200">
                                  {message.content}
                                </p>
                              )}
                              {message.attachment?.name && (
                                <div
                                  className={`inline-flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition ${
                                    isAssistant
                                      ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-100"
                                      : "border-white/10 bg-white/5 text-slate-200"
                                  }`}
                                >
                                  <FileText size={16} />
                                  <div>
                                    <p className="font-medium">{message.attachment.name}</p>
                                    {typeof message.attachment.size === "number" && message.attachment.size > 0 && (
                                      <p className="text-xs text-slate-400">
                                        {formatFileSize(message.attachment.size)}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </article>
                      );
                    })
                  )}

                  {loading && (
                    <article className="px-4">
                      <div className="mx-auto flex w-full max-w-3xl gap-4 px-2 py-8">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-200">
                          <Bot size={20} className="animate-pulse" />
                        </div>
                        <div className="flex-1 text-slate-400">SPGPT is composing a response…</div>
                      </div>
                    </article>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-white/5 bg-[#080b12]/80 px-4 py-4 backdrop-blur lg:px-8">
          <div className="mx-auto w-full max-w-3xl rounded-3xl border border-white/10 bg-white/5 p-4 shadow-[0_15px_45px_rgba(4,6,12,0.45)] backdrop-blur">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={!threadId && !isTemporary ? "Select or create a chat to start messaging." : "Ask SPGPT anything..."}
              rows={1}
              className="max-h-[200px] w-full resize-none bg-transparent text-sm leading-relaxed text-slate-200 placeholder:text-slate-500 focus:outline-none"
            />

            <div className="mt-3 flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-dashed border-white/15 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-emerald-400/60 hover:text-emerald-200">
                  <Paperclip size={14} />
                  <span>Attach file</span>
                  <input type="file" onChange={handleFileChange} className="hidden" />
                </label>
                {pendingAttachment && (
                  <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-emerald-400/50 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-200">
                    <FileText size={14} />
                    <span className="max-w-[160px] truncate font-medium">{pendingAttachment.name}</span>
                    <span className="text-[11px] opacity-80">{formatFileSize(pendingAttachment.size)}</span>
                    <button
                      type="button"
                      onClick={removeAttachment}
                      className="rounded-full p-1 transition hover:bg-emerald-500/20"
                      aria-label="Remove attachment"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-slate-500">
                  SPGPT may display inaccuracies. Verify critical information.
                </p>
                <button
                  type="button"
                  onClick={sendMessage}
                  disabled={loading || (!input.trim() && !pendingAttachment)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/30"
                  aria-label="Send message"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send size={18} />}
                </button>
              </div>
            </div>
            {error && (
              <p className="mt-2 text-xs text-rose-400">
                {error}
              </p>
            )}
          </div>
        </div>
      </div>

      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="absolute inset-0 bg-black/70" onClick={() => setIsSidebarOpen(false)} aria-hidden="true" />
          <div className="relative ml-auto h-full w-[280px]">
            <Sidebar onSelectThread={handleSelectThread} currentThreadId={threadId} className="h-full" />
            <button
              type="button"
              onClick={() => setIsSidebarOpen(false)}
              className="absolute right-3 top-3 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
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
