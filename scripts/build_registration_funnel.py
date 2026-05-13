"""Build src/data/registration-funnel.json from the Zydus Liver Forever registration workbook.

Run from the dashboard root:
    python3 scripts/build_registration_funnel.py
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

SRC = Path(
    "/Users/dhspl/Library/CloudStorage/OneDrive-DHSPL/My Work/Products/"
    "Goodflip Care - PSPs/Zydus Health - Liver Forever/Liver Forever - Data/"
    "Liver Forever - User Registration Data.xlsx"
)
OUT = Path(__file__).resolve().parent.parent / "src" / "data" / "registration-funnel.json"

MAX_MONTH = 6


def _i(value: object) -> int:
    return int(value)  # type: ignore[arg-type]


def main() -> None:
    patients = pd.read_excel(SRC, sheet_name="Liver Forever - Patients Info")
    docs = pd.read_excel(SRC, sheet_name="Patient Docs Info")
    stages = pd.read_excel(SRC, sheet_name="Patient Program Stage Details")

    rx_up = set(docs.loc[docs["Document Type"] == "Prescription", "Patient ID"])
    inv_up = set(docs.loc[docs["Document Type"] == "Purchase Invoice", "Patient ID"])
    rx_ok = set(docs.loc[(docs["Document Type"] == "Prescription") & (docs["Report Status"] == "Approved"), "Patient ID"])
    inv_ok = set(docs.loc[(docs["Document Type"] == "Purchase Invoice") & (docs["Report Status"] == "Approved"), "Patient ID"])

    patients["logged_in_app"] = patients["Last App Login"].notna()
    patients["has_any_doc"] = patients["Patient ID"].isin(list(set(docs["Patient ID"])))
    patients["both_uploaded"] = patients["Patient ID"].isin(list(rx_up & inv_up))
    patients["both_approved"] = patients["Patient ID"].isin(list(rx_ok & inv_ok))
    patients["in_stages"] = patients["Patient ID"].isin(list(set(stages["Patient ID"])))

    pending_verification = (rx_up & inv_up) - (rx_ok | inv_ok)

    summary = {
        "signed_up": _i(patients["Patient ID"].nunique()),
        "app_login": _i(patients["logged_in_app"].sum()),
        "any_doc": _i(patients["has_any_doc"].sum()),
        "both_uploaded": _i(patients["both_uploaded"].sum()),
        "both_approved": _i(patients["both_approved"].sum()),
        "in_stages": _i(patients["in_stages"].sum()),
        "pending_verification": len(pending_verification),
        "docs_under_review_total": _i((docs["Report Status"] == "Under Review").sum()),
    }

    by_source = (
        patients.groupby("PSP Source", dropna=False)
        .agg(
            sign_ups=("Patient ID", "count"),
            app_login=("logged_in_app", "sum"),
            any_doc=("has_any_doc", "sum"),
            both_uploaded=("both_uploaded", "sum"),
            both_approved=("both_approved", "sum"),
        )
        .reset_index()
    )
    by_source["PSP Source"] = by_source["PSP Source"].fillna("unknown")
    by_source_records: list[dict[str, object]] = []
    for _, row in by_source.iterrows():
        n = _i(row["sign_ups"])
        if n < 5:
            continue
        by_source_records.append({
            "source": str(row["PSP Source"]),
            "sign_ups": n,
            "app_login": _i(row["app_login"]),
            "any_doc": _i(row["any_doc"]),
            "both_uploaded": _i(row["both_uploaded"]),
            "both_approved": _i(row["both_approved"]),
        })
    by_source_records.sort(key=lambda r: -int(r["sign_ups"]))  # type: ignore[arg-type]

    month_funnel = []
    for m in range(1, MAX_MONTH + 1):
        uploaded = _i(((stages["uploaded_rx_count"] >= m) & (stages["uploaded_invoice_count"] >= m)).sum())
        verified = _i(((stages["approved_prescription_count"] >= m) & (stages["approved_invoice_count"] >= m)).sum())
        month_funnel.append({"month": m, "uploaded": uploaded, "verified": verified})

    patients["signup_month"] = pd.to_datetime(patients["Create Time"]).dt.to_period("M").astype(str)
    cohort_df = (
        patients.groupby("signup_month")
        .agg(
            signups=("Patient ID", "nunique"),
            logged_in=("logged_in_app", "sum"),
            any_doc=("has_any_doc", "sum"),
            both_uploaded=("both_uploaded", "sum"),
            both_approved=("both_approved", "sum"),
            in_stages=("in_stages", "sum"),
        )
        .reset_index()
        .sort_values("signup_month")
    )
    cohort_df = cohort_df[cohort_df["signups"] >= 5].reset_index(drop=True)
    cohort_df = cohort_df.astype({c: int for c in cohort_df.columns if c != "signup_month"})
    cohorts = [
        {col: (row[col] if col == "signup_month" else _i(row[col])) for col in cohort_df.columns}
        for _, row in cohort_df.iterrows()
    ]

    coach_eligible_total = _i((stages["eligibility_stage"].str.contains("Eligible", na=False)).sum())
    coach_eligible_both_approved = _i(
        ((stages["approved_prescription_count"] >= 1) & (stages["approved_invoice_count"] >= 1)).sum()
    )

    data = {
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "source_file": SRC.name,
        "summary": summary,
        "month_funnel": month_funnel,
        "cohorts": cohorts,
        "by_source": by_source_records,
        "notes": {
            "coach_eligible_tag_total": coach_eligible_total,
            "coach_eligible_with_both_approved": coach_eligible_both_approved,
        },
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, indent=2))
    print(f"Wrote {OUT}")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
