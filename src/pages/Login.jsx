import { SignIn } from "@clerk/clerk-react";

export default function Login() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B0F1A]">
      <SignIn
        afterSignInUrl="/dashboard"
        redirectUrl="/dashboard"
      />
    </div>
  );
}