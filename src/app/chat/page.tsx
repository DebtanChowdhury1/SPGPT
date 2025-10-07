"use client";

import ChatWorkspace from "@/components/ChatWorkspace";
import { RedirectToSignIn, SignedIn, SignedOut } from "@clerk/nextjs";

export default function ChatPage() {
  return (
    <>
      <SignedIn>
        <ChatWorkspace />
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}
