# Liver Forever — Patient Trajectory Dashboard

A static analytics dashboard for the **Liver Forever** programme (TatvaCare × Zydus Healthcare). Every Fibroscan report uploaded through the WhatsApp bot is OCR'd into two numbers — **CAP** (steatosis, dB/m) and **LSM** (liver stiffness, kPa). This dashboard tracks how those numbers evolve for patients who return for a second scan, and surfaces improvers, decliners and the overall cohort trajectory.

> **Live:** https://devops-tatvacare.github.io/liver-forever-dashboard/

![status](https://img.shields.io/badge/status-prototype-blueviolet) ![stack](https://img.shields.io/badge/vite-%20+%20react%20+%20tailwind_v4-informational) ![data](https://img.shields.io/badge/PII-masked-success)

---

## What you can do here

1. **At a glance** — funnel from every Fibroscan upload → parseable readings → trackable (≥2 scans) cohort, plus cohort-level KPIs.
2. **Outcome mix** — a donut chart bucketing every trackable patient into one of five trajectories (Full Improvement → Full Decline).
3. **Before vs After** — a scatter of ΔCAP × ΔLSM for every patient; the four quadrants tell you whether fat and stiffness moved together.
4. **Top movers** — the biggest improvers and decliners on a combined CAP + weighted-LSM delta.
5. **Patient roster** — searchable, filterable, paginated list of every trackable patient; click a row to drill into that patient's scan-by-scan timeline with doctor + machine attribution.

## Privacy & data handling

- **Patient names and mobile numbers are never committed.** Before data is shipped with the build, `scripts/mask-pii.py` replaces every real mobile and name with a deterministic salted-SHA256 pseudonym (same original mobile → same pseudonym across scans, so trajectories stay intact, but no real identity is reversible).
- **Doctor directory** (`src/data/doctors.json`) uses public practice attributes — doctor name, clinic, city, state — mapped from the Zydus-provided master Excel. No patient data is joined into this file.
- **Raw exports never enter git.** `.gitignore` blocks any `*.raw.json` accidentally placed in `src/data/`.

## Tech stack

| Layer    | Choice                                                 | Why |
| ---      | ---                                                    | --- |
| Build    | Vite 8                                                 | Fast dev, zero-config static build for GH Pages |
| UI       | React 19 + TypeScript                                  | Standard |
| Styling  | Tailwind v4 + design tokens from `ai-evals-platform`   | Consistent with other TatvaCare internal tools |
| Charts   | `recharts`                                             | Pie, Scatter, Line — covers every view here |
| Icons    | `lucide-react`                                         | Consistent stroke weight across the UI |
| Data     | Static JSON bundled at build time                      | No backend, pure client-side analytics |

## Local development

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # type-check + static bundle → dist/
npm run preview      # serve dist locally
```

## Regenerating data

Three small, one-shot steps — read-only throughout.

### 1. Export Fibroscan scans from MySQL

Run the read-only query in `scripts/export-scans.sql` against the MySQL replica and pipe through `jq` to produce an array:

```bash
MYSQL_PWD='<password>' mysql -h <host> -u <ro-user> -D mytatva \
  --batch --skip-column-names --raw \
  < scripts/export-scans.sql \
  | jq -s '.' > src/data/scans.json
```

The query excludes known test numbers, filters to `is_complete = 1`, parses CAP/LSM out of the `fibroscan_analysis` JSON column, and keeps only patients with ≥2 valid readings.

### 2. Mask PII

```bash
python3 scripts/mask-pii.py
```

This rewrites `src/data/scans.json` in-place, replacing every patient name and mobile with a deterministic pseudonym. **Always run this before committing.**

### 3. Refresh doctor directory (only when the master Excel changes)

```bash
python3 scripts/build-doctors.py \
  "/path/to/Liver Forever - FibroScan Uploads Data <latest>.xlsx" \
  src/data/doctors.json
```

## Deployment

A GitHub Action (`.github/workflows/deploy.yml`) runs on every push to `main`:

1. `npm ci` — install exact dependencies
2. `npm run build` with `BASE_PATH=/liver-forever-dashboard/` so asset URLs resolve under the Pages subpath
3. Upload `dist/` as the Pages artifact
4. Deploy

First-time setup: **Settings → Pages → Source = GitHub Actions**. After that, every push to `main` redeploys automatically.

## Project layout

```
liver-forever-dashboard/
├── src/
│   ├── App.tsx              # AggregateView + PatientView
│   ├── components/ui/       # Card, Badge (copied from ai-evals-platform)
│   ├── lib/data.ts          # scan → patient aggregation + doctor lookup
│   ├── data/
│   │   ├── scans.json       # masked per-scan rows (PII-safe)
│   │   ├── doctors.json     # doctor ID → name/clinic/city/state
│   │   └── funnel.json      # total/valid/cohort counts
│   ├── utils/cn.ts          # tailwind-merge helper
│   ├── globals.css          # design tokens (copied from ai-evals-platform)
│   └── main.tsx
├── scripts/
│   ├── mask-pii.py          # deterministic name + mobile pseudonymiser
│   ├── export-scans.sql     # MySQL → scan rows (read-only)
│   └── build-doctors.py     # Excel → doctor lookup JSON
├── .github/workflows/deploy.yml
└── vite.config.ts
```

## License

Internal TatvaCare project. Data belongs to TatvaCare / Zydus Healthcare; masked sample data in this repo is shared for demo purposes only.
