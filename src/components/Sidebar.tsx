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
} from "lucide-react";
import { useTheme } from "next-themes";
import { UserButton } from "@clerk/nextjs";

// ✅ Define a type for threads (adjust fields if needed)
interface Thread {
  _id: string;
  title: string;
  createdAt?: string;
}

export default function Sidebar({
  onSelectThread,
  currentThread,
}: {
  onSelectThread: (id: string | null) => void;
  currentThread: string | null;
}) {
  const { theme, setTheme } = useTheme();

  // ✅ Replace any[] with Thread[]
  const [threads, setThreads] = useState<Thread[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");

  useEffect(() => {
    const loadThreads = async () => {
      try {
        const res = await fetch("/api/threads");
        const data = await res.json();
        setThreads(data.threads || []);
      } catch (err) {
        console.error("Error loading threads:", err);
      }
    };
    loadThreads();
  }, []);

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

  const reloadThreads = async () => {
    try {
      const res = await fetch("/api/threads");
      const data = await res.json();
      setThreads(data.threads || []);
    } catch (err) {
      console.error("Error reloading threads:", err);
    }
  };

  return (
    <aside className="w-64 h-screen border-r border-gray-800 flex flex-col bg-gray-950 text-white">
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <h2 className="font-bold text-lg">SPGPT</h2>
        <UserButton />
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {threads.length === 0 && (
          <p className="text-gray-400 text-sm text-center mt-4">
            No chats yet — start one!
          </p>
        )}

        {threads.map((t) => (
          <div
            key={t._id}
            className={`group flex items-center justify-between gap-2 p-2 rounded-lg cursor-pointer ${
              currentThread === t._id
                ? "bg-blue-600"
                : "bg-gray-800 hover:bg-gray-700"
            }`}
          >
            <div
              onClick={() => onSelectThread(t._id)}
              className="flex items-center gap-2 flex-1"
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

            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
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

      <div className="p-3 flex items-center justify-between border-t border-gray-800">
        <button
          onClick={createThread}
          className="flex items-center gap-2 text-sm bg-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-700"
        >
          <Plus size={16} /> New Chat
        </button>

        <button
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          className="p-2 rounded-lg hover:bg-gray-800"
        >
          {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
        </button>
      </div>
    </aside>
  );
}
