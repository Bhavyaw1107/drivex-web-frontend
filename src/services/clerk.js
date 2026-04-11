// Clerk Authentication Configuration
// This service provides Clerk authentication integration

// For now, this is a placeholder that uses the existing JWT-based auth
// When user adds their Clerk Publishable Key to frontend/.env,
// Clerk authentication will be enabled

export const clerkConfig = {
  publishableKey: import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
  isClerkConfigured: () => {
    const key = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
    return key && key !== 'pk_test_your_key_here';
  }
};

// If Clerk is configured, these would be imported from @clerk/clerk-react:
// import { ClerkProvider, useAuth, useUser } from '@clerk/clerk-react';
//
// For now, we continue using the existing JWT-based authentication
// until Clerk is fully configured by the user

export default clerkConfig;
