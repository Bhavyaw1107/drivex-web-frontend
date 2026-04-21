import { SignUp, useAuth } from "@clerk/clerk-react";
import { Navigate } from "react-router-dom";

export default function Register() {
  const { isSignedIn } = useAuth();

  if (isSignedIn) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B0F1A]">
      <SignUp
        afterSignUpUrl="/dashboard"
        redirectUrl="/dashboard"
      />
    </div>
  );
}
