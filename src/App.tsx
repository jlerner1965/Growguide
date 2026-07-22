// App.tsx
// Composition root: TanStack Query -> Auth -> Gate -> Router -> Shell -> screens.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './auth/AuthProvider';
import { AuthGate } from './auth/AuthGate';
import { signOut } from './db/client';
import { Shell } from './components/Shell';
import { Dashboard } from './screens/Dashboard';
import { Journal } from './screens/Journal';
import { Plants } from './screens/Plants';
import { MyGrow } from './screens/MyGrow';
import { GrowSetup } from './screens/GrowSetup';
import { Weather } from './screens/Weather';
import { Settings } from './screens/Settings';
import { Reports } from './screens/Reports';
import { Photos } from './screens/Photos';
import { Diagnose } from './screens/Diagnose';
import { Harvest } from './screens/Harvest';
import { Training } from './screens/Training';
import { PestDisease } from './screens/PestDisease';
import { Irrigation } from './screens/Irrigation';
import { Nutrition } from './screens/Nutrition';
import { Encyclopedia } from './screens/Encyclopedia';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, refetchOnWindowFocus: false } },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthGate>
          <BrowserRouter>
            <Routes>
              <Route element={<Shell onSignOut={() => void signOut()} />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/my-grow" element={<MyGrow />} />
                <Route path="/grow-setup" element={<GrowSetup />} />
                <Route path="/plants" element={<Plants />} />
                <Route path="/journal" element={<Journal />} />
                <Route path="/diagnose" element={<Diagnose />} />
                <Route path="/weather" element={<Weather />} />
                <Route path="/irrigation" element={<Irrigation />} />
                <Route path="/nutrition" element={<Nutrition />} />
                <Route path="/harvest" element={<Harvest />} />
                <Route path="/training" element={<Training />} />
                <Route path="/pests" element={<PestDisease />} />
                <Route path="/photos" element={<Photos />} />
                <Route path="/encyclopedia" element={<Encyclopedia />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </AuthGate>
      </AuthProvider>
    </QueryClientProvider>
  );
}
