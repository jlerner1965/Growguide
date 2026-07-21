// auth/SignIn.tsx
// Passwordless magic-link sign in. Styling uses the same class vocabulary as
// the Phase-1 app (card / btn / field) — remap to Compass's design tokens.
import { useState } from 'react';
import { signInWithEmail } from '../db/client';

export function SignIn() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const addr = email.trim();
    if (!addr) return;
    setBusy(true); setError(null);
    try {
      await signInWithEmail(addr);
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send the link.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="signin-wrap" style={{ maxWidth: 380, margin: '10vh auto', padding: 24 }}>
      <div className="card" style={{ padding: 24 }}>
        <h1 style={{ marginTop: 0 }}>Front Range Grow Intelligence</h1>
        {sent ? (
          <p className="muted">
            Check <strong>{email}</strong> for a sign-in link. You can close this tab —
            opening the link brings you back signed in.
          </p>
        ) : (
          <>
            <p className="muted">Enter your email and we'll send a one-tap sign-in link.</p>
            <label className="field">
              <span className="lab">Email</span>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
                placeholder="you@example.com"
              />
            </label>
            {error && <p style={{ color: 'var(--red, #a5382c)' }} className="small">{error}</p>}
            <button className="btn primary" onClick={submit} disabled={busy || !email.trim()}>
              {busy ? 'Sending…' : 'Send sign-in link'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
