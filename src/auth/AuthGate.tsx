// auth/AuthGate.tsx
import type { ReactNode } from 'react';
import { useAuth } from './AuthProvider';
import { SignIn } from './SignIn';

export function AuthGate({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) {
    return <div className="gate-loading muted" style={{ padding: 40, textAlign: 'center' }}>Loading…</div>;
  }
  if (!session) return <SignIn />;
  return <>{children}</>;
}
