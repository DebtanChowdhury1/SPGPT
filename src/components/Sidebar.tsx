"use client";
import { useEffect, useState } from "react";
import {
  Plus,
  MessageSquare,
  Trash2,
  Edit2,
  Check,
  Sparkles,
} from "lucide-react";
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
  className = "",
}: {
  onSelectThread: (thread: Thread | null) => void;
  currentThreadId: string | null;
  className?: string;
}) {
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
      className={`flex h-full min-h-0 w-[280px] shrink-0 flex-col border-r border-white/5 bg-[#080b12] text-slate-100 ${className}`.trim()}
    >
      <div className="flex items-center gap-2 border-b border-white/5 bg-[#0e121d] px-5 py-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300">
          <Sparkles size={20} />
        </div>
        <div className="flex-1">
          <p className="text-xs uppercase tracking-wide text-slate-400">Workspace</p>
          <h2 className="font-semibold text-white">SPGPT</h2>
        </div>
        <UserButton />
      </div>

      <div className="px-4 py-3">
        <button
          onClick={createThread}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-100 transition hover:bg-emerald-500/20"
        >
          <Plus size={16} />
          New chat
        </button>
      </div>

      <div className="flex-1 min-h-0 space-y-1 overflow-y-auto px-3 pb-6">
        {threads.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 bg-white/5 p-4 text-center text-xs text-slate-300">
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
                    ? "bg-emerald-500/15 text-emerald-100"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-100"
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
                    <button onClick={() => saveRename(thread._id)} className="rounded p-1 hover:bg-white/10">
                      <Check size={15} />
                    </button>
                  ) : (
                    <button
                      onClick={() => startRename(thread._id, thread.title)}
                      className="rounded p-1 hover:bg-white/10"
                    >
                      <Edit2 size={15} />
                    </button>
                  )}
                  <button onClick={() => deleteThread(thread._id)} className="rounded p-1 hover:bg-white/10">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

    </aside>
  );
}
