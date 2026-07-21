// screens/ComingNext.tsx
// Honest placeholder for modules that aren't built yet — never a dead link.
// Says what the module will do (from docs/SPEC.md) and that it isn't live.
export interface ComingNextProps {
  title: string;
  blurb: string;
}

export function ComingNext({ title, blurb }: ComingNextProps) {
  return (
    <div className="content">
      <div className="page-head"><h2>{title}</h2><span className="pill gray">Coming next</span></div>
      <div className="card empty">
        <h4>Not built yet</h4>
        <p>{blurb}</p>
        <p className="small muted">See docs/SPEC.md for the full spec of this module.</p>
      </div>
    </div>
  );
}
