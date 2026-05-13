import { type ReactNode, useMemo } from 'react';
import {
  FunnelChart, Funnel, LabelList, Tooltip as RTooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts';
import {
  Users, LogIn, FileUp, FilePlus2, CheckCircle2, Info, AlertTriangle, ListChecks, Database, Activity, Sparkles, Clock, Bot, Globe,
  type LucideIcon,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/utils/cn';
import data from '@/data/registration-funnel.json';

const fmt = (n: number) => n.toLocaleString('en-IN');
const pct = (n: number, d: number) => (d ? +((n / d) * 100).toFixed(1) : 0);

const FUNNEL_COLORS = [
  '#7030A0', // brand primary
  '#403CCF', // brand secondary
  '#6366f1', // indigo
  '#06b6d4', // cyan
  '#14b8a6', // teal
];
const BAR_UPLOADED = '#C3C2F0'; // brand accent
const BAR_VERIFIED = '#7030A0'; // brand primary

type Summary = typeof data.summary;
type Cohort = (typeof data.cohorts)[number];
type MonthRow = (typeof data.month_funnel)[number];
type SourceRow = (typeof data.by_source)[number];

function Kpi({ label, value, sub, accent, icon: Icon }: { label: string; value: string; sub?: ReactNode; accent?: string; icon?: LucideIcon }) {
  return (
    <Card hoverable={false} className="!p-4">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] text-[var(--text-muted)] font-semibold">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </div>
      <div className={cn('text-[22px] sm:text-[24px] font-semibold leading-[1.1] mt-1.5 tracking-tight', accent ?? 'text-[var(--text-primary)]')}>
        {value}
      </div>
      {sub && <div className="text-[11px] text-[var(--text-secondary)] mt-1 leading-snug">{sub}</div>}
    </Card>
  );
}

function SectionTitle({ eyebrow, title, lede, icon: Icon }: { eyebrow: string; title: string; lede?: string; icon?: LucideIcon }) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-[var(--text-brand)] font-semibold">
        {Icon && <Icon className="h-3 w-3" />}
        {eyebrow}
      </div>
      <div className="text-[16px] sm:text-[18px] font-semibold text-[var(--text-primary)] mt-1 tracking-tight">{title}</div>
      {lede && <div className="text-[12px] sm:text-[12.5px] text-[var(--text-secondary)] mt-1 leading-snug max-w-[720px]">{lede}</div>}
    </div>
  );
}

function HowToRead({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-[6px] bg-[var(--bg-secondary)] border border-[var(--border-subtle)] px-3 py-2">
      <Info className="h-3.5 w-3.5 text-[var(--text-muted)] mt-0.5 shrink-0" />
      <div className="text-[11.5px] text-[var(--text-secondary)] leading-snug">{children}</div>
    </div>
  );
}

function OverallFunnelChart({ summary }: { summary: Summary }) {
  const stages = useMemo(
    () => [
      { name: 'Signed Up', value: summary.signed_up, fill: FUNNEL_COLORS[0] },
      { name: 'App Login', value: summary.app_login, fill: FUNNEL_COLORS[1] },
      { name: '≥1 Doc Uploaded', value: summary.any_doc, fill: FUNNEL_COLORS[2] },
      { name: 'Both Docs Uploaded', value: summary.both_uploaded, fill: FUNNEL_COLORS[3] },
      { name: 'Both Docs Verified', value: summary.both_approved, fill: FUNNEL_COLORS[4] },
    ],
    [summary],
  );

  return (
    <div className="w-full h-[300px] sm:h-[340px] lg:h-[360px]">
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
        <FunnelChart margin={{ top: 8, right: 12, bottom: 8, left: 12 }}>
          <RTooltip
            contentStyle={{ background: '#fff', border: '1px solid #E8E7EE', borderRadius: 6, fontSize: 12, padding: '6px 10px' }}
            labelStyle={{ color: '#363642', fontWeight: 600 }}
            formatter={(v) => [fmt(Number(v)), 'patients']}
          />
          <Funnel dataKey="value" data={stages} isAnimationActive>
            <LabelList position="right" fill="#363642" stroke="none" fontSize={11} fontWeight={600} formatter={(label: unknown) => String(label)} dataKey="name" />
            <LabelList position="inside" fill="#fff" stroke="none" fontSize={12} fontWeight={700} formatter={(val: unknown) => fmt(Number(val))} dataKey="value" />
          </Funnel>
        </FunnelChart>
      </ResponsiveContainer>
    </div>
  );
}

function OverallTable({ summary }: { summary: Summary }) {
  const rows = [
    { label: 'Signed Up', value: summary.signed_up },
    { label: 'App Login', value: summary.app_login },
    { label: '≥1 Doc Uploaded', value: summary.any_doc },
    { label: 'Both Docs Uploaded', value: summary.both_uploaded },
    { label: 'Both Docs Verified', value: summary.both_approved },
  ];
  const top = rows[0].value;

  return (
    <table className="w-full text-[12px]">
      <thead>
        <tr className="text-[10px] uppercase tracking-[0.1em] text-[var(--text-muted)] font-semibold border-b border-[var(--border-subtle)]">
          <th className="text-left py-2 font-semibold">Stage</th>
          <th className="text-right py-2 font-semibold">Count</th>
          <th className="text-right py-2 font-semibold">% Sign-ups</th>
          <th className="text-right py-2 font-semibold">% Prev</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => {
          const prev = i === 0 ? row.value : rows[i - 1].value;
          const stepPct = i === 0 ? '100.0%' : pct(row.value, prev) + '%';
          return (
            <tr key={row.label} className="border-b border-[var(--border-subtle)] last:border-0">
              <td className="py-2 text-[var(--text-primary)]">{row.label}</td>
              <td className="py-2 text-right font-semibold text-[var(--text-primary)] tabular-nums">{fmt(row.value)}</td>
              <td className="py-2 text-right text-[var(--text-secondary)] tabular-nums">{pct(row.value, top)}%</td>
              <td className="py-2 text-right text-[var(--text-secondary)] tabular-nums">{stepPct}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function MonthChart({ months }: { months: MonthRow[] }) {
  const chartData = months.map(m => ({
    month: `M${m.month}`,
    Uploaded: m.uploaded,
    Verified: m.verified,
  }));

  return (
    <div className="w-full h-[240px] sm:h-[280px]">
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
        <BarChart data={chartData} margin={{ top: 8, right: 12, bottom: 8, left: 0 }} barCategoryGap={20}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E8E7EE" vertical={false} />
          <XAxis dataKey="month" stroke="#A8A6B3" tick={{ fontSize: 11, fill: '#49495A' }} tickLine={false} axisLine={{ stroke: '#E8E7EE' }} />
          <YAxis stroke="#A8A6B3" tick={{ fontSize: 11, fill: '#49495A' }} tickLine={false} axisLine={false} allowDecimals={false} />
          <RTooltip contentStyle={{ background: '#fff', border: '1px solid #E8E7EE', borderRadius: 6, fontSize: 12, padding: '6px 10px' }} cursor={{ fill: '#F5F4F9', opacity: 0.5 }} />
          <Legend verticalAlign="top" align="right" iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingBottom: 8 }} />
          <Bar dataKey="Uploaded" fill={BAR_UPLOADED} radius={[3, 3, 0, 0]} />
          <Bar dataKey="Verified" fill={BAR_VERIFIED} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function MonthTable({ months }: { months: MonthRow[] }) {
  return (
    <table className="w-full text-[12px]">
      <thead>
        <tr className="text-[10px] uppercase tracking-[0.1em] text-[var(--text-muted)] font-semibold border-b border-[var(--border-subtle)]">
          <th className="text-left py-2 font-semibold">Stage</th>
          <th className="text-right py-2 font-semibold">Uploaded</th>
          <th className="text-right py-2 font-semibold">Verified</th>
          <th className="text-right py-2 font-semibold">Verify Rate</th>
        </tr>
      </thead>
      <tbody>
        {months.map(m => (
          <tr key={m.month} className="border-b border-[var(--border-subtle)] last:border-0">
            <td className="py-2 text-[var(--text-primary)]">Month {m.month}</td>
            <td className="py-2 text-right text-[var(--text-secondary)] tabular-nums">{fmt(m.uploaded)}</td>
            <td className="py-2 text-right font-semibold text-[var(--text-primary)] tabular-nums">{fmt(m.verified)}</td>
            <td className="py-2 text-right text-[var(--text-secondary)] tabular-nums">{m.uploaded ? pct(m.verified, m.uploaded) + '%' : '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function heatBg(p: number): string {
  if (p >= 15) return 'bg-[var(--color-brand-accent)]';
  if (p >= 10) return 'bg-[color-mix(in_srgb,var(--color-brand-accent)_60%,var(--bg-elevated))]';
  if (p >= 5) return 'bg-[color-mix(in_srgb,var(--color-brand-accent)_35%,var(--bg-elevated))]';
  if (p > 0) return 'bg-[color-mix(in_srgb,var(--color-brand-accent)_15%,var(--bg-elevated))]';
  return '';
}

function CohortTable({ cohorts }: { cohorts: Cohort[] }) {
  const ordered = [...cohorts].reverse();
  const totals = cohorts.reduce(
    (acc, c) => ({
      signups: acc.signups + c.signups,
      logged_in: acc.logged_in + c.logged_in,
      any_doc: acc.any_doc + c.any_doc,
      both_uploaded: acc.both_uploaded + c.both_uploaded,
      both_approved: acc.both_approved + c.both_approved,
    }),
    { signups: 0, logged_in: 0, any_doc: 0, both_uploaded: 0, both_approved: 0 },
  );

  return (
    <div className="overflow-x-auto -mx-1 sm:mx-0">
      <table className="w-full text-[12px] min-w-[640px]">
        <thead>
          <tr className="text-[10px] uppercase tracking-[0.1em] text-[var(--text-muted)] font-semibold border-b border-[var(--border-subtle)]">
            <th className="text-left py-2 font-semibold">Sign-up Month</th>
            <th className="text-right py-2 font-semibold">Sign-ups</th>
            <th className="text-right py-2 font-semibold">App Login</th>
            <th className="text-right py-2 font-semibold">≥1 Doc</th>
            <th className="text-right py-2 font-semibold">Both Uploaded</th>
            <th className="text-right py-2 font-semibold">Both Verified</th>
          </tr>
        </thead>
        <tbody>
          {ordered.map(c => {
            const cells = [
              { key: 'logged_in', val: c.logged_in },
              { key: 'any_doc', val: c.any_doc },
              { key: 'both_uploaded', val: c.both_uploaded },
              { key: 'both_approved', val: c.both_approved },
            ];
            return (
              <tr key={c.signup_month} className="border-b border-[var(--border-subtle)] last:border-0">
                <td className="py-2 text-[var(--text-primary)] font-medium">{c.signup_month}</td>
                <td className="py-2 text-right font-semibold text-[var(--text-primary)] tabular-nums">{fmt(c.signups)}</td>
                {cells.map(cell => {
                  const p = pct(cell.val, c.signups);
                  return (
                    <td key={cell.key} className={cn('py-2 text-right tabular-nums', heatBg(p))}>
                      <div className="text-[var(--text-primary)]">{fmt(cell.val)}</div>
                      <div className="text-[10px] text-[var(--text-muted)]">{p}%</div>
                    </td>
                  );
                })}
              </tr>
            );
          })}
          <tr className="bg-[var(--bg-secondary)] font-semibold">
            <td className="py-2 text-[var(--text-primary)]">Total</td>
            <td className="py-2 text-right text-[var(--text-primary)] tabular-nums">{fmt(totals.signups)}</td>
            <td className="py-2 text-right text-[var(--text-primary)] tabular-nums">{fmt(totals.logged_in)}</td>
            <td className="py-2 text-right text-[var(--text-primary)] tabular-nums">{fmt(totals.any_doc)}</td>
            <td className="py-2 text-right text-[var(--text-primary)] tabular-nums">{fmt(totals.both_uploaded)}</td>
            <td className="py-2 text-right text-[var(--text-primary)] tabular-nums">{fmt(totals.both_approved)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function SourceBreakdown({ sources, summary }: { sources: SourceRow[]; summary: Summary }) {
  const sourceMeta: Record<string, { icon: LucideIcon; label: string }> = {
    bot: { icon: Bot, label: 'WhatsApp Bot' },
    web: { icon: Globe, label: 'Web Form' },
    app: { icon: Activity, label: 'App' },
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {sources.map(s => {
        const meta = sourceMeta[s.source] ?? { icon: Activity, label: s.source };
        const verifiedRate = pct(s.both_approved, s.sign_ups);
        const docRate = pct(s.any_doc, s.sign_ups);
        return (
          <Card hoverable={false} className="!p-4" key={s.source}>
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.12em] text-[var(--text-muted)] font-semibold">
              <meta.icon className="h-3 w-3" />
              {meta.label}
              <Badge variant="neutral" size="sm" className="ml-auto">{pct(s.sign_ups, summary.signed_up)}% of sign-ups</Badge>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <div className="text-[22px] font-semibold tracking-tight text-[var(--text-primary)] tabular-nums">{fmt(s.sign_ups)}</div>
              <div className="text-[11px] text-[var(--text-secondary)]">sign-ups</div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
              <div>
                <div className="text-[var(--text-muted)] uppercase tracking-wider text-[9.5px]">Uploaded ≥1</div>
                <div className="font-semibold text-[var(--text-primary)] tabular-nums">{fmt(s.any_doc)} <span className="text-[var(--text-secondary)] font-normal">({docRate}%)</span></div>
              </div>
              <div>
                <div className="text-[var(--text-muted)] uppercase tracking-wider text-[9.5px]">Both Uploaded</div>
                <div className="font-semibold text-[var(--text-primary)] tabular-nums">{fmt(s.both_uploaded)}</div>
              </div>
              <div>
                <div className="text-[var(--text-muted)] uppercase tracking-wider text-[9.5px]">Verified</div>
                <div className="font-semibold text-[var(--color-success-dark)] tabular-nums">{fmt(s.both_approved)} <span className="text-[var(--text-secondary)] font-normal">({verifiedRate}%)</span></div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

export default function RegistrationFunnel() {
  const { summary, month_funnel, cohorts, by_source, notes } = data;
  const taggedEligible = notes.coach_eligible_tag_total;
  const trulyVerified = notes.coach_eligible_with_both_approved;

  const bot = by_source.find(s => s.source === 'bot');
  const web = by_source.find(s => s.source === 'web');
  const botRate = bot ? pct(bot.both_approved, bot.sign_ups) : 0;
  const webRate = web ? pct(web.both_approved, web.sign_ups) : 0;
  const sourceMultiplier = botRate ? (webRate / botRate).toFixed(1) : '0.0';

  const appLoginPct = pct(summary.app_login, summary.signed_up);
  const anyDocPct = pct(summary.any_doc, summary.signed_up);
  const verifiedPct = pct(summary.both_approved, summary.signed_up);
  const stuckShareOfBothUp = pct(summary.pending_verification, summary.both_uploaded);

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
      <header className="mb-6 sm:mb-7">
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-[var(--text-brand)] font-semibold">
          <Activity className="h-3 w-3" />
          Liver Forever · Registration Funnel
        </div>
        <h1 className="text-[20px] sm:text-[24px] lg:text-[26px] font-semibold text-[var(--text-primary)] mt-1.5 tracking-tight leading-tight">
          From Sign-up to Verified Eligibility
        </h1>
        <p className="text-[12.5px] sm:text-[13px] text-[var(--text-secondary)] mt-1.5 max-w-[760px] leading-relaxed">
          The Liver Forever PSP unlocks coaching, refills, and program benefits only after a patient's prescription <em>and</em> purchase invoice
          for the month are both verified. This page tracks that conversion, end to end.
        </p>
      </header>

      {/* AI-style narrative hero */}
      <div className="relative rounded-[10px] overflow-hidden mb-8 sm:mb-9 p-[1px] bg-[linear-gradient(135deg,var(--color-brand-primary)_0%,var(--color-accent-indigo)_40%,var(--color-accent-cyan)_100%)]">
        <div className="relative rounded-[9px] bg-[var(--bg-elevated)] p-4 sm:p-6">
          <div className="absolute inset-0 rounded-[9px] bg-[linear-gradient(135deg,rgba(112,48,160,0.06)_0%,rgba(99,102,241,0.04)_40%,rgba(6,182,212,0.06)_100%)] pointer-events-none" />
          <div className="relative">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] font-semibold bg-[linear-gradient(90deg,var(--color-brand-primary),var(--color-accent-indigo),var(--color-accent-cyan))] bg-clip-text text-transparent mb-3">
              <Sparkles className="h-3 w-3 text-[var(--color-brand-primary)]" />
              The Story So Far
            </div>
            <div className="text-[12.5px] sm:text-[13.5px] text-[var(--text-primary)] leading-[1.7] space-y-3">
              <p>
                Of <strong>{fmt(summary.signed_up)}</strong> patients who signed up for the program,
                only <strong className="text-[var(--color-success-dark)]">{fmt(summary.both_approved)}</strong> ({verifiedPct}%) have cleared the verification gate that actually unlocks coaching and refills.
                The funnel narrows hard at two places: <strong>{100 - appLoginPct}%</strong> of sign-ups never log into the app, and of those who do,
                only <strong>{fmt(summary.any_doc)}</strong> ({anyDocPct}% of all sign-ups) ever upload a single document.
              </p>
              <p className="text-[var(--text-secondary)]">
                The verification backlog is the next blocker. <strong className="text-[var(--text-primary)]">{fmt(summary.pending_verification)}</strong> patients
                ({stuckShareOfBothUp}% of those who uploaded both docs) are sitting fully submitted but with neither document approved yet —
                <strong className="text-[var(--text-primary)]"> {fmt(summary.docs_under_review_total)} documents</strong> total are in "Under Review" status across the program.
                Notably, zero patients sit in a half-approved state: verification is all-or-nothing per patient, so clearing the queue should produce a step-change, not a trickle.
              </p>
              {bot && web && (
                <p className="text-[var(--text-secondary)]">
                  Source matters. Patients who came in through the <strong className="text-[var(--text-primary)]">web form ({fmt(web.sign_ups)} sign-ups)</strong> convert
                  to verified eligibility at <strong className="text-[var(--text-primary)]">{webRate}%</strong>, while the
                  {' '}<strong className="text-[var(--text-primary)]">WhatsApp bot ({fmt(bot.sign_ups)} sign-ups, {pct(bot.sign_ups, summary.signed_up)}% of total)</strong>
                  {' '}converts at <strong className="text-[var(--text-primary)]">{botRate}%</strong> — roughly {sourceMultiplier}× lower.
                  The bot is the volume firehose; the web form is where intent is highest.
                </p>
              )}
              <p className="text-[var(--text-secondary)]">
                Once patients clear Month 1, almost no one progresses. Of <strong>{fmt(taggedEligible)}</strong> patients in the program-stage cohort,
                only <strong>{fmt(trulyVerified)}</strong> have Month-1 docs fully verified, and exactly <strong>one</strong> patient has uploaded a second-month doc set.
                The program isn't generating a verified Month 2 cohort yet — repeat compliance is effectively untested.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* KPI strip */}
      <section className="mb-8">
        <SectionTitle icon={Activity} eyebrow="At a Glance" title="Headline funnel numbers" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <Kpi icon={Users} label="Signed Up" value={fmt(summary.signed_up)} sub="All registrations to date" />
          <Kpi icon={LogIn} label="App Login (≥1)" value={fmt(summary.app_login)} sub={`${appLoginPct}% of sign-ups`} />
          <Kpi icon={FileUp} label="Uploaded ≥1 Doc" value={fmt(summary.any_doc)} sub={`${anyDocPct}% of sign-ups`} />
          <Kpi icon={FilePlus2} label="Both Docs Uploaded" value={fmt(summary.both_uploaded)} sub={`${pct(summary.both_uploaded, summary.signed_up)}% of sign-ups`} />
          <Kpi icon={CheckCircle2} label="Both Docs Verified" value={fmt(summary.both_approved)} sub={`${verifiedPct}% of sign-ups`} accent="text-[var(--color-success-dark)]" />
        </div>
      </section>

      {/* Funnel A — Overall */}
      <section className="mb-8">
        <SectionTitle
          icon={Database}
          eyebrow="Funnel A"
          title="Overall Patient Journey — Sign-up to Verification"
          lede="Where do patients drop off between landing on the program and reaching the gate that unlocks coaching?"
        />
        <Card hoverable={false} className="!p-4">
          <div className="flex flex-col lg:flex-row gap-5 items-stretch">
            <div className="lg:basis-3/5 lg:flex-1 min-w-0">
              <OverallFunnelChart summary={summary} />
            </div>
            <div className="lg:basis-2/5 lg:flex-1 min-w-0">
              <OverallTable summary={summary} />
            </div>
          </div>
        </Card>
        <div className="mt-3">
          <HowToRead>
            <strong className="text-[var(--text-primary)]">% Sign-ups</strong> = patients reaching this stage / total sign-ups.
            <strong className="text-[var(--text-primary)]"> % Prev</strong> = step-to-step conversion. The two biggest leaks are sign-up → app login
            ({100 - appLoginPct}% never log in) and app login → first doc upload.
          </HowToRead>
        </div>
      </section>

      {/* Funnel B — Program stages */}
      <section className="mb-8">
        <SectionTitle
          icon={ListChecks}
          eyebrow="Funnel B"
          title="Program Stage Progression (Month 1 → Month 6)"
          lede="Each program month requires a fresh prescription + purchase invoice. Uploaded = at least one of each submitted; Verified = both approved."
        />
        <Card hoverable={false} className="!p-4">
          <div className="flex flex-col lg:flex-row gap-5 items-stretch">
            <div className="lg:basis-3/5 lg:flex-1 min-w-0">
              <MonthChart months={month_funnel} />
            </div>
            <div className="lg:basis-2/5 lg:flex-1 min-w-0">
              <MonthTable months={month_funnel} />
            </div>
          </div>
        </Card>
        <div className="mt-3 rounded-[6px] border border-[var(--color-warning-light)] bg-[var(--color-warning-light)]/40 px-3 py-2 flex items-start gap-2">
          <AlertTriangle className="h-3.5 w-3.5 text-[var(--color-warning-dark)] mt-0.5 shrink-0" />
          <div className="text-[11.5px] text-[var(--text-primary)] leading-snug">
            <strong>Stage-tag vs. verification mismatch.</strong> The program tags <strong>{taggedEligible}</strong> patients as
            <Badge variant="primary" size="sm" className="mx-1">All Coaches Eligible</Badge>
            but only <strong>{trulyVerified}</strong> have both Month-1 docs verified per the same source.
            That's <strong>{taggedEligible - trulyVerified}</strong> patients tagged eligible while their docs sit unverified — reconcile the operational definition before reporting eligibility externally.
          </div>
        </div>
      </section>

      {/* Source breakdown */}
      <section className="mb-8">
        <SectionTitle
          icon={Bot}
          eyebrow="Acquisition Channel"
          title="Bot vs Web — conversion is not equal"
          lede="The WhatsApp bot drives most volume but converts at a lower rate. Web sign-ups are smaller in count but reach verification more reliably."
        />
        <SourceBreakdown sources={by_source} summary={summary} />
      </section>

      {/* Cohort movement */}
      <section className="mb-10">
        <SectionTitle
          icon={Clock}
          eyebrow="Cohort Movement"
          title="How each sign-up month has flowed through"
          lede="Heatmap on cohort conversion. Older cohorts have had more time for verification — newer cohorts will look thinner on the right-hand columns until the backlog clears."
        />
        <Card hoverable={false} className="!p-4">
          <CohortTable cohorts={cohorts} />
        </Card>
      </section>

      <footer className="text-[11px] text-[var(--text-muted)] mt-12">
        Source: <code className="font-mono">{data.source_file}</code> · Generated{' '}
        <span className="font-mono">{data.generated_at}</span> · Regenerate with{' '}
        <code className="font-mono">python3 scripts/build_registration_funnel.py</code>.
      </footer>
    </div>
  );
}
