import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer,
  ScatterChart, Scatter, ZAxis,
  LineChart, Line, Legend,
  ReferenceLine,
} from 'recharts';
import {
  ArrowLeft, ArrowRight, TrendingDown, TrendingUp, Activity, Users, Calendar, Search, Info,
  Sparkles, Filter, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  CheckCircle2, AlertTriangle, Shuffle, CircleCheck, CircleX,
  ArrowDownLeft, ArrowUpRight, ArrowDownRight, ArrowUpLeft,
  HeartPulse, Gauge, ListChecks, Award, Database, X,
  type LucideIcon,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { buildPatients, computeAggregates, overallVariant, doctorShort, doctorInfo, type Patient, type OverallTrend } from '@/lib/data';
import { cn } from '@/utils/cn';
import funnel from '@/data/funnel.json';

const TREND_COLORS: Record<OverallTrend, string> = {
  'Both Improved': 'var(--color-success)',
  'No Worsening': 'var(--color-success-dark)',
  'Mixed': 'var(--color-warning)',
  'No Improvement': 'var(--color-error-dark)',
  'Both Worsened': 'var(--color-error)',
};

const TREND_LABEL: Record<OverallTrend, string> = {
  'Both Improved': 'Full Improvement',
  'No Worsening': 'Partial Improvement',
  'Mixed': 'Diverging',
  'No Improvement': 'Partial Decline',
  'Both Worsened': 'Full Decline',
};

const TREND_MEANING: Record<OverallTrend, string> = {
  'Both Improved': 'Both CAP and LSM dropped',
  'No Worsening': 'One marker dropped, the other held flat',
  'Mixed': 'One marker dropped, the other rose',
  'No Improvement': 'One marker rose, the other held flat',
  'Both Worsened': 'Both CAP and LSM rose',
};

const TREND_ICON: Record<OverallTrend, LucideIcon> = {
  'Both Improved': CircleCheck,
  'No Worsening': CheckCircle2,
  'Mixed': Shuffle,
  'No Improvement': AlertTriangle,
  'Both Worsened': CircleX,
};

const TREND_ORDER: OverallTrend[] = ['Both Improved', 'No Worsening', 'Mixed', 'No Improvement', 'Both Worsened'];

const PAGE_SIZE = 50;

const fmt = (n: number) => n.toLocaleString();
const pct = (n: number, d: number) => d ? +((n / d) * 100).toFixed(1) : 0;

function Kpi({ label, value, sub, accent, icon: Icon }: { label: string; value: string; sub?: ReactNode; accent?: string; icon?: LucideIcon }) {
  return (
    <Card hoverable={false} className="!p-4">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] text-[var(--text-muted)] font-semibold">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </div>
      <div className={cn('text-[28px] font-semibold leading-[1.1] mt-1.5 tracking-tight', accent ?? 'text-[var(--text-primary)]')}>
        {value}
      </div>
      {sub && <div className="text-[11.5px] text-[var(--text-secondary)] mt-1 leading-snug">{sub}</div>}
    </Card>
  );
}

function FunnelStep({ label, scans, patients, tone, note, icon: Icon }: { label: string; scans: number; patients: number; tone: 'neutral' | 'brand'; note?: string; icon?: LucideIcon }) {
  return (
    <div className={cn(
      'flex-1 min-w-[180px] rounded-[6px] px-4 py-3 border',
      tone === 'brand'
        ? 'border-[var(--border-brand)] bg-[var(--color-brand-accent)]/15'
        : 'border-[var(--border-subtle)] bg-[var(--bg-secondary)]'
    )}>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] text-[var(--text-muted)] font-semibold">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </div>
      <div className="flex items-baseline gap-1.5 mt-1">
        <div className={cn('text-[20px] font-semibold tracking-tight', tone === 'brand' ? 'text-[var(--text-brand)]' : 'text-[var(--text-primary)]')}>
          {fmt(scans)}
        </div>
        <div className="text-[11px] text-[var(--text-secondary)]">scans</div>
      </div>
      <div className="text-[11px] text-[var(--text-secondary)]">{fmt(patients)} patients</div>
      {note && <div className="text-[10.5px] text-[var(--text-muted)] mt-0.5">{note}</div>}
    </div>
  );
}

function FunnelArrow() {
  return <ArrowRight className="hidden sm:inline-block self-center h-3.5 w-3.5 text-[var(--text-muted)] shrink-0" />;
}

function SectionTitle({ eyebrow, title, lede, icon: Icon }: { eyebrow: string; title: string; lede?: string; icon?: LucideIcon }) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-[var(--text-brand)] font-semibold">
        {Icon && <Icon className="h-3 w-3" />}
        {eyebrow}
      </div>
      <div className="text-[18px] font-semibold text-[var(--text-primary)] mt-1 tracking-tight">{title}</div>
      {lede && <div className="text-[12.5px] text-[var(--text-secondary)] mt-1 leading-snug max-w-[720px]">{lede}</div>}
    </div>
  );
}

function HowToRead({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-[6px] bg-[var(--bg-secondary)] border border-[var(--border-subtle)] px-3 py-2">
      <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-[var(--text-brand)]" />
      <div className="text-[11.5px] text-[var(--text-secondary)] leading-snug">
        <span className="font-semibold text-[var(--text-primary)]">How to read: </span>{children}
      </div>
    </div>
  );
}

function MoversTable({ rows, onOpen, positive }: { rows: Patient[]; onOpen: (p: Patient) => void; positive?: boolean }) {
  const Icon = positive ? TrendingDown : TrendingUp;
  const iconColor = positive ? 'text-[var(--color-success-dark)]' : 'text-[var(--color-error-dark)]';
  const deltaColor = positive ? 'text-[var(--color-success-dark)]' : 'text-[var(--color-error-dark)]';
  return (
    <ul className="divide-y divide-[var(--border-subtle)]">
      {rows.map(p => {
        const doc = doctorShort(p.doctor_id);
        return (
          <li
            key={p.pm}
            onClick={() => onOpen(p)}
            className="flex items-center gap-3 py-2.5 cursor-pointer hover:bg-[var(--bg-tertiary)] -mx-2 px-2 rounded-[4px]"
          >
            <Icon className={cn('h-4 w-4 shrink-0', iconColor)} />
            <div className="min-w-0 flex-1">
              <div className="text-[12.5px] text-[var(--text-primary)] truncate">{p.name || '—'}</div>
              <div className="text-[10.5px] text-[var(--text-muted)] truncate leading-tight">
                <span className="font-mono">{p.pm}</span> · {doc} · {p.numScans} scans · {p.daysBetween}d
              </div>
            </div>
            <div className="shrink-0 text-right whitespace-nowrap">
              <div className={cn('text-[11.5px] font-medium font-mono tabular-nums', deltaColor)}>
                CAP&nbsp;{p.capDelta > 0 ? '+' : ''}{p.capDelta}
              </div>
              <div className={cn('text-[11.5px] font-medium font-mono tabular-nums', deltaColor)}>
                LSM&nbsp;{p.lsmDelta > 0 ? '+' : ''}{p.lsmDelta}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function FilterSelect({
  icon: Icon, label, value, onChange, options,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="relative inline-flex items-center" title={label}>
      <Icon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-muted)] pointer-events-none" />
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        aria-label={label}
        className="h-8 pl-8 pr-7 text-[12.5px] rounded-[6px] border border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)] appearance-none cursor-pointer"
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronRight className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-[var(--text-muted)] pointer-events-none rotate-90" />
    </label>
  );
}

function Pagination({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (p: number) => void }) {
  if (totalPages <= 1) return null;
  const btn = 'h-7 w-7 inline-flex items-center justify-center rounded-[5px] border border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-default)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors';
  return (
    <div className="flex items-center gap-1.5">
      <button className={btn} onClick={() => onPage(1)} disabled={page === 1} aria-label="First page"><ChevronsLeft className="h-3.5 w-3.5" /></button>
      <button className={btn} onClick={() => onPage(page - 1)} disabled={page === 1} aria-label="Previous"><ChevronLeft className="h-3.5 w-3.5" /></button>
      <div className="px-2 text-[11.5px] text-[var(--text-secondary)] tabular-nums">
        Page <span className="font-semibold text-[var(--text-primary)]">{page}</span> of {totalPages}
      </div>
      <button className={btn} onClick={() => onPage(page + 1)} disabled={page === totalPages} aria-label="Next"><ChevronRight className="h-3.5 w-3.5" /></button>
      <button className={btn} onClick={() => onPage(totalPages)} disabled={page === totalPages} aria-label="Last page"><ChevronsRight className="h-3.5 w-3.5" /></button>
    </div>
  );
}

type DirFilter = 'Any' | 'Improved' | 'Worsened' | 'Unchanged';
const DIR_OPTIONS: DirFilter[] = ['Any', 'Improved', 'Worsened', 'Unchanged'];

function matchDir(delta: number, dir: DirFilter): boolean {
  if (dir === 'Any') return true;
  if (dir === 'Improved') return delta < 0;
  if (dir === 'Worsened') return delta > 0;
  return delta === 0;
}

function AggregateView({ patients, onOpenPatient }: { patients: Patient[]; onOpenPatient: (p: Patient) => void }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<OverallTrend | 'All'>('All');
  const [scansMin, setScansMin] = useState<number>(2);
  const [capDir, setCapDir] = useState<DirFilter>('Any');
  const [lsmDir, setLsmDir] = useState<DirFilter>('Any');
  const [page, setPage] = useState(1);

  const agg = useMemo(() => computeAggregates(patients), [patients]);

  const distData = useMemo(() =>
    TREND_ORDER.map(key => ({
      key,
      value: {
        'Both Improved': agg.bothImproved,
        'No Worsening': agg.noWorsening,
        'Mixed': agg.mixed,
        'No Improvement': agg.noImprovement,
        'Both Worsened': agg.bothWorsened,
      }[key],
    })),
  [agg]);

  const scatterData = useMemo(() =>
    patients.map(p => ({ x: p.capDelta, y: p.lsmDelta, overall: p.overall, name: p.name, pm: p.pm })),
  [patients]);

  const topImprovers = useMemo(() =>
    [...patients]
      .filter(p => p.capDelta < 0 && p.lsmDelta < 0)
      .sort((a, b) => (a.capDelta + a.lsmDelta * 30) - (b.capDelta + b.lsmDelta * 30))
      .slice(0, 8),
  [patients]);

  const topDecliners = useMemo(() =>
    [...patients]
      .filter(p => p.capDelta > 0 && p.lsmDelta > 0)
      .sort((a, b) => (b.capDelta + b.lsmDelta * 30) - (a.capDelta + a.lsmDelta * 30))
      .slice(0, 8),
  [patients]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return patients
      .filter(p => filter === 'All' ? true : p.overall === filter)
      .filter(p => p.numScans >= scansMin)
      .filter(p => matchDir(p.capDelta, capDir))
      .filter(p => matchDir(p.lsmDelta, lsmDir))
      .filter(p => !q || p.name.toLowerCase().includes(q) || p.pm.includes(q))
      .sort((a, b) => b.numScans - a.numScans);
  }, [patients, query, filter, scansMin, capDir, lsmDir]);

  useEffect(() => { setPage(1); }, [query, filter, scansMin, capDir, lsmDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const clampedPage = Math.min(page, totalPages);
  const pageStart = (clampedPage - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(pageStart, pageStart + PAGE_SIZE);

  const improvedTotal = agg.bothImproved + agg.noWorsening;
  const worsenedTotal = agg.bothWorsened + agg.noImprovement;

  const filterActive = filter !== 'All' || query.trim().length > 0 || scansMin > 2 || capDir !== 'Any' || lsmDir !== 'Any';

  const clearFilters = () => {
    setQuery('');
    setFilter('All');
    setScansMin(2);
    setCapDir('Any');
    setLsmDir('Any');
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
      <header className="mb-6 sm:mb-7">
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-[var(--text-brand)] font-semibold">
          <HeartPulse className="h-3 w-3" />
          Liver Forever · Fibroscan Outcomes
        </div>
        <h1 className="text-[22px] sm:text-[26px] font-semibold text-[var(--text-primary)] mt-1.5 tracking-tight leading-tight">Patient Trajectory Dashboard</h1>
        <p className="text-[13px] text-[var(--text-secondary)] mt-1.5 max-w-[760px] leading-relaxed">
          Every Fibroscan upload is OCR'd into two numbers — <strong className="text-[var(--text-primary)]">CAP</strong> (steatosis, dB/m) and <strong className="text-[var(--text-primary)]">LSM</strong> (fibrosis, kPa).
          Lower is healthier on both. This dashboard tracks how those numbers move for patients who return for a second scan.
        </p>
      </header>

      {/* Narrative hero — AI gradient */}
      <div className="relative rounded-[10px] overflow-hidden mb-8 sm:mb-9 p-[1px] bg-[linear-gradient(135deg,var(--color-brand-primary)_0%,var(--color-accent-indigo)_40%,var(--color-accent-cyan)_100%)]">
        <div className="relative rounded-[9px] bg-[var(--bg-elevated)] p-4 sm:p-6">
          <div className="absolute inset-0 rounded-[9px] bg-[linear-gradient(135deg,rgba(112,48,160,0.06)_0%,rgba(99,102,241,0.04)_40%,rgba(6,182,212,0.06)_100%)] pointer-events-none" />
          <div className="relative">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] font-semibold bg-[linear-gradient(90deg,var(--color-brand-primary),var(--color-accent-indigo),var(--color-accent-cyan))] bg-clip-text text-transparent mb-3">
              <Sparkles className="h-3 w-3 text-[var(--color-brand-primary)]" />
              The Story So Far
            </div>
            <div className="text-[13.5px] text-[var(--text-primary)] leading-[1.7] space-y-3">
              <p>
                Of <strong>{fmt(funnel.totalPatients)}</strong> patients with an uploaded Fibroscan, only
                {' '}<strong>{fmt(funnel.cohortPatients)}</strong> ({pct(funnel.cohortPatients, funnel.validPatients)}%) have returned for a second valid reading —
                the rest are one-time visitors with no before-vs-after to assess.
                Within that returning cohort, <strong className="text-[var(--color-success-dark)]">{fmt(improvedTotal)}</strong> patients ({agg.improvedPct}%) are improving or stable,
                {' '}<strong className="text-[var(--color-error-dark)]">{fmt(worsenedTotal)}</strong> ({agg.worsenedPct}%) are trending worse,
                and <strong className="text-[var(--color-warning-dark)]">{fmt(agg.mixed)}</strong> ({pct(agg.mixed, agg.totalPatients)}%) show mixed signals where one marker improved while the other slipped.
              </p>
              <p className="text-[var(--text-secondary)]">
                On average, a patient sits <strong className="text-[var(--text-primary)]">{agg.medianDaysBetween} days</strong> between scans.
                Cohort-wide, CAP has moved by <strong className="text-[var(--text-primary)]">{agg.avgCapDelta > 0 ? '+' : ''}{agg.avgCapDelta} dB/m</strong> on average
                and LSM by <strong className="text-[var(--text-primary)]">{agg.avgLsmDelta > 0 ? '+' : ''}{agg.avgLsmDelta} kPa</strong> —
                both numbers are <em>changes from baseline</em>, so a negative value means the cohort is, on net, getting healthier on that marker.
              </p>
              <p className="text-[var(--text-secondary)]">
                The follow-through rate — only 1 in {Math.round(funnel.validPatients / funnel.cohortPatients)} valid first-scan patients comes back — is itself a programme signal:
                it caps how much outcome data exists to judge the intervention by, and suggests the biggest lever isn't treatment efficacy but retention and recall.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Funnel */}
      <section className="mb-8">
        <SectionTitle icon={Database} eyebrow="Data Scope" title="From every upload to a trackable cohort"
          lede="A trajectory requires a before and an after — the funnel below shows how the full corpus narrows down to the patients this dashboard analyses." />
        <Card hoverable={false} className="!p-4">
          <div className="flex items-stretch gap-2 flex-wrap">
            <FunnelStep icon={Database} label="All Fibroscan uploads" scans={funnel.totalScans} patients={funnel.totalPatients} tone="neutral" />
            <FunnelArrow />
            <FunnelStep icon={CheckCircle2} label="Valid CAP & LSM" scans={funnel.validScans} patients={funnel.validPatients} tone="neutral"
              note={`${pct(funnel.validScans, funnel.totalScans)}% of scans parseable`} />
            <FunnelArrow />
            <FunnelStep icon={ListChecks} label="Trackable (≥2 scans)" scans={funnel.cohortScans} patients={funnel.cohortPatients} tone="brand"
              note={`${pct(funnel.cohortPatients, funnel.validPatients)}% of valid patients return`} />
          </div>
        </Card>
      </section>

      {/* KPIs */}
      <section className="mb-10">
        <SectionTitle icon={Gauge} eyebrow="At a Glance" title="Cohort headline numbers" lede={`Everything below is computed on the ${fmt(agg.totalPatients)} trackable patients only.`} />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Kpi icon={Users} label="Trackable Patients" value={fmt(agg.totalPatients)} sub={`${fmt(agg.totalScans)} scans · avg ${agg.avgScansPerPatient}/patient`} />
          <Kpi icon={TrendingDown} label="Improving or Stable" value={`${agg.improvedPct}%`} sub={`${fmt(improvedTotal)} patients — no marker worsened`} accent="text-[var(--color-success-dark)]" />
          <Kpi icon={TrendingUp} label="Trending Worse" value={`${agg.worsenedPct}%`} sub={`${fmt(worsenedTotal)} patients — at least one marker up`} accent="text-[var(--color-error-dark)]" />
          <Kpi icon={Calendar} label="Median Gap Between Scans" value={`${agg.medianDaysBetween}d`} sub={`Avg ΔCAP ${agg.avgCapDelta} dB/m · ΔLSM ${agg.avgLsmDelta} kPa`} />
        </div>
      </section>

      {/* Donut + narrative breakdown */}
      <section className="mb-10">
        <SectionTitle icon={Award} eyebrow="Outcome Mix" title="How every tracked patient fared"
          lede="Each patient is placed in exactly one of five buckets based on the direction of change in both CAP and LSM between first and latest scan." />
        <Card hoverable={false} className="!p-0 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-0">
            <div className="lg:col-span-2 p-5 border-b lg:border-b-0 lg:border-r border-[var(--border-subtle)] flex flex-col">
              <div className="relative flex-1 min-h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={distData}
                      dataKey="value"
                      nameKey="key"
                      innerRadius="58%"
                      outerRadius="90%"
                      paddingAngle={1.5}
                      stroke="var(--bg-elevated)"
                      strokeWidth={2}
                    >
                      {distData.map(d => <Cell key={d.key} fill={TREND_COLORS[d.key]} />)}
                    </Pie>
                    <RTooltip
                      contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 6, fontSize: 12, padding: '6px 10px' }}
                      formatter={(value, name) => {
                        const v = Number(value);
                        return [`${fmt(v)} patients (${pct(v, agg.totalPatients)}%)`, TREND_LABEL[name as OverallTrend] ?? String(name)];
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)] font-semibold">Tracked</div>
                  <div className="text-[28px] font-semibold text-[var(--text-primary)] tracking-tight leading-none mt-0.5">{fmt(agg.totalPatients)}</div>
                  <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">patients</div>
                </div>
              </div>
            </div>
            <div className="lg:col-span-3 p-5">
              <div className="text-[12px] text-[var(--text-secondary)] mb-3 leading-relaxed">
                Two positive buckets (green) + one neutral (amber) + two negative (red). The split tells you whether the cohort is, on balance, getting better or worse.
              </div>
              <div className="divide-y divide-[var(--border-subtle)]">
                {distData.map(d => {
                  const p = pct(d.value, agg.totalPatients);
                  const TIcon = TREND_ICON[d.key];
                  return (
                    <div key={d.key} className="flex items-center gap-3 py-2.5">
                      <span className="w-2.5 h-2.5 rounded-[2px] shrink-0" style={{ background: TREND_COLORS[d.key] }} />
                      <TIcon className="h-3.5 w-3.5 shrink-0" style={{ color: TREND_COLORS[d.key] }} />
                      <div className="flex-1 min-w-0">
                        <div className="text-[12.5px] font-medium text-[var(--text-primary)]">{TREND_LABEL[d.key]}</div>
                        <div className="text-[11px] text-[var(--text-muted)]">{TREND_MEANING[d.key]}</div>
                      </div>
                      <div className="text-right shrink-0 w-[110px]">
                        <div className="text-[14px] font-semibold text-[var(--text-primary)] tracking-tight">{fmt(d.value)}</div>
                        <div className="text-[11px] text-[var(--text-secondary)]">{p}%</div>
                      </div>
                      <div className="w-[100px] h-1.5 rounded-full bg-[var(--bg-tertiary)] overflow-hidden shrink-0">
                        <div className="h-full rounded-full" style={{ width: `${p}%`, background: TREND_COLORS[d.key] }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4">
                <HowToRead>
                  Green = improvement signal. Red = intervention isn't moving markers. Amber "Diverging" is worth a clinical review — one marker improves while the other slips.
                </HowToRead>
              </div>
            </div>
          </div>
        </Card>
      </section>

      {/* Scatter */}
      <section className="mb-10">
        <SectionTitle icon={Activity} eyebrow="Before vs After" title="Every patient's journey as a single dot"
          lede="Horizontal axis = change in CAP (fat). Vertical axis = change in LSM (stiffness). Origin = no change." />
        <Card hoverable={false} className="!p-0 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-0">
            <div className="lg:col-span-3 p-5 border-b lg:border-b-0 lg:border-r border-[var(--border-subtle)]">
              <div className="h-[340px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 8, right: 16, bottom: 20, left: 4 }}>
                    <CartesianGrid stroke="var(--border-subtle)" />
                    <XAxis type="number" dataKey="x" name="ΔCAP (dB/m)"
                      tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                      label={{ value: '← improved   ΔCAP (dB/m)   worsened →', position: 'insideBottom', offset: -8, fill: 'var(--text-muted)', fontSize: 10.5 }} />
                    <YAxis type="number" dataKey="y" name="ΔLSM (kPa)"
                      tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                      label={{ value: 'ΔLSM (kPa)', angle: -90, position: 'insideLeft', fill: 'var(--text-muted)', fontSize: 10.5 }} />
                    <ZAxis range={[20, 20]} />
                    <ReferenceLine x={0} stroke="var(--text-muted)" strokeDasharray="3 3" />
                    <ReferenceLine y={0} stroke="var(--text-muted)" strokeDasharray="3 3" />
                    <RTooltip
                      cursor={{ strokeDasharray: '3 3' }}
                      contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 6, fontSize: 12, padding: '6px 10px' }}
                    />
                    <Scatter data={scatterData} fillOpacity={0.55}>
                      {scatterData.map((d, i) => <Cell key={i} fill={TREND_COLORS[d.overall]} />)}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="lg:col-span-2 p-5 flex flex-col gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-[0.12em] text-[var(--text-muted)] font-semibold mb-2">The four quadrants</div>
                <div className="grid grid-cols-2 gap-2 text-[11.5px]">
                  <div className="rounded-[6px] border border-[var(--border-subtle)] p-2.5 bg-[var(--color-success-light)]/40">
                    <div className="flex items-center gap-1 font-semibold text-[var(--color-success-dark)]"><ArrowDownLeft className="h-3 w-3" />Bottom-Left</div>
                    <div className="text-[var(--text-secondary)] mt-0.5">Both markers improved. The goal.</div>
                  </div>
                  <div className="rounded-[6px] border border-[var(--border-subtle)] p-2.5 bg-[var(--color-error-light)]/40">
                    <div className="flex items-center gap-1 font-semibold text-[var(--color-error-dark)]"><ArrowUpRight className="h-3 w-3" />Top-Right</div>
                    <div className="text-[var(--text-secondary)] mt-0.5">Both markers worsened. Escalation.</div>
                  </div>
                  <div className="rounded-[6px] border border-[var(--border-subtle)] p-2.5 bg-[var(--color-warning-light)]/40">
                    <div className="flex items-center gap-1 font-semibold text-[var(--color-warning-dark)]"><ArrowDownRight className="h-3 w-3" />Bottom-Right</div>
                    <div className="text-[var(--text-secondary)] mt-0.5">Fat dropped but stiffness rose.</div>
                  </div>
                  <div className="rounded-[6px] border border-[var(--border-subtle)] p-2.5 bg-[var(--color-warning-light)]/40">
                    <div className="flex items-center gap-1 font-semibold text-[var(--color-warning-dark)]"><ArrowUpLeft className="h-3 w-3" />Top-Left</div>
                    <div className="text-[var(--text-secondary)] mt-0.5">Stiffness dropped but fat rose.</div>
                  </div>
                </div>
              </div>
              <HowToRead>
                Dot color matches the outcome bucket from the donut. Distance from the origin = magnitude of change. Outliers far from the centre are your biggest stories, good or bad.
              </HowToRead>
            </div>
          </div>
        </Card>
      </section>

      {/* Movers */}
      <section className="mb-10">
        <SectionTitle icon={Award} eyebrow="The Extremes" title="Who moved the most"
          lede="Sorted by a combined CAP + weighted-LSM delta so a big shift on either marker bubbles up. Click a row to drill in." />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card hoverable={false} className="!p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-[var(--color-success-dark)] font-semibold">
                  <TrendingDown className="h-3 w-3" />
                  Top Improvers
                </div>
                <div className="text-[14px] font-semibold text-[var(--text-primary)] mt-0.5 tracking-tight">Biggest combined drop</div>
              </div>
              <Badge variant="success" size="md">CAP ↓ & LSM ↓</Badge>
            </div>
            <MoversTable rows={topImprovers} onOpen={onOpenPatient} positive />
          </Card>
          <Card hoverable={false} className="!p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-[var(--color-error-dark)] font-semibold">
                  <TrendingUp className="h-3 w-3" />
                  Top Decliners
                </div>
                <div className="text-[14px] font-semibold text-[var(--text-primary)] mt-0.5 tracking-tight">Biggest combined rise</div>
              </div>
              <Badge variant="error" size="md">CAP ↑ & LSM ↑</Badge>
            </div>
            <MoversTable rows={topDecliners} onOpen={onOpenPatient} />
          </Card>
        </div>
      </section>

      {/* Roster */}
      <section>
        <SectionTitle icon={Users} eyebrow="Patient Roster" title="Every tracked patient"
          lede="Search by name or mobile, filter by trajectory, click any row to open the full scan timeline." />
        <Card hoverable={false} className="!p-0 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)] flex-wrap">
            <div className="relative flex-1 min-w-[160px] sm:flex-none">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-muted)]" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search name or mobile…"
                className="h-8 pl-8 pr-3 text-[12.5px] rounded-[6px] border border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] w-full sm:w-[240px] outline-none focus:border-[var(--border-focus)]"
              />
            </div>

            <FilterSelect
              icon={Filter}
              label="Trajectory"
              value={filter}
              onChange={v => setFilter(v as OverallTrend | 'All')}
              options={[
                { value: 'All', label: 'All trajectories' },
                ...TREND_ORDER.map(t => ({ value: t, label: TREND_LABEL[t] })),
              ]}
            />

            <FilterSelect
              icon={ListChecks}
              label="Scans"
              value={String(scansMin)}
              onChange={v => setScansMin(Number(v))}
              options={[
                { value: '2',  label: '≥2 scans (all)' },
                { value: '3',  label: '≥3 scans' },
                { value: '4',  label: '≥4 scans' },
                { value: '5',  label: '≥5 scans' },
                { value: '10', label: '≥10 scans' },
              ]}
            />

            <FilterSelect
              icon={TrendingDown}
              label="ΔCAP"
              value={capDir}
              onChange={v => setCapDir(v as DirFilter)}
              options={DIR_OPTIONS.map(d => ({
                value: d,
                label: d === 'Any' ? 'ΔCAP: any' : d === 'Improved' ? 'ΔCAP: improved (↓)' : d === 'Worsened' ? 'ΔCAP: worsened (↑)' : 'ΔCAP: unchanged',
              }))}
            />

            <FilterSelect
              icon={Activity}
              label="ΔLSM"
              value={lsmDir}
              onChange={v => setLsmDir(v as DirFilter)}
              options={DIR_OPTIONS.map(d => ({
                value: d,
                label: d === 'Any' ? 'ΔLSM: any' : d === 'Improved' ? 'ΔLSM: improved (↓)' : d === 'Worsened' ? 'ΔLSM: worsened (↑)' : 'ΔLSM: unchanged',
              }))}
            />

            {filterActive && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-1 h-8 px-2.5 text-[11.5px] rounded-[6px] border border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                <X className="h-3 w-3" />
                Clear all
              </button>
            )}
            <div className="ml-auto text-[11.5px] text-[var(--text-secondary)]">
              <span className="font-semibold text-[var(--text-primary)]">{fmt(filtered.length)}</span>
              {filterActive ? <> matching</> : <> total</>}
              <span className="text-[var(--text-muted)]"> / {fmt(agg.totalPatients)} tracked</span>
            </div>
          </div>
          <div className="max-h-[640px] overflow-auto">
            <table className="w-full text-[12px] min-w-[960px]">
              <thead className="sticky top-0 z-[1] bg-[var(--bg-elevated)] text-[var(--text-secondary)] text-[10px] uppercase tracking-[0.1em] shadow-[0_1px_0_var(--border-subtle)]">
                <tr>
                  <th className="text-left px-4 py-2.5 font-semibold">Patient</th>
                  <th className="text-left px-3 py-2.5 font-semibold">Mobile</th>
                  <th className="text-left px-3 py-2.5 font-semibold">Doctor</th>
                  <th className="text-right px-3 py-2.5 font-semibold" title="Scans on record">Scans</th>
                  <th className="text-right px-3 py-2.5 font-semibold" title="Days between first and latest scan">Span</th>
                  <th className="text-right px-3 py-2.5 font-semibold" title="Change in CAP from first to latest (dB/m)">ΔCAP</th>
                  <th className="text-right px-3 py-2.5 font-semibold" title="Change in LSM from first to latest (kPa)">ΔLSM</th>
                  <th className="text-left px-3 py-2.5 font-semibold">Trajectory</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map(p => (
                  <tr
                    key={p.pm}
                    onClick={() => onOpenPatient(p)}
                    className="border-t border-[var(--border-subtle)] hover:bg-[var(--bg-tertiary)] cursor-pointer"
                  >
                    <td className="px-4 py-2 text-[var(--text-primary)] whitespace-nowrap">{p.name || '—'}</td>
                    <td className="px-3 py-2 font-mono text-[11px] text-[var(--text-secondary)] whitespace-nowrap">{p.pm}</td>
                    <td className="px-3 py-2 text-[var(--text-secondary)] max-w-[220px] whitespace-nowrap">
                      <div className="truncate" title={p.doctor_id}>{doctorShort(p.doctor_id)}</div>
                      {p.doctor_id && <div className="font-mono text-[10px] text-[var(--text-muted)]">#{p.doctor_id}</div>}
                    </td>
                    <td className="px-3 py-2 text-right text-[var(--text-secondary)] tabular-nums">{p.numScans}</td>
                    <td className="px-3 py-2 text-right text-[var(--text-secondary)] tabular-nums">{p.daysBetween}d</td>
                    <td className={cn('px-3 py-2 text-right font-mono font-medium tabular-nums', p.capDelta < 0 ? 'text-[var(--color-success-dark)]' : p.capDelta > 0 ? 'text-[var(--color-error-dark)]' : 'text-[var(--text-muted)]')}>
                      {p.capDelta > 0 ? '+' : ''}{p.capDelta}
                    </td>
                    <td className={cn('px-3 py-2 text-right font-mono font-medium tabular-nums', p.lsmDelta < 0 ? 'text-[var(--color-success-dark)]' : p.lsmDelta > 0 ? 'text-[var(--color-error-dark)]' : 'text-[var(--text-muted)]')}>
                      {p.lsmDelta > 0 ? '+' : ''}{p.lsmDelta}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <Badge variant={overallVariant(p.overall)} className="whitespace-nowrap">{TREND_LABEL[p.overall]}</Badge>
                    </td>
                  </tr>
                ))}
                {pageRows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-[12.5px] text-[var(--text-muted)]">
                      No patients match your search or filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
            <div className="text-[11px] text-[var(--text-muted)] tabular-nums">
              {filtered.length > 0
                ? <>Rows {fmt(pageStart + 1)}–{fmt(Math.min(pageStart + PAGE_SIZE, filtered.length))} of {fmt(filtered.length)}</>
                : '—'}
            </div>
            <Pagination page={clampedPage} totalPages={totalPages} onPage={setPage} />
          </div>
        </Card>
      </section>
    </div>
  );
}

function PatientView({ patient, onBack }: { patient: Patient; onBack: () => void }) {
  const series = patient.scans.map(s => ({ date: s.date, CAP: s.cap, LSM: s.lsm }));
  const doc = doctorInfo(patient.doctor_id);
  const docLabel = doc && doc.name ? `Dr. ${doc.name}` : patient.doctor_id || '—';
  const docMeta = doc ? [doc.clinic, doc.city, doc.state].filter(Boolean).join(' · ') : '';

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-[12.5px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-5"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to dashboard
      </button>

      <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
        <div>
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-[var(--text-brand)] font-semibold">
            <HeartPulse className="h-3 w-3" />
            Patient Timeline
          </div>
          <h2 className="text-[20px] sm:text-[24px] font-semibold text-[var(--text-primary)] mt-1 tracking-tight leading-tight">{patient.name || '—'}</h2>
          <div className="text-[12px] text-[var(--text-secondary)] mt-1.5 flex items-center gap-3 flex-wrap">
            <span className="font-mono">{patient.pm}</span>
            <span className="text-[var(--text-muted)]">·</span>
            <span className="inline-flex items-center gap-1">
              <Users className="h-3 w-3" />
              {docLabel}
              {patient.doctor_id && <span className="font-mono text-[10.5px] text-[var(--text-muted)]">#{patient.doctor_id}</span>}
            </span>
            <span className="text-[var(--text-muted)]">·</span>
            <span className="inline-flex items-center gap-1"><Activity className="h-3 w-3" />Machine {patient.machine_id || '—'}</span>
          </div>
          {docMeta && <div className="text-[11.5px] text-[var(--text-muted)] mt-1">{docMeta}</div>}
        </div>
        <Badge variant={overallVariant(patient.overall)} size="md">{TREND_LABEL[patient.overall]}</Badge>
      </div>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Kpi icon={ListChecks} label="Scans on Record" value={String(patient.numScans)} sub={`${patient.firstDate} → ${patient.latestDate}`} />
        <Kpi icon={Calendar} label="Days Tracked" value={`${patient.daysBetween}d`} sub="First → Latest" />
        <Kpi
          icon={TrendingDown}
          label="CAP Change"
          value={`${patient.capDelta > 0 ? '+' : ''}${patient.capDelta}`}
          sub={`${patient.firstCap} → ${patient.latestCap} dB/m`}
          accent={patient.capDelta < 0 ? 'text-[var(--color-success-dark)]' : patient.capDelta > 0 ? 'text-[var(--color-error-dark)]' : undefined}
        />
        <Kpi
          icon={Activity}
          label="LSM Change"
          value={`${patient.lsmDelta > 0 ? '+' : ''}${patient.lsmDelta}`}
          sub={`${patient.firstLsm} → ${patient.latestLsm} kPa`}
          accent={patient.lsmDelta < 0 ? 'text-[var(--color-success-dark)]' : patient.lsmDelta > 0 ? 'text-[var(--color-error-dark)]' : undefined}
        />
      </section>

      <Card hoverable={false} className="!p-5 mb-6">
        <SectionTitle icon={Activity} eyebrow="Trend" title="CAP and LSM over time" lede="Dual-axis: CAP in dB/m (left), LSM in kPa (right). Watch whether the two lines move together or diverge." />
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series} margin={{ top: 10, right: 16, bottom: 8, left: 4 }}>
              <CartesianGrid stroke="var(--border-subtle)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
              <YAxis yAxisId="cap" orientation="left" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                label={{ value: 'CAP (dB/m)', angle: -90, position: 'insideLeft', fill: 'var(--text-muted)', fontSize: 10.5 }} />
              <YAxis yAxisId="lsm" orientation="right" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                label={{ value: 'LSM (kPa)', angle: 90, position: 'insideRight', fill: 'var(--text-muted)', fontSize: 10.5 }} />
              <RTooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 6, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line yAxisId="cap" type="monotone" dataKey="CAP" stroke="var(--color-accent-purple)" strokeWidth={2} dot={{ r: 3 }} />
              <Line yAxisId="lsm" type="monotone" dataKey="LSM" stroke="var(--color-accent-teal)" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card hoverable={false} className="!p-0 overflow-hidden">
        <div className="px-5 pt-4 pb-3 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-[var(--text-brand)] font-semibold">
            <ListChecks className="h-3 w-3" />
            Raw Log
          </div>
          <div className="text-[14px] font-semibold text-[var(--text-primary)] tracking-tight mt-0.5">Every scan on record</div>
        </div>
        <div className="overflow-x-auto">
        <table className="w-full text-[12px] min-w-[860px]">
          <thead className="bg-[var(--bg-secondary)] text-[var(--text-secondary)] text-[10px] uppercase tracking-[0.1em]">
            <tr>
              <th className="text-left px-4 py-2.5 font-semibold">#</th>
              <th className="text-left px-3 py-2.5 font-semibold">Date</th>
              <th className="text-right px-3 py-2.5 font-semibold">CAP</th>
              <th className="text-right px-3 py-2.5 font-semibold">Δ vs first</th>
              <th className="text-right px-3 py-2.5 font-semibold">LSM</th>
              <th className="text-right px-3 py-2.5 font-semibold">Δ vs first</th>
              <th className="text-left px-3 py-2.5 font-semibold">Doctor</th>
              <th className="text-left px-3 py-2.5 font-semibold">Machine</th>
            </tr>
          </thead>
          <tbody>
            {patient.scans.map((s, i) => {
              const dCap = +(s.cap - patient.firstCap).toFixed(1);
              const dLsm = +(s.lsm - patient.firstLsm).toFixed(2);
              return (
                <tr key={i} className="border-t border-[var(--border-subtle)]">
                  <td className="px-4 py-2 text-[var(--text-muted)]">{i + 1}</td>
                  <td className="px-3 py-2 text-[var(--text-primary)]">{s.date}</td>
                  <td className="px-3 py-2 text-right font-mono text-[var(--text-primary)]">{s.cap}</td>
                  <td className={cn('px-3 py-2 text-right font-mono', dCap < 0 ? 'text-[var(--color-success-dark)]' : dCap > 0 ? 'text-[var(--color-error-dark)]' : 'text-[var(--text-muted)]')}>
                    {i === 0 ? '—' : `${dCap > 0 ? '+' : ''}${dCap}`}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-[var(--text-primary)]">{s.lsm}</td>
                  <td className={cn('px-3 py-2 text-right font-mono', dLsm < 0 ? 'text-[var(--color-success-dark)]' : dLsm > 0 ? 'text-[var(--color-error-dark)]' : 'text-[var(--text-muted)]')}>
                    {i === 0 ? '—' : `${dLsm > 0 ? '+' : ''}${dLsm}`}
                  </td>
                  <td className="px-3 py-2 text-[var(--text-secondary)]">
                    <div className="truncate max-w-[160px]" title={s.doctor_id}>{doctorShort(s.doctor_id)}</div>
                    {s.doctor_id && <div className="font-mono text-[10px] text-[var(--text-muted)]">#{s.doctor_id}</div>}
                  </td>
                  <td className="px-3 py-2 text-[var(--text-secondary)]">{s.machine_id || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </Card>
    </div>
  );
}

export default function App() {
  const patients = useMemo(() => buildPatients(), []);
  const [selected, setSelected] = useState<Patient | null>(null);

  // Scroll to top whenever the view switches (roster → patient → back).
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [selected]);

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)]">
      {selected
        ? <PatientView patient={selected} onBack={() => setSelected(null)} />
        : <AggregateView patients={patients} onOpenPatient={setSelected} />}
    </div>
  );
}
