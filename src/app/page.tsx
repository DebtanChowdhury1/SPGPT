"use client";

import { UserButton, useUser } from "@clerk/nextjs";

export default function Home() {
  const { user } = useUser();

  return (
    <main className="flex flex-col items-center justify-center min-h-screen gap-4">

      <h1 className="text-4xl font-bold">Welcome to SPGPT 🤖</h1>
      {user ? (
        <>
          <a
            href="/chat"
            className="bg-blue-600 px-5 py-2 rounded-lg text-white hover:bg-blue-700"
          >
            Start Chatting
          </a>
          <UserButton afterSignOutUrl="/sign-in" />
        </>
      ) : (
        <a href="/sign-in" className="text-blue-400 underline">
          Sign in to continue
        </a>
      )}
    </main>
  );
}
