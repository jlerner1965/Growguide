// weather/useWeather.ts
// React port of the Phase-1 weather layer. Fetches Open-Meteo (no key, CORS)
// for the grow's coordinates and derives the same Colorado risk cards.
// NWS alerts are added later in the full Weather screen; this powers the
// dashboard's outlook + risk level.
import { useCallback, useEffect, useState } from 'react';

export interface WxDay { dow: string; hi: number; lo: number; pop: number; gust: number; precip: number; note: string }
export interface WxRisk { title: string; level: 'red' | 'amber' | 'ok'; stat: string; advice: string; icon: string }
export interface WeatherState {
  loading: boolean; live: boolean; error: string | null;
  days: WxDay[]; risks: WxRisk[]; fetchedAt: Date | null;
}

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
function dayNote(pop: number, gust: number, hi: number) {
  if (pop >= 60) return 'Showers likely';
  if (gust >= 35) return 'Windy';
  if (pop >= 30) return 'Chance rain';
  if (hi >= 95) return 'Hot';
  if (gust >= 25) return 'Breezy';
  return 'Clear / dry';
}
function risk(title: string, level: WxRisk['level'], stat: string, advice: string, icon: string): WxRisk {
  return { title, level, stat, advice, icon };
}
function computeRisks(days: WxDay[], hours: any): WxRisk[] {
  const maxGust = Math.max(...days.map((d) => d.gust));
  const maxHi = Math.max(...days.map((d) => d.hi));
  const minLo = Math.min(...days.map((d) => d.lo));
  const maxPrecip = Math.max(...days.map((d) => d.precip));
  const R: WxRisk[] = [];
  R.push(risk('Extreme heat', maxHi >= 97 ? 'red' : maxHi >= 90 ? 'amber' : 'ok', `Peak ${maxHi}°F`,
    maxHi >= 90 ? 'Water early; watch midday wilt. No foliar spray in peak sun.' : 'No dangerous heat.', 'sun'));
  R.push(risk('High wind', maxGust >= 45 ? 'red' : maxGust >= 30 ? 'amber' : 'ok', `Gusts to ~${maxGust} mph`,
    maxGust >= 30 ? 'Inspect stakes, ties and trellis before the windiest day.' : 'Winds manageable.', 'weather'));
  R.push(risk('Cold / frost', minLo <= 32 ? 'red' : minLo <= 40 ? 'amber' : 'ok', `Low ~${minLo}°F`,
    minLo <= 40 ? 'Have frost cloth ready — at elevation nights drop fast.' : 'No cold risk.', 'moon'));
  R.push(risk('Heavy rain', maxPrecip >= 1 ? 'red' : maxPrecip >= 0.5 ? 'amber' : 'ok', `Wettest ~${maxPrecip.toFixed(2)} in`,
    maxPrecip >= 0.5 ? 'Check drainage; hold irrigation after; inspect dense flowers for botrytis.' : 'Light or no rain.', 'drop'));
  if (hours?.cape) {
    const cape = (hours.cape as number[]).filter((v) => v != null);
    const maxCape = cape.length ? Math.max(...cape) : 0;
    R.push(risk('Convective / hail potential', maxCape >= 2500 ? 'red' : maxCape >= 1000 ? 'amber' : 'ok',
      `Peak CAPE ~${Math.round(maxCape)} J/kg`,
      maxCape >= 1000 ? 'Elevated afternoon storm energy — hail season. Proxy, not a hail forecast.' : 'Low convective energy.', 'weather'));
  }
  if (hours?.relative_humidity_2m) {
    const rh = (hours.relative_humidity_2m as number[]).filter((v) => v != null);
    const highRh = rh.filter((v) => v >= 85).length;
    const minRh = rh.length ? Math.min(...rh) : 50;
    R.push(risk('Mildew / botrytis pressure', highRh >= 18 ? 'amber' : 'ok', `${highRh} hrs ≥85% RH`,
      highRh >= 18 ? 'Prolonged leaf wetness favors mildew/botrytis. Improve airflow, thin canopy, scout.' : 'Humidity keeps pressure down.', 'pest'));
    R.push(risk('Low humidity / water demand', minRh <= 15 ? 'amber' : 'ok', `Driest ~${minRh}% RH`,
      minRh <= 20 ? 'High transpiration — verify soil moisture by hand.' : 'Moderate humidity.', 'water'));
  }
  return R;
}

export function useWeather(lat?: number | null, lng?: number | null) {
  const [state, setState] = useState<WeatherState>({ loading: false, live: false, error: null, days: [], risks: [], fetchedAt: null });

  const load = useCallback(async () => {
    if (lat == null || lng == null) return;
    setState((s) => ({ ...s, loading: true }));
    try {
      const u = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}`
        + '&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_gusts_10m_max'
        + '&hourly=temperature_2m,relative_humidity_2m,wind_gusts_10m,cape'
        + '&timezone=America%2FDenver&forecast_days=7&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch';
      const r = await fetch(u);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      const d = j.daily;
      const days: WxDay[] = d.time.map((t: string, i: number) => {
        const hi = Math.round(d.temperature_2m_max[i]);
        const pop = d.precipitation_probability_max[i] || 0;
        const gust = Math.round(d.wind_gusts_10m_max[i] || 0);
        return { dow: DOW[new Date(`${t}T12:00:00`).getDay()], hi, lo: Math.round(d.temperature_2m_min[i]), pop, gust, precip: d.precipitation_sum[i] || 0, note: dayNote(pop, gust, hi) };
      });
      setState({ loading: false, live: true, error: null, days, risks: computeRisks(days, j.hourly), fetchedAt: new Date() });
    } catch (e) {
      setState((s) => ({ ...s, loading: false, live: false, error: e instanceof Error ? e.message : 'network error' }));
    }
  }, [lat, lng]);

  useEffect(() => { load(); }, [load]);

  return { ...state, refresh: load };
}
