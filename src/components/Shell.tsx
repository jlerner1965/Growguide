// components/Shell.tsx
// App shell: desktop left sidebar + mobile bottom bar, both driven by one
// nav config. Every module is now built and routed — there is no longer a
// "planned" group.
import { useEffect, useState, type ReactNode } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useProfile } from '../db/hooks';

export interface NavItem { to: string; label: string }

export const NAV_MAIN: NavItem[] = [
  { to: '/', label: 'Dashboard' },
  { to: '/my-grow', label: 'My Grow' },
  { to: '/plants', label: 'Plants' },
  { to: '/journal', label: 'Daily Journal' },
  { to: '/diagnose', label: 'Diagnostics' },
  { to: '/weather', label: 'Weather Risks' },
  { to: '/irrigation', label: 'Irrigation' },
  { to: '/nutrition', label: 'Nutrition' },
  { to: '/harvest', label: 'Harvest Planner' },
  { to: '/training', label: 'Training' },
  { to: '/pests', label: 'Pest & Disease' },
  { to: '/photos', label: 'Photo Timeline' },
  { to: '/encyclopedia', label: 'Encyclopedia' },
  { to: '/reports', label: 'Reports' },
  { to: '/settings', label: 'Settings' },
];

const BOTTOM_BAR: NavItem[] = [
  { to: '/', label: 'Dashboard' },
  { to: '/journal', label: 'Journal' },
  { to: '/plants', label: 'Plants' },
  { to: '/weather', label: 'Weather' },
];

function NavButton({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      className={({ isActive }) => `navbtn${isActive ? ' active' : ''}`}
    >
      {item.label}
    </NavLink>
  );
}

export function Shell({ onSignOut }: { onSignOut: () => void }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const profile = useProfile();

  useEffect(() => {
    if (profile.data?.theme) document.documentElement.setAttribute('data-theme', profile.data.theme);
  }, [profile.data?.theme]);

  const sidebarContent: ReactNode = (
    <>
      <div className="brand">
        <h1>Grow Tracker</h1>
        <span>Cultivation Compass</span>
      </div>
      <nav className="shell-nav">
        {NAV_MAIN.map((item) => <NavButton key={item.to} item={item} />)}
      </nav>
      <div className="side-foot">
        <button className="btn ghost sm" style={{ color: 'inherit', width: '100%', justifyContent: 'flex-start' }} onClick={onSignOut}>
          Sign out
        </button>
      </div>
    </>
  );

  return (
    <div className="app-shell">
      <aside className="sidebar" style={{ display: drawerOpen ? 'flex' : undefined }}>
        {sidebarContent}
      </aside>

      {drawerOpen && (
        <div
          className="overlay no-print"
          style={{ background: 'rgba(16,22,15,.5)', padding: 0 }}
          onClick={() => setDrawerOpen(false)}
        >
          <aside className="sidebar" style={{ display: 'flex' }} onClick={(e) => e.stopPropagation()}>
            {sidebarContent}
          </aside>
        </div>
      )}

      <div className="main-col">
        <div className="topbar">
          <div className="spacer" />
        </div>
        <Outlet />
      </div>

      <nav className="bottom-bar no-print">
        {BOTTOM_BAR.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.to === '/'} className={({ isActive }) => (isActive ? 'active' : '')}>
            {item.label}
          </NavLink>
        ))}
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          style={{ background: 'none', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, color: 'var(--muted)', fontSize: '10.5px', fontWeight: 600, padding: '4px 6px' }}
        >
          More
        </button>
      </nav>
    </div>
  );
}
