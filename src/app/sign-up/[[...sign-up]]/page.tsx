import { SignUp } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="flex h-screen items-center justify-center">
      <SignUp redirectUrl="/chat" afterSignUpUrl="/chat" />
    </div>
  );
}
