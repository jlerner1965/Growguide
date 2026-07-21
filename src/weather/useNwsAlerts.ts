// weather/useNwsAlerts.ts
// Best-effort NWS active-alerts fetch for the Weather Risks screen. Never
// fakes alerts — a failed or blocked fetch just means the section is hidden.
import { useCallback, useEffect, useState } from 'react';

export interface NwsAlert {
  id: string;
  event: string;
  severity: string;
  headline: string;
  description: string;
  expires: string | null;
}
export interface NwsAlertsState {
  loading: boolean;
  available: boolean; // true once we've successfully reached the NWS API, even if it returned zero alerts
  alerts: NwsAlert[];
}

interface NwsFeature {
  id: string;
  properties: {
    event: string; severity: string; headline: string; description: string; expires: string | null;
  };
}

export function useNwsAlerts(lat?: number | null, lng?: number | null) {
  const [state, setState] = useState<NwsAlertsState>({ loading: false, available: false, alerts: [] });

  const load = useCallback(async () => {
    if (lat == null || lng == null) return;
    setState((s) => ({ ...s, loading: true }));
    try {
      const url = `https://api.weather.gov/alerts/active?point=${lat},${lng}`;
      const r = await fetch(url, { headers: { Accept: 'application/geo+json' } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      const features: NwsFeature[] = j.features ?? [];
      const alerts: NwsAlert[] = features.map((f) => ({
        id: f.id,
        event: f.properties.event,
        severity: f.properties.severity,
        headline: f.properties.headline,
        description: f.properties.description,
        expires: f.properties.expires,
      }));
      setState({ loading: false, available: true, alerts });
    } catch {
      setState({ loading: false, available: false, alerts: [] });
    }
  }, [lat, lng]);

  useEffect(() => { load(); }, [load]);

  return { ...state, refresh: load };
}
