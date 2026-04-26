import {
  type ButtonHTMLAttributes,
  type CSSProperties,
  type ReactNode,
  type SVGProps,
  useState,
} from 'react';

// ─────────── Icons (Lucide-style, 1.75 stroke) ───────────
type IconProps = SVGProps<SVGSVGElement>;

export const I = {
  home: (p: IconProps) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2h-4v-7h-6v7H5a2 2 0 0 1-2-2V9z" />
    </svg>
  ),
  cube: (p: IconProps) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8l-9-5-9 5v8l9 5 9-5z" />
      <path d="M3.3 7L12 12l8.7-5M12 22V12" />
    </svg>
  ),
  card: (p: IconProps) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <path d="M2 10h20" />
    </svg>
  ),
  key: (p: IconProps) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7.5" cy="15.5" r="4.5" />
      <path d="M11 12l8.5-8.5L21 5l-1.5 1.5L21 8l-2 2-1.5-1.5L16 10l-1.5-1.5" />
    </svg>
  ),
  cog: (p: IconProps) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  out: (p: IconProps) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
    </svg>
  ),
  plus: (p: IconProps) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  rotate: (p: IconProps) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
      <polyline points="21 3 21 8 16 8" />
    </svg>
  ),
  copy: (p: IconProps) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  ),
  arrow: (p: IconProps) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  ),
  ext: (p: IconProps) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" />
    </svg>
  ),
  up: (p: IconProps) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 14l5-5 5 5" />
    </svg>
  ),
  down: (p: IconProps) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 10l5 5 5-5" />
    </svg>
  ),
  back: (p: IconProps) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  ),
};

// ─────────── Logo (full wordmark + mark) ───────────
export const Logo = ({ height = 22 }: { height?: number }) => (
  <svg
    height={height}
    viewBox="260 180 1180 580"
    fill="currentColor"
    aria-label="glyde"
    style={{ display: 'block' }}
  >
    {/* Mark */}
    <path d="M382.4,450.736c1.478,-10.391 6.463,-21.06 16.245,-27.719c19.773,-13.46 38.5,-12.866 38.5,-12.866l0,-0.008c0,0 -18.726,0.594 -38.5,-12.866c-9.782,-6.658 -14.767,-17.328 -16.245,-27.719l0,-175.28c0,0 30.231,-1.243 62.152,26.932c19.256,16.996 26.999,46.479 26.999,72.162c0,209.402 -0.269,209.402 -0.269,209.402l-88.882,53.035l0,-105.074Z" />
    <path d="M371.751,568.099l0,104.561l-97.289,58.477l0.057,-25.249c0,0 -0.81,-51.211 27.683,-85.432c10.054,-12.076 21.055,-21.886 31.28,-29.611c20.729,-15.66 38.27,-22.746 38.27,-22.746Z" />
    <path d="M274.26,616.289l0.259,-114.694c0,0 -3.506,-37.242 34.545,-83.962c39.511,-48.513 62.687,-53.826 62.687,-53.826l0,196.63l-97.491,55.853Z" />
    {/* Wordmark "glyde" */}
    <path d="M701.753,620.582c-13.708,0 -25.889,-2.067 -36.543,-6.202c-10.655,-4.133 -19.283,-10.174 -25.885,-18.123c-6.602,-7.949 -10.639,-17.601 -12.111,-28.955l32.205,0c1.549,5.863 4.301,10.742 8.255,14.637c3.955,3.895 8.835,6.835 14.642,8.82c5.806,1.987 12.285,2.98 19.437,2.98c14.464,0 25.797,-3.868 33.999,-11.605c8.204,-7.737 12.306,-18.767 12.306,-33.091l0,-26.34l-0.164,0c-4.093,6.693 -8.886,12.23 -14.378,16.611c-5.492,4.381 -11.557,7.633 -18.197,9.757c-6.638,2.124 -13.785,3.186 -21.442,3.186c-15.015,0 -28.185,-3.797 -39.511,-11.39c-11.324,-7.595 -20.104,-18.129 -26.342,-31.602c-6.236,-13.473 -9.354,-29.022 -9.354,-46.647c0,-17.768 3.127,-33.404 9.382,-46.906c6.255,-13.504 15.041,-24.037 26.357,-31.599c11.319,-7.564 24.451,-11.346 39.398,-11.346c7.557,0 14.714,1.044 21.47,3.132c6.756,2.086 12.956,5.351 18.6,9.795c5.644,4.443 10.407,10.152 14.29,17.129l0.164,0l0,-26.699l31.389,0l0,172.137c0,17.334 -3.542,31.303 -10.625,41.908c-7.081,10.607 -16.542,18.326 -28.383,23.159c-11.841,4.834 -24.828,7.252 -38.961,7.252Zm-1.953,-96.173c10.225,0 19.102,-2.559 26.632,-7.678c7.531,-5.119 13.344,-12.33 17.437,-21.634c4.095,-9.304 6.143,-20.177 6.143,-32.618c0,-12.54 -2.048,-23.459 -6.143,-32.757c-4.093,-9.298 -9.906,-16.502 -17.437,-21.614c-7.53,-5.113 -16.407,-7.67 -26.632,-7.67c-9.529,0 -17.964,2.361 -25.308,7.082c-7.343,4.721 -13.087,11.683 -17.232,20.885c-4.143,9.2 -6.215,20.558 -6.215,34.074c0,13.418 2.072,24.731 6.215,33.938c4.145,9.207 9.889,16.174 17.232,20.903c7.343,4.727 15.779,7.09 25.308,7.09Z" />
    <path d="M859.271,304.826l0,15.555l0.035,0l0,186.745c0,7.949 1.582,13.745 4.746,17.387c3.162,3.644 8.236,5.466 15.22,5.466l9.821,0l0,26.713l-13.591,0c-10.373,0 -19.141,-1.935 -26.305,-5.804c-7.164,-3.869 -12.611,-9.223 -16.34,-16.062c-3.729,-6.839 -5.594,-14.613 -5.594,-23.324l0,-206.676l32.007,0Z" />
    <path d="M906.377,613.754l0,-27.374l18.079,0c3.66,0 6.851,-0.713 9.572,-2.138c2.723,-1.426 5.175,-3.633 7.357,-6.623c2.182,-2.99 4.169,-6.853 5.96,-11.59l8.586,-22.266l-67.121,-172.166l34.343,0l35.773,97.046c3.212,8.69 6.305,17.389 9.28,26.098c2.974,8.709 5.848,17.414 8.622,26.116l-8.635,0c2.75,-8.702 5.634,-17.41 8.651,-26.124c3.019,-8.714 6.091,-17.411 9.218,-26.091l35.273,-97.046l33.835,0l-79.28,204.586c-3.185,8.154 -7.168,15.018 -11.949,20.592c-4.78,5.575 -10.307,9.799 -16.583,12.67c-6.275,2.872 -13.247,4.307 -20.916,4.307l-20.066,0Z" />
    <path d="M1141.394,552.969c-15.015,0 -28.185,-3.8 -39.511,-11.4c-11.324,-7.602 -20.104,-18.171 -26.342,-31.707c-6.236,-13.538 -9.354,-29.214 -9.354,-47.029c0,-17.84 3.127,-33.526 9.382,-47.057c6.255,-13.533 15.041,-24.084 26.357,-31.653c11.319,-7.569 24.451,-11.354 39.398,-11.354c7.557,0 14.708,1.057 21.452,3.17c6.744,2.112 12.859,5.283 18.343,9.513c5.486,4.229 10.086,9.557 13.797,15.984l0.311,0l0,-96.61l32.01,0l0,244.785l-31.353,0l0,-26.357l-0.311,0c-3.996,6.693 -8.786,12.242 -14.37,16.647c-5.582,4.405 -11.721,7.684 -18.415,9.837c-6.695,2.155 -13.826,3.232 -21.396,3.232Zm5.922,-27.993c10.225,0 19.102,-2.568 26.632,-7.703c7.531,-5.137 13.344,-12.373 17.437,-21.706c4.095,-9.333 6.143,-20.245 6.143,-32.734c0,-12.587 -2.048,-23.541 -6.143,-32.862c-4.093,-9.321 -9.906,-16.55 -17.437,-21.686c-7.53,-5.137 -16.407,-7.706 -26.632,-7.706c-9.529,0 -17.964,2.373 -25.308,7.118c-7.343,4.745 -13.087,11.73 -17.232,20.954c-4.143,9.224 -6.215,20.618 -6.215,34.182c0,13.466 2.072,24.817 6.215,34.053c4.145,9.236 9.889,16.227 17.232,20.972c7.343,4.745 15.779,7.118 25.308,7.118Z" />
    <path d="M1296.107,471.168c0.368,9.903 2.311,18.752 5.829,26.545c3.929,8.702 9.662,15.504 17.199,20.405c7.538,4.901 16.688,7.352 27.448,7.352c7.834,0 14.739,-1.212 20.715,-3.637c5.978,-2.427 10.94,-5.812 14.888,-10.157c3.948,-4.347 6.768,-9.372 8.461,-15.076l31.194,0c0,0 -6.795,20.944 -13.849,29.399c-7.054,8.456 -15.88,15.065 -26.478,19.827c-10.598,4.763 -22.337,7.144 -35.216,7.144c-17.082,0 -31.723,-3.885 -43.923,-11.654c-12.2,-7.771 -21.556,-18.477 -28.07,-32.118c-6.512,-13.643 -9.767,-29.183 -9.767,-46.621c0,-17.645 3.4,-33.31 10.199,-46.993c6.801,-13.685 16.213,-24.437 28.236,-32.256c12.024,-7.819 25.832,-11.728 41.425,-11.728c12.19,0 23.204,2.188 33.044,6.564c9.84,4.374 18.275,10.605 25.305,18.693c7.03,8.086 12.421,17.673 16.172,28.76c3.753,11.088 5.629,20.276 5.629,27.456c0,0 1.57,6.341 -4.819,12.73c-4.575,4.575 -13.583,5.367 -13.583,5.367l-110.04,0Zm0.315,-25.369l88.486,0c0,0 3.087,-0.002 5.119,-1.987c1.433,-1.399 2.287,-3.63 1.875,-5.707c-1.002,-4.802 -2.495,-9.239 -4.478,-13.312c-4.01,-8.235 -9.665,-14.601 -16.965,-19.098c-7.3,-4.499 -15.922,-6.749 -25.865,-6.749c-9.835,0 -18.381,2.25 -25.639,6.749c-7.256,4.497 -12.889,10.863 -16.898,19.098c-3.003,6.166 -4.881,13.168 -5.635,21.005Z" />
  </svg>
);

// ─────────── Helpers ───────────
export function formatUSDC(baseUnits: string): string {
  const v = BigInt(baseUnits || '0');
  const w = v / 1000000n;
  const f = (v % 1000000n).toString().padStart(6, '0');
  return `${w}.${f}`;
}

export function truncateMid(v: string, n = 6): string {
  if (!v) return '';
  if (v.length <= n * 2 + 2) return v;
  return `${v.slice(0, n + 2)}…${v.slice(-n)}`;
}

export function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export function formatRelative(ts: number): string {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ─────────── Atoms ───────────
type ButtonVariant = 'accent' | 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'sm';
}

export function Button({
  variant = 'secondary',
  size,
  className = '',
  children,
  ...rest
}: ButtonProps) {
  const cls = ['btn', `btn-${variant}`, size === 'sm' ? 'btn-sm' : '', className]
    .filter(Boolean)
    .join(' ');
  return (
    <button className={cls} {...rest}>
      {children}
    </button>
  );
}

type BadgeKind = 'active' | 'inactive' | 'pending' | 'failed' | 'tag';

interface BadgeProps {
  kind?: BadgeKind;
  children: ReactNode;
  dot?: boolean;
}

export function Badge({ kind = 'inactive', children, dot = true }: BadgeProps) {
  return (
    <span className={`badge ${kind}`}>
      {dot && kind !== 'tag' && <span className="b-dot" />}
      {children}
    </span>
  );
}

interface KPIProps {
  label: string;
  value: ReactNode;
  frac?: string;
  unit?: string;
  accent?: boolean;
  delta?: { dir: 'up' | 'down'; value: string };
  foot?: ReactNode;
}

export function KPI({ label, value, frac, unit, accent, delta, foot }: KPIProps) {
  return (
    <div className="kpi">
      <div className="kpi-lbl">
        <span>{label}</span>
        {delta && (
          <span className={`delta ${delta.dir}`}>
            {delta.dir === 'up' ? '▲' : '▼'} {delta.value}
          </span>
        )}
      </div>
      <div className={`kpi-val${accent ? ' hi' : ''}`}>
        {value}
        {frac && <span className="frac">{frac}</span>}
        {unit && <span className="unit">{unit}</span>}
      </div>
      {foot && (
        <div className="kpi-foot">
          <span>{foot}</span>
        </div>
      )}
    </div>
  );
}

interface CardProps {
  title?: ReactNode;
  sub?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  padded?: boolean;
}

export function Card({ title, sub, action, children, padded = true }: CardProps) {
  return (
    <div className="card">
      {(title || action) && (
        <div className="card-head">
          <div>
            {title && <h3>{title}</h3>}
            {sub && <div className="sub" style={{ marginTop: 4 }}>{sub}</div>}
          </div>
          {action}
        </div>
      )}
      <div className={padded ? 'card-body' : ''}>{children}</div>
    </div>
  );
}

interface ToggleProps {
  on: boolean;
  onChange: (next: boolean) => void;
  label: string;
}

export function Toggle({ on, onChange, label }: ToggleProps) {
  return (
    <div
      className={`toggle ${on ? 'on' : ''}`}
      onClick={() => onChange(!on)}
      style={{ cursor: 'pointer' }}
    >
      <span className="sw" />
      <span style={{ fontSize: 13, color: 'var(--fg-1)' }}>{label}</span>
    </div>
  );
}

interface CopyRowProps {
  text: string;
  mono?: boolean;
}

export function CopyRow({ text, mono = true }: CopyRowProps) {
  const [copied, setCopied] = useState(false);
  const onCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore — clipboard may be unavailable in iframes
    }
  };
  return (
    <span className="copy-row" style={{ fontFamily: mono ? 'var(--font-mono)' : 'inherit' }}>
      {text}
      <button className="copy-btn" onClick={onCopy} title="Copy" type="button">
        {copied ? (
          <span style={{ color: 'var(--glyde-jade)', fontSize: 11 }}>copied</span>
        ) : (
          <I.copy width="13" height="13" />
        )}
      </button>
    </span>
  );
}

// ─────────── Bar chart ───────────
interface BarChartDatum {
  value: number;
  label?: string;
}

interface BarChartProps {
  data: BarChartDatum[];
  height?: number;
  accent?: string;
}

export function BarChart({
  data,
  height = 180,
  accent = 'var(--glyde-chartreuse)',
}: BarChartProps) {
  const w = 600;
  const pad = { l: 36, r: 12, t: 10, b: 22 };
  const innerW = w - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;
  const max = Math.max(...data.map((d) => d.value)) * 1.15 || 1;
  const bw = innerW / Math.max(data.length, 1);

  return (
    <svg className="bar-chart" viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none">
      {[0.25, 0.5, 0.75, 1].map((t) => (
        <g key={t}>
          <line
            x1={pad.l}
            x2={w - pad.r}
            y1={pad.t + innerH * (1 - t)}
            y2={pad.t + innerH * (1 - t)}
            stroke="rgba(255,255,255,0.05)"
            strokeDasharray="2 4"
          />
          <text
            x={pad.l - 6}
            y={pad.t + innerH * (1 - t) + 4}
            fontSize="9"
            fill="var(--fg-3)"
            textAnchor="end"
            fontFamily="var(--font-mono)"
          >
            {(max * t).toFixed(2)}
          </text>
        </g>
      ))}
      {data.map((d, i) => {
        const h = (d.value / max) * innerH;
        return (
          <g key={i}>
            <rect
              x={pad.l + i * bw + bw * 0.18}
              y={pad.t + innerH - h}
              width={bw * 0.64}
              height={h}
              fill={accent}
              rx="2"
            />
            <text
              x={pad.l + i * bw + bw / 2}
              y={height - 6}
              fontSize="9"
              fill="var(--fg-3)"
              textAnchor="middle"
              fontFamily="var(--font-mono)"
            >
              {d.label || i}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ─────────── Field helpers ───────────
interface FieldProps {
  label: string;
  hint?: string;
  children: ReactNode;
  style?: CSSProperties;
}

export function Field({ label, hint, children, style }: FieldProps) {
  return (
    <div className="field" style={style}>
      <label>{label}</label>
      {children}
      {hint && <div className="hint">{hint}</div>}
    </div>
  );
}
