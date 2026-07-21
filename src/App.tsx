// App.tsx
// Composition root: TanStack Query -> Auth -> Gate -> Router -> Shell -> screens.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './auth/AuthProvider';
import { AuthGate } from './auth/AuthGate';
import { signOut } from './db/client';
import { Shell } from './components/Shell';
import { ComingNext } from './screens/ComingNext';
import { Dashboard } from './screens/Dashboard';
import { Journal } from './screens/Journal';
import { Plants } from './screens/Plants';
import { MyGrow } from './screens/MyGrow';
import { GrowSetup } from './screens/GrowSetup';
import { Weather } from './screens/Weather';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, refetchOnWindowFocus: false } },
});

const PLANNED_BLURBS: Record<string, string> = {
  Diagnostics: 'Symptom-based differential diagnosis with a confidence indicator and the evidence that would rule each cause out — never a single confident guess.',
  Irrigation: 'Watering targets by stage and container size, plus a log view derived from your journal.',
  Nutrition: 'Feeding schedules by stage and approach, deficiency/excess reference, and a feed log derived from your journal.',
  Training: 'Topping/LST/trellising guidance by stage, plus a simple trellis layout planner.',
  'Pest & Disease': 'A Front Range pest and disease reference library cross-linked to Diagnostics and your journal tags.',
  'Harvest Planner': 'Refines the heuristic harvest window using real trichome and flowering observations, plus a dry/cure checklist.',
  'Photo Timeline': 'A visual timeline over your photos — per-plant filmstrip and side-by-side date comparison.',
  Encyclopedia: 'Contextual links out to the public Cultivation Compass encyclopedia.',
};

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
                <Route path="/weather" element={<Weather />} />
                <Route path="/reports" element={<ComingNext title="Reports" blurb="Printable weekly, per-plant, and full-season reports." />} />
                <Route path="/settings" element={<ComingNext title="Settings" blurb="Units, theme, JSON export/restore, and sample-data cleanup." />} />
                {Object.entries(PLANNED_BLURBS).map(([label, blurb]) => (
                  <Route
                    key={label}
                    path={`/${label.toLowerCase().replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '')}`}
                    element={<ComingNext title={label} blurb={blurb} />}
                  />
                ))}
              </Route>
            </Routes>
          </BrowserRouter>
        </AuthGate>
      </AuthProvider>
    </QueryClientProvider>
  );
}
