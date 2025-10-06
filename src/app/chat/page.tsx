"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type KeyboardEvent,
  ChangeEvent,
} from "react";
import Sidebar, { type SidebarThread } from "@/components/Sidebar";
import {
  Bot,
  Flame,
  Loader2,
  Menu,
  Paperclip,
  Plus,
  Send,
  Sparkles,
  User,
  Wand2,
  X,
} from "lucide-react";

interface AttachmentMeta {
  name: string;
  size: number;
  type: string;
}

type Message = {
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

const formatFileSize = (bytes: number) => {
  if (!bytes) return "0 B";
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);
  return `${size.toFixed(size > 10 || size === Math.floor(size) ? 0 : 1)} ${sizes[i]}`;
};

export default function ChatPage() {
  const [threadId, setThreadId] = useState<string | null>(null);
  const [threadTitle, setThreadTitle] = useState("New chat");
  const [messages, setMessages] = useState<Message[]>([]);
  const [temporaryMessages, setTemporaryMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [isTemporaryChat, setIsTemporaryChat] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const skipFetchRef = useRef(false);

  useEffect(() => {
    const saved = localStorage.getItem("currentThreadId");
    if (saved) {
      setThreadId(saved);
    }
  }, []);

  const handleSelectThread = useCallback((thread: SidebarThread | null) => {
    setIsTemporaryChat(false);
    setTemporaryMessages([]);
    const nextId = thread?._id ?? null;
    setThreadId(nextId);
    setThreadTitle(thread?.title ?? "New chat");
    setMessages([]);

    if (nextId) {
      localStorage.setItem("currentThreadId", nextId);
    } else {
      localStorage.removeItem("currentThreadId");
    }

    setIsSidebarOpen(false);
  }, []);

  const handleStartTemporaryChat = useCallback(() => {
    setIsTemporaryChat(true);
    setThreadId(null);
    setThreadTitle("Temporary chat");
    setMessages([]);
    setTemporaryMessages([]);
    setAttachedFile(null);
    localStorage.removeItem("currentThreadId");
    setIsSidebarOpen(false);
  }, []);

  const ensureActiveThread = useCallback(async (): Promise<string | null> => {
    if (isTemporaryChat) return null;
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
  }, [handleSelectThread, isTemporaryChat, threadId]);

  useEffect(() => {
    if (isTemporaryChat) return;
    if (!threadId) {
      void ensureActiveThread();
    }
  }, [threadId, isTemporaryChat, ensureActiveThread]);

  useEffect(() => {
    if (!threadId || isTemporaryChat) return;

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
        setThreadTitle(data.thread?.title || "New chat");
      } catch (err) {
        console.error("Error loading messages:", err);
        setMessages([]);
      } finally {
        setHistoryLoading(false);
      }
    };

    loadMessages();
  }, [threadId, isTemporaryChat]);

  const displayedMessages = isTemporaryChat ? temporaryMessages : messages;

  useEffect(() => {
    if (!chatRef.current) return;
    chatRef.current.scrollTo({
      top: chatRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [displayedMessages, loading]);

  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
  }, [input]);

  const sendMessage = async () => {
    if (loading) return;
    const content = input.trim();
    if (!content && !attachedFile) return;

    const attachmentMeta: AttachmentMeta | undefined = attachedFile
      ? {
          name: attachedFile.name,
          size: attachedFile.size,
          type: attachedFile.type || "application/octet-stream",
        }
      : undefined;

    let activeThreadId = threadId;
    if (!isTemporaryChat) {
      activeThreadId = threadId ?? (await ensureActiveThread());
      if (!activeThreadId) return;
    }

    const userMessage: Message = {
      role: "user",
      content,
      attachment: attachmentMeta,
    };

    if (isTemporaryChat) {
      setTemporaryMessages((prev) => [...prev, userMessage]);
    } else {
      setMessages((prev) => [...prev, userMessage]);
    }

    setInput("");
    setAttachedFile(null);
    setLoading(true);

    try {
      const endpoint = isTemporaryChat ? "/api/chat/temporary" : "/api/chat";
      const payload = isTemporaryChat
        ? { message: content, attachment: attachmentMeta }
        : { message: content, threadId: activeThreadId, attachment: attachmentMeta };

      const res = await fetch(endpoint, {
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
        if (isTemporaryChat) {
          setTemporaryMessages((prev) => [...prev, assistantMessage]);
        } else {
          setMessages((prev) => [...prev, assistantMessage]);
        }
      }
    } catch (err) {
      console.error("Error sending message:", err);
      const errorMessage: Message = {
        role: "assistant",
        content:
          err instanceof Error
            ? `⚠️ ${err.message}`
            : "Sorry, something went wrong. Please try again.",
      };
      if (isTemporaryChat) {
        setTemporaryMessages((prev) => [...prev, errorMessage]);
      } else {
        setMessages((prev) => [...prev, errorMessage]);
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
    if (!isTemporaryChat && !threadId) {
      const created = await ensureActiveThread();
      if (!created) return;
    }

    setInput(prompt);
    textareaRef.current?.focus();
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setAttachedFile(file);
    // reset value so selecting the same file twice re-triggers change
    event.target.value = "";
  };

  return (
    <main className="flex h-screen bg-gray-50 text-gray-900 dark:bg-[#030304] dark:text-white">
      <Sidebar
        onSelectThread={handleSelectThread}
        currentThreadId={isTemporaryChat ? null : threadId}
        onStartTemporaryChat={handleStartTemporaryChat}
        isTemporaryActive={isTemporaryChat}
        className="hidden lg:flex"
      />

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-neutral-200/70 bg-white/80 px-4 py-4 backdrop-blur dark:border-white/5 dark:bg-black/40 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-600 transition hover:bg-neutral-100 dark:border-white/10 dark:bg-white/5 dark:text-white/80 dark:hover:bg-white/10 lg:hidden"
              aria-label="Open conversations"
            >
              <Menu size={18} />
            </button>
            <div>
              <p className="text-xs uppercase tracking-wide text-neutral-500 dark:text-white/40">Chat thread</p>
              <h1 className="text-lg font-semibold text-neutral-900 dark:text-white">{threadTitle}</h1>
            </div>
          </div>

          {isTemporaryChat ? (
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/60 bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800 dark:border-amber-400/30 dark:bg-amber-500/15 dark:text-amber-200">
              <Flame size={14} />
              Temporary chat
            </div>
          ) : (
            <div className="hidden items-center gap-2 text-sm font-medium text-neutral-500 dark:text-white/70 lg:flex">
              <Sparkles size={16} className="text-emerald-500" />
              Intelligent workspace
            </div>
          )}
        </header>

        <div className="relative flex-1 overflow-hidden">
          <div ref={chatRef} className="h-full overflow-y-auto">
            <div className="mx-auto flex w-full max-w-3xl flex-col">
              {!isTemporaryChat && !threadId ? (
                <section className="flex flex-1 items-center justify-center px-6 py-12 text-center">
                  <div className="rounded-3xl border border-neutral-200/70 bg-white/70 p-10 shadow-2xl backdrop-blur-md dark:border-white/10 dark:bg-white/[0.04]">
                    <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500 dark:bg-emerald-500/10 dark:text-emerald-300">
                      <Sparkles size={28} />
                    </div>
                    <h2 className="text-3xl font-semibold tracking-tight text-neutral-900 dark:text-white">Welcome to SPGPT</h2>
                    <p className="mt-2 text-base text-neutral-600 dark:text-white/70">
                      Select an existing conversation or start a fresh chat to begin exploring.
                    </p>
                    <div className="mt-8 grid gap-3 sm:grid-cols-2">
                      {quickPrompts.map((item) => (
                        <button
                          key={item.title}
                          type="button"
                          onClick={() => handlePromptClick(item.prompt)}
                          className="rounded-2xl border border-neutral-200/70 bg-white px-5 py-4 text-left transition hover:border-emerald-300/60 hover:bg-emerald-50 dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-emerald-300/40 dark:hover:bg-emerald-500/10"
                        >
                          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-300">
                            <Wand2 size={16} />
                            <span className="text-xs font-semibold uppercase tracking-wide">Quick start</span>
                          </div>
                          <p className="mt-2 text-sm font-medium text-neutral-900 dark:text-white">{item.title}</p>
                          <p className="text-xs text-neutral-500 dark:text-white/60">{item.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </section>
              ) : historyLoading ? (
                <div className="flex flex-1 items-center justify-center py-20 text-neutral-500 dark:text-white/60">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Loading conversation...
                </div>
              ) : displayedMessages.length === 0 ? (
                <section className="px-6 py-10">
                  <div className="mx-auto max-w-2xl rounded-3xl border border-neutral-200/70 bg-white p-8 shadow-xl dark:border-white/10 dark:bg-white/[0.03]">
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-300">
                      <Wand2 size={18} />
                      <span className="text-sm font-semibold uppercase tracking-wide">Inspiration</span>
                    </div>
                    <h3 className="mt-3 text-xl font-semibold text-neutral-900 dark:text-white">What would you like to explore?</h3>
                    <p className="mt-2 text-sm text-neutral-600 dark:text-white/60">
                      Try one of these starter prompts or ask anything you have in mind.
                    </p>
                    <div className="mt-6 grid gap-3 sm:grid-cols-2">
                      {quickPrompts.map((item) => (
                        <button
                          key={item.title}
                          type="button"
                          onClick={() => handlePromptClick(item.prompt)}
                          className="rounded-2xl border border-neutral-200/70 bg-neutral-50 px-4 py-4 text-left transition hover:border-emerald-400/60 hover:bg-emerald-50 dark:border-white/10 dark:bg-[#0a0a0f] dark:hover:border-emerald-400/40 dark:hover:bg-emerald-500/5"
                        >
                          <p className="text-sm font-medium text-neutral-900 dark:text-white">{item.title}</p>
                          <p className="mt-1 text-xs text-neutral-600 dark:text-white/60">{item.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </section>
              ) : (
                displayedMessages.map((message, index) => (
                  <article
                    key={`${message.role}-${index}-${message.content.slice(0, 8)}`}
                    className={`px-4 ${
                      message.role === "assistant"
                        ? "bg-neutral-100/60 dark:bg-white/[0.02]"
                        : ""
                    }`}
                  >
                    <div className="mx-auto flex w-full max-w-3xl gap-4 px-2 py-8">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                          message.role === "assistant"
                            ? "bg-emerald-500/15 text-emerald-500 dark:text-emerald-300"
                            : "bg-neutral-900 text-white dark:bg-white/10 dark:text-white"
                        }`}
                      >
                        {message.role === "assistant" ? <Bot size={20} /> : <User size={20} />}
                      </div>
                      <div className="flex-1">
                        <p className="whitespace-pre-wrap leading-relaxed text-neutral-800 dark:text-white/90">
                          {message.content}
                        </p>
                        {message.attachment && (
                          <div className="mt-3 inline-flex items-center gap-2 rounded-xl border border-dashed border-neutral-300 bg-white px-3 py-2 text-xs font-medium text-neutral-600 dark:border-white/20 dark:bg-white/5 dark:text-white/70">
                            <Paperclip size={14} />
                            <span className="truncate max-w-[160px]">{message.attachment.name}</span>
                            <span className="text-neutral-400 dark:text-white/40">
                              · {formatFileSize(message.attachment.size)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                ))
              )}

              {loading && (
                <article className="px-4">
                  <div className="mx-auto flex w-full max-w-3xl gap-4 px-2 py-8">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500 dark:text-emerald-300">
                      <Bot size={20} className="animate-pulse" />
                    </div>
                    <div className="flex-1 text-neutral-500 dark:text-white/60">SPGPT is composing a response…</div>
                  </div>
                </article>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-neutral-200/70 bg-white/80 px-4 py-4 backdrop-blur dark:border-white/10 dark:bg-[#060608]/90 lg:px-8">
          <div className="mx-auto w-full max-w-3xl rounded-3xl border border-neutral-200/70 bg-white/90 p-4 shadow-2xl backdrop-blur dark:border-white/10 dark:bg-black/40">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isTemporaryChat ? "Start a temporary conversation..." : "Ask SPGPT anything..."
              }
              rows={1}
              className="max-h-[200px] w-full resize-none bg-transparent text-sm leading-relaxed text-neutral-800 placeholder:text-neutral-400 focus:outline-none dark:text-white dark:placeholder:text-white/40"
            />

            {attachedFile && (
              <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-dashed border-neutral-300 bg-neutral-50 px-3 py-1.5 text-xs font-medium text-neutral-600 dark:border-white/20 dark:bg-white/10 dark:text-white/70">
                <Paperclip size={14} />
                <span className="max-w-[180px] truncate">{attachedFile.name}</span>
                <span className="text-neutral-400 dark:text-white/40">{formatFileSize(attachedFile.size)}</span>
                <button
                  type="button"
                  onClick={() => setAttachedFile(null)}
                  className="rounded-full p-1 text-neutral-400 transition hover:bg-neutral-200/60 hover:text-neutral-600 dark:text-white/40 dark:hover:bg-white/10 dark:hover:text-white"
                  aria-label="Remove attachment"
                >
                  <X size={12} />
                </button>
              </div>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleUploadClick}
                className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-600 transition hover:bg-neutral-100 dark:border-white/10 dark:bg-white/5 dark:text-white/70 dark:hover:bg-white/10"
              >
                <Plus size={14} />
                Attach
              </button>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileChange}
              />

              <p className="text-xs text-neutral-400 dark:text-white/40">
                SPGPT may display inaccuracies. Verify critical information.
              </p>

              <button
                type="button"
                onClick={sendMessage}
                disabled={loading || (!input.trim() && !attachedFile)}
                className="ml-auto inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-400 dark:disabled:bg-white/10 dark:disabled:text-white/30"
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
              currentThreadId={isTemporaryChat ? null : threadId}
              onStartTemporaryChat={handleStartTemporaryChat}
              isTemporaryActive={isTemporaryChat}
              className="h-full"
            />
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
