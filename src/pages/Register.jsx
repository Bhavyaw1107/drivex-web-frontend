import { SignUp } from "@clerk/clerk-react";

export default function Register() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B0F1A]">
      <SignUp
        afterSignUpUrl="/dashboard"
        redirectUrl="/dashboard"
      />
    </div>
  );
}