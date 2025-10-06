"use client";
import { useEffect, useState } from "react";
import {
  Plus,
  Sun,
  Moon,
  MessageSquare,
  Trash2,
  Edit2,
  Check,
  Sparkles,
  Flame,
} from "lucide-react";
import { useTheme } from "next-themes";
import { UserButton } from "@clerk/nextjs";

// ✅ Define a type for threads (adjust fields if needed)
interface Thread {
  _id: string;
  title: string;
  createdAt?: string;
}

export type SidebarThread = Thread;

export default function Sidebar({
  onSelectThread,
  currentThreadId,
  onStartTemporaryChat,
  isTemporaryActive,
  className = "",
}: {
  onSelectThread: (thread: Thread | null) => void;
  currentThreadId: string | null;
  onStartTemporaryChat: () => void;
  isTemporaryActive: boolean;
  className?: string;
}) {
  const { theme, setTheme } = useTheme();

  // ✅ Replace any[] with Thread[]
  const [threads, setThreads] = useState<Thread[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");

  const reloadThreads = async (): Promise<Thread[]> => {
    try {
      const res = await fetch("/api/threads");
      const isJson = res.headers.get("content-type")?.includes("application/json");
      if (!res.ok || !isJson) {
        setThreads([]);
        return [];
      }

      const data = await res.json();
      setThreads(data.threads || []);
      return data.threads || [];
    } catch (err) {
      console.error("Error reloading threads:", err);
      return [];
    }
  };

  useEffect(() => {
    reloadThreads();
  }, []);

  useEffect(() => {
    if (!currentThreadId) return;
    reloadThreads();
  }, [currentThreadId]);

  const createThread = async () => {
    try {
      const res = await fetch("/api/threads/new", { method: "POST" });
      const isJson = res.headers.get("content-type")?.includes("application/json");
      if (!res.ok || !isJson) {
        throw new Error("Unable to create thread");
      }

      const data = await res.json();
      onSelectThread(data.thread);
      await reloadThreads();
    } catch (err) {
      console.error("Error creating thread:", err);
    }
  };

  const deleteThread = async (id: string) => {
    if (!confirm("Delete this chat permanently?")) return;
    try {
      const res = await fetch(`/api/threads/${id}/delete`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error("Failed to delete thread");
      }
      await reloadThreads();
      onSelectThread(null);
    } catch (err) {
      console.error("Error deleting thread:", err);
    }
  };

  const startRename = (id: string, title: string) => {
    setEditingId(id);
    setNewTitle(title);
  };

  const saveRename = async (id: string) => {
    try {
      const res = await fetch(`/api/threads/${id}/rename`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle || "Untitled Chat" }),
      });
      if (!res.ok) {
        throw new Error("Failed to rename thread");
      }
      setEditingId(null);
      setNewTitle("");
      const updated = await reloadThreads();
      const current = updated.find((thread: Thread) => thread._id === id);
      if (current) {
        onSelectThread(current);
      }
    } catch (err) {
      console.error("Error renaming thread:", err);
    }
  };

  return (
    <aside
      className={`flex h-full w-[280px] shrink-0 flex-col border-r border-neutral-200/60 bg-white/90 text-neutral-900 backdrop-blur dark:border-white/10 dark:bg-[#050507] dark:text-white ${className}`.trim()}
    >
      <div className="flex items-center gap-2 border-b border-neutral-200/60 px-5 py-4 dark:border-white/10">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 dark:bg-emerald-500/20 dark:text-emerald-300">
          <Sparkles size={20} />
        </div>
        <div className="flex-1">
          <p className="text-xs uppercase tracking-wide text-neutral-500 dark:text-white/60">Workspace</p>
          <h2 className="font-semibold">SPGPT</h2>
        </div>
        <UserButton />
      </div>

      <div className="px-4 py-3">
        <button
          onClick={createThread}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-900 text-white px-3 py-2 text-sm font-medium transition hover:bg-neutral-800 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
        >
          <Plus size={16} />
          New chat
        </button>
        <button
          onClick={onStartTemporaryChat}
          className={`mt-3 flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition ${
            isTemporaryActive
              ? "border-amber-500/60 bg-amber-100 text-amber-800 dark:border-amber-400/40 dark:bg-amber-500/15 dark:text-amber-200"
              : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50 dark:border-white/10 dark:bg-transparent dark:text-white/80 dark:hover:bg-white/10"
          }`}
        >
          <Flame size={16} />
          Temporary chat
        </button>
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto px-3 pb-6">
        {threads.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-200 bg-white/70 p-4 text-center text-xs text-neutral-500 dark:border-white/10 dark:bg-white/5 dark:text-white/60">
            Start your first conversation to see it here.
          </div>
        ) : (
          threads.map((thread) => {
            const isActive = currentThreadId === thread._id;

            return (
              <div
                key={thread._id}
                className={`group flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition ${
                  isActive
                    ? "bg-emerald-100 text-emerald-700 shadow-sm dark:bg-emerald-500/15 dark:text-emerald-200"
                    : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white"
                }`}
              >
                <button
                  onClick={() => onSelectThread(thread)}
                  className="flex flex-1 items-center gap-2 text-left"
                >
                  <MessageSquare size={16} />
                  {editingId === thread._id ? (
                    <input
                      autoFocus
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && saveRename(thread._id)}
                      className="w-full bg-transparent text-sm outline-none"
                    />
                  ) : (
                    <span className="line-clamp-1">{thread.title}</span>
                  )}
                </button>

                <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                  {editingId === thread._id ? (
                    <button
                      onClick={() => saveRename(thread._id)}
                      className="rounded p-1 text-emerald-600 hover:bg-emerald-500/10 dark:text-white dark:hover:bg-white/10"
                    >
                      <Check size={15} />
                    </button>
                  ) : (
                    <button
                      onClick={() => startRename(thread._id, thread.title)}
                      className="rounded p-1 text-neutral-500 hover:bg-neutral-200/80 dark:text-white/80 dark:hover:bg-white/10"
                    >
                      <Edit2 size={15} />
                    </button>
                  )}
                  <button
                    onClick={() => deleteThread(thread._id)}
                    className="rounded p-1 text-rose-500 hover:bg-rose-100 dark:text-rose-300 dark:hover:bg-rose-500/10"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-neutral-200/60 px-4 py-4 text-sm text-neutral-500 dark:border-white/10 dark:text-white/60">
        <div className="text-xs">
          <p className="font-medium text-neutral-700 dark:text-white/80">Theme</p>
          <p>Switch between light and dark</p>
        </div>
        <button
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          className="rounded-xl border border-neutral-200 bg-white p-2 text-neutral-700 transition hover:bg-neutral-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
        >
          {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
        </button>
      </div>
    </aside>
  );
}
