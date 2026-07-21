// App.tsx
// Composition root: TanStack Query -> Auth -> Gate -> app.
// The gate renders SignIn when logged out and the app once a session exists.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './auth/AuthProvider';
import { AuthGate } from './auth/AuthGate';
import { Dashboard } from './screens/Dashboard';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, refetchOnWindowFocus: false } },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthGate>
          {/* Router goes here; Dashboard shown as the wired reference screen. */}
          <Dashboard />
        </AuthGate>
      </AuthProvider>
    </QueryClientProvider>
  );
}
