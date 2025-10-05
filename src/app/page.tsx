"use client";

import Link from "next/link";
import { UserButton, useUser } from "@clerk/nextjs";

export default function Home() {
  const { user } = useUser();

  return (
    <main className="flex flex-col items-center justify-center min-h-screen gap-4">

      <h1 className="text-4xl font-bold">Welcome to SPGPT 🤖</h1>
      {user ? (
        <>
          <Link
            href="/chat"
            className="rounded-lg bg-blue-600 px-5 py-2 text-white transition-colors hover:bg-blue-700"
          >
            Start Chatting
          </Link>
          <UserButton afterSignOutUrl="/sign-in" />
        </>
      ) : (
        <Link href="/sign-in" className="text-blue-600 underline dark:text-blue-400">
          Sign in to continue
        </Link>
      )}
    </main>
  );
}
