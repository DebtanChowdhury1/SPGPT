"use client";
import { useEffect, useState } from "react";
import { Plus, MessageSquare, Trash2, Edit2, Check } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import ThemeToggle from "@/components/ThemeToggle";

type Thread = {
  _id: string;
  title: string;
};

export default function Sidebar({
  onSelectThread,
  currentThread,
}: {
  onSelectThread: (id: string | null) => void;
  currentThread: string | null;
}) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");

  // ✅ Always load threads on mount
  useEffect(() => {
    const loadThreads = async () => {
      try {
        const res = await fetch("/api/threads");
        const data = await res.json();
        setThreads((data.threads as Thread[]) || []);
      } catch (err) {
        console.error("Error loading threads:", err);
      }
    };
    loadThreads();
  }, []);

  // ✅ Create new thread
  const createThread = async () => {
    try {
      const res = await fetch("/api/threads/new", { method: "POST" });
      const data = await res.json();
      onSelectThread(data.thread._id);
      await reloadThreads();
    } catch (err) {
      console.error("Error creating thread:", err);
    }
  };

  // ✅ Delete a thread
  const deleteThread = async (id: string) => {
    if (!confirm("Delete this chat permanently?")) return;
    try {
      await fetch(`/api/threads/${id}/delete`, { method: "DELETE" });
      await reloadThreads();
      onSelectThread(null);
    } catch (err) {
      console.error("Error deleting thread:", err);
    }
  };

  // ✅ Rename a thread
  const startRename = (id: string, title: string) => {
    setEditingId(id);
    setNewTitle(title);
  };

  const saveRename = async (id: string) => {
    try {
      await fetch(`/api/threads/${id}/rename`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle || "Untitled Chat" }),
      });
      setEditingId(null);
      setNewTitle("");
      await reloadThreads();
    } catch (err) {
      console.error("Error renaming thread:", err);
    }
  };

  // ✅ Utility to reload thread list
  const reloadThreads = async () => {
    try {
      const res = await fetch("/api/threads");
      const data = await res.json();
      setThreads((data.threads as Thread[]) || []);
    } catch (err) {
      console.error("Error reloading threads:", err);
    }
  };

  // ✅ UI
  return (
    <aside className="flex h-screen w-64 flex-col border-r border-gray-200 bg-white text-gray-900 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-800">
        <h2 className="font-bold text-lg">SPGPT</h2>
        <UserButton />
      </div>

      {/* Threads List */}
      <div className="flex-1 space-y-1 overflow-y-auto p-2">
        {threads.length === 0 && (
          <p className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
            No chats yet — start one!
          </p>
        )}

        {threads.map((t) => (
          <div
            key={t._id}
            className={`group flex cursor-pointer items-center justify-between gap-2 rounded-lg p-2 transition-colors ${
              currentThread === t._id
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-900 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            <div
              onClick={() => onSelectThread(t._id)}
              className="flex flex-1 items-center gap-2"
            >
              <MessageSquare size={16} />
              {editingId === t._id ? (
                <input
                  autoFocus
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveRename(t._id)}
                  className="bg-transparent outline-none text-sm flex-1"
                />
              ) : (
                <span className="truncate">{t.title}</span>
              )}
            </div>

            <div className="flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
              {editingId === t._id ? (
                <button onClick={() => saveRename(t._id)}>
                  <Check size={15} />
                </button>
              ) : (
                <button onClick={() => startRename(t._id, t.title)}>
                  <Edit2 size={15} />
                </button>
              )}
              <button onClick={() => deleteThread(t._id)}>
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-gray-200 p-3 dark:border-gray-800">
        <button
          onClick={createThread}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white transition-colors hover:bg-blue-700"
        >
          <Plus size={16} /> New Chat
        </button>

        <ThemeToggle className="h-9 w-9 bg-gray-200 text-gray-800 shadow-sm hover:bg-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700" />
      </div>
    </aside>
  );
}
