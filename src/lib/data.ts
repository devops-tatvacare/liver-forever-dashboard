import raw from '@/data/scans.json';
import doctors from '@/data/doctors.json';

export type Scan = {
  pm: string;
  name: string;
  doctor_id: string;
  machine_id: string;
  date: string;
  cap: number;
  lsm: number;
};

type DoctorRecord = { name: string; clinic: string; city: string; state: string; mr: string; hq: string };
const DOCTORS = doctors as Record<string, DoctorRecord>;

export function doctorInfo(id: string): DoctorRecord | null {
  if (!id) return null;
  return DOCTORS[id] ?? null;
}

export function doctorDisplay(id: string): string {
  if (!id) return '—';
  const d = DOCTORS[id];
  if (d && d.name) return `Dr. ${d.name} · ${id}`;
  return id;
}

export function doctorShort(id: string): string {
  if (!id) return '—';
  const d = DOCTORS[id];
  if (d && d.name) return `Dr. ${d.name}`;
  return `#${id}`;
}

export type Trend = 'Improved' | 'Worsened' | 'Unchanged';
export type OverallTrend = 'Both Improved' | 'Both Worsened' | 'No Worsening' | 'No Improvement' | 'Mixed';

export type Patient = {
  pm: string;
  name: string;
  doctor_id: string;
  machine_id: string;
  scans: Scan[];
  numScans: number;
  firstDate: string;
  latestDate: string;
  daysBetween: number;
  firstCap: number;
  latestCap: number;
  capDelta: number;
  capTrend: Trend;
  firstLsm: number;
  latestLsm: number;
  lsmDelta: number;
  lsmTrend: Trend;
  overall: OverallTrend;
};

const trend = (first: number, latest: number): Trend =>
  latest < first ? 'Improved' : latest > first ? 'Worsened' : 'Unchanged';

const overallOf = (capT: Trend, lsmT: Trend): OverallTrend => {
  if (capT === 'Improved' && lsmT === 'Improved') return 'Both Improved';
  if (capT === 'Worsened' && lsmT === 'Worsened') return 'Both Worsened';
  if (capT !== 'Worsened' && lsmT !== 'Worsened') return 'No Worsening';
  if (capT !== 'Improved' && lsmT !== 'Improved') return 'No Improvement';
  return 'Mixed';
};

const daysBetween = (a: string, b: string): number => {
  const MS = 1000 * 60 * 60 * 24;
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / MS);
};

export function buildPatients(): Patient[] {
  const scans = raw as Scan[];
  const byPm = new Map<string, Scan[]>();
  for (const s of scans) {
    const arr = byPm.get(s.pm) ?? [];
    arr.push(s);
    byPm.set(s.pm, arr);
  }

  const out: Patient[] = [];
  for (const [pm, list] of byPm) {
    list.sort((a, b) => a.date.localeCompare(b.date));
    const first = list[0];
    const latest = list[list.length - 1];
    const capDelta = +(latest.cap - first.cap).toFixed(1);
    const lsmDelta = +(latest.lsm - first.lsm).toFixed(2);
    const capTrend = trend(first.cap, latest.cap);
    const lsmTrend = trend(first.lsm, latest.lsm);
    out.push({
      pm,
      name: latest.name || first.name || '—',
      doctor_id: latest.doctor_id,
      machine_id: latest.machine_id,
      scans: list,
      numScans: list.length,
      firstDate: first.date,
      latestDate: latest.date,
      daysBetween: daysBetween(first.date, latest.date),
      firstCap: first.cap,
      latestCap: latest.cap,
      capDelta,
      capTrend,
      firstLsm: first.lsm,
      latestLsm: latest.lsm,
      lsmDelta,
      lsmTrend,
      overall: overallOf(capTrend, lsmTrend),
    });
  }
  return out;
}

export type Aggregates = {
  totalPatients: number;
  totalScans: number;
  avgScansPerPatient: number;
  medianDaysBetween: number;
  bothImproved: number;
  bothWorsened: number;
  noWorsening: number;
  noImprovement: number;
  mixed: number;
  improvedPct: number;
  worsenedPct: number;
  avgCapDelta: number;
  avgLsmDelta: number;
  capImprovedPct: number;
  lsmImprovedPct: number;
};

export function computeAggregates(patients: Patient[]): Aggregates {
  const n = patients.length;
  const totalScans = patients.reduce((s, p) => s + p.numScans, 0);
  const sortedDays = [...patients].map(p => p.daysBetween).sort((a, b) => a - b);
  const medianDaysBetween = n ? sortedDays[Math.floor(n / 2)] : 0;

  const counts = {
    'Both Improved': 0,
    'Both Worsened': 0,
    'No Worsening': 0,
    'No Improvement': 0,
    'Mixed': 0,
  } as Record<OverallTrend, number>;
  let capDeltaSum = 0;
  let lsmDeltaSum = 0;
  let capImproved = 0;
  let lsmImproved = 0;
  for (const p of patients) {
    counts[p.overall]++;
    capDeltaSum += p.capDelta;
    lsmDeltaSum += p.lsmDelta;
    if (p.capTrend === 'Improved') capImproved++;
    if (p.lsmTrend === 'Improved') lsmImproved++;
  }
  const improved = counts['Both Improved'] + counts['No Worsening'];
  const worsened = counts['Both Worsened'] + counts['No Improvement'];
  return {
    totalPatients: n,
    totalScans,
    avgScansPerPatient: n ? +(totalScans / n).toFixed(1) : 0,
    medianDaysBetween,
    bothImproved: counts['Both Improved'],
    bothWorsened: counts['Both Worsened'],
    noWorsening: counts['No Worsening'],
    noImprovement: counts['No Improvement'],
    mixed: counts['Mixed'],
    improvedPct: n ? +((improved / n) * 100).toFixed(1) : 0,
    worsenedPct: n ? +((worsened / n) * 100).toFixed(1) : 0,
    avgCapDelta: n ? +(capDeltaSum / n).toFixed(1) : 0,
    avgLsmDelta: n ? +(lsmDeltaSum / n).toFixed(2) : 0,
    capImprovedPct: n ? +((capImproved / n) * 100).toFixed(1) : 0,
    lsmImprovedPct: n ? +((lsmImproved / n) * 100).toFixed(1) : 0,
  };
}

export const overallVariant = (t: OverallTrend): 'success' | 'error' | 'warning' | 'neutral' => {
  if (t === 'Both Improved' || t === 'No Worsening') return 'success';
  if (t === 'Both Worsened' || t === 'No Improvement') return 'error';
  if (t === 'Mixed') return 'warning';
  return 'neutral';
};
