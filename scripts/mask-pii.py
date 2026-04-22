#!/usr/bin/env python3
"""
Replace every real patient name & mobile in src/data/scans.json with a
deterministic pseudonym derived from the mobile. Same original mobile →
same pseudonym across scans, so trajectories stay intact.
"""
import hashlib, json, pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC  = ROOT / "src" / "data" / "scans.json"

SALT = "liver-forever-dashboard-v1"

def pseudo(mobile: str) -> str:
    h = hashlib.sha256((SALT + str(mobile)).encode()).hexdigest()[:6].upper()
    return f"P-{h}"

def main():
    scans = json.loads(SRC.read_text())
    for s in scans:
        p = pseudo(s["pm"])
        s["pm"]   = p
        s["name"] = f"Patient {p}"
    SRC.write_text(json.dumps(scans, ensure_ascii=False))
    print(f"Masked {len(scans)} scan rows → {SRC}")

if __name__ == "__main__":
    sys.exit(main())
