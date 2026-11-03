"""Versioned metadata corrections of the public data. Standard library only.

data/metadata_corrections_v1.json lists every corrected descriptive field of existing records: the original and
corrected value, the reason and the record that establishes it. Its ledger holds the SHA-256 of every point, panel
and candidate, and of the alias and size-note files, as they were before the correction. A correction never
changes an id, a measured value, a size, a source hash or a verdict, and never removes a record.

    python3 scripts/corrections.py apply data/metadata_corrections_v1.json [--data data]
    python3 scripts/corrections.py check data/metadata_corrections_v1.json [--data data]

`apply` migrates a data directory built from the original registries (the publishing pipeline rebuilds the
aggregate files without the corrections); it is idempotent and fails on a field at neither value. `check` is what
scripts/validate.py runs: every listed field holds its corrected value, reverting the listed edits reproduces every
ledger hash exactly, and the CSV downloads agree with the snapshot.
"""

from __future__ import annotations

import argparse
import copy
import csv
import hashlib
import io
import json
import sys
from pathlib import Path

POINT_FIELDS = {"label", "cohort", "xlabel"}
PANEL_FIELDS = {"label", "cohort", "xlabel"}
CANDIDATE_FIELDS = {"label", "cohort"}


def digest(record) -> str:
    text = json.dumps(record, sort_keys=True, ensure_ascii=False, separators=(",", ":"))
    return hashlib.sha256(text.encode()).hexdigest()


def panel_record(panel: dict) -> dict:
    record = {k: v for k, v in panel.items() if k != "points"}
    record["point_ids"] = [p["id"] for p in panel["points"]]
    return record


def json_text(doc) -> str:
    return json.dumps(doc, indent=2, ensure_ascii=False) + "\n"


def edits(snapshot: dict, corr: dict) -> list:
    """(kind, id, field, from, to) for every record a listed correction touches, propagated as recorded:
    a point's label also labels its candidates; a panel's cohort is its points' and candidates' cohort; a panel's
    size-axis title is its points' xlabel."""
    by_point, by_panel = {}, {}
    for c in snapshot["candidates"]:
        by_point.setdefault(c["point_id"], []).append(c["id"])
        by_panel.setdefault(c["panel_id"], []).append(c["id"])
    panels = {p["id"]: p for p in snapshot["panels"]}
    out = []
    for e in corr["labels"]:
        for pid in e["points"]:
            out.append(("point", pid, "label", e["from"], e["to"]))
            out += [("candidate", cid, "label", e["from"], e["to"]) for cid in by_point.get(pid, [])]
    for e in corr["cohorts"]:
        for panel_id in e["panels"]:
            out.append(("panel", panel_id, "cohort", e["from"], e["to"]))
            out += [("point", p["id"], "cohort", e["from"], e["to"]) for p in panels[panel_id]["points"]]
            out += [("candidate", cid, "cohort", e["from"], e["to"]) for cid in by_panel.get(panel_id, [])]
    for e in corr["xlabels"]:
        for panel_id in e["panels"]:
            out.append(("panel", panel_id, "xlabel", e["from"], e["to"]))
            out += [("point", p["id"], "xlabel", e["from"], e["to"]) for p in panels[panel_id]["points"]]
    for e in corr["panel_labels"]:
        out.append(("panel", e["panel"], "label", e["from"], e["to"]))
    return out


def records(snapshot: dict) -> dict:
    return {
        "point": {p["id"]: p for panel in snapshot["panels"] for p in panel["points"]},
        "panel": {p["id"]: p for p in snapshot["panels"]},
        "candidate": {c["id"]: c for c in snapshot["candidates"]},
    }


def apply_snapshot(snapshot: dict, corr: dict) -> list:
    """Correct `snapshot` in place; return problems (a field at neither value, an unknown id)."""
    problems, index = [], records(snapshot)
    allowed = {"point": POINT_FIELDS, "panel": PANEL_FIELDS, "candidate": CANDIDATE_FIELDS}
    for kind, rid, field, old, new in edits(snapshot, corr):
        record = index[kind].get(rid)
        if record is None or field not in allowed[kind]:
            problems.append(f"{kind} {rid}: not a correctable {field}")
        elif record.get(field) not in (old, new):
            problems.append(f"{kind} {rid}: {field} is neither the original nor the corrected value")
        else:
            record[field] = new
    for e in corr["added"]:
        for pid in e["points"]:
            point = index["point"].get(pid)
            if point is None:
                problems.append(f"point {pid}: missing for added field {e['field']}")
            elif e["field"] in point and point[e["field"]] != e["value"]:
                problems.append(f"point {pid}: {e['field']} already holds another value")
            else:
                point[e["field"]] = e["value"]
    return problems


def revert_snapshot(snapshot: dict, corr: dict) -> tuple[dict, list]:
    """The snapshot before the correction, and problems where a listed field is not at its corrected value."""
    original, problems = copy.deepcopy(snapshot), []
    index = records(original)
    for kind, rid, field, old, new in edits(original, corr):
        record = index[kind].get(rid)
        if record is None:
            problems.append(f"{kind} {rid}: removed")
        elif record.get(field) != new:
            problems.append(f"{kind} {rid}: {field} is not the corrected value")
        else:
            record[field] = old
    for e in corr["added"]:
        for pid in e["points"]:
            point = index["point"].get(pid)
            if point is None:
                problems.append(f"point {pid}: removed")
            elif point.get(e["field"]) != e["value"]:
                problems.append(f"point {pid}: {e['field']} is not the recorded value")
            else:
                del point[e["field"]]
    return original, problems


def check_snapshot(snapshot: dict, corr: dict) -> list:
    """Problems unless the snapshot is the ledgered one plus exactly the listed metadata edits."""
    original, problems = revert_snapshot(snapshot, corr)
    index = records(original)
    ledger = corr["ledger"]
    for kind, key in (("point", "points"), ("panel", "panels"), ("candidate", "candidates")):
        for rid, sha in ledger[key].items():
            record = index[kind].get(rid)
            if record is None:
                problems.append(f"{kind} {rid}: removed")
                continue
            value = panel_record(record) if kind == "panel" else record
            if digest(value) != sha:
                problems.append(f"{kind} {rid}: changed beyond the listed metadata corrections")
    return problems


def corrected_aliases(aliases: dict, corr: dict) -> dict:
    out = copy.deepcopy(aliases)
    by_checkpoint = {e["checkpoint"]: e for e in corr["aliases"]}
    for group in out["groups"]:
        e = by_checkpoint.get(group["checkpoint"])
        if e and group["labels"] == e["labels_from"]:
            group.update(variant=e["variant_to"], labels=e["labels_to"], id_prefixes=e["prefixes_to"],
                         original_variant=e["variant_from"], original_labels=e["labels_from"])
            if e["prefixes_to"] != e["prefixes_from"]:
                group["original_id_prefixes"] = e["prefixes_from"]
    return out


def original_aliases(aliases: dict, corr: dict) -> dict:
    out = copy.deepcopy(aliases)
    by_checkpoint = {e["checkpoint"]: e for e in corr["aliases"]}
    for group in out["groups"]:
        e = by_checkpoint.get(group["checkpoint"])
        if e and group.get("original_labels") == e["labels_from"]:
            group.update(variant=e["variant_from"], labels=e["labels_from"], id_prefixes=e["prefixes_from"])
            for key in ("original_variant", "original_labels", "original_id_prefixes"):
                group.pop(key, None)
    return out


def corrected_notes(notes: dict, snapshot: dict) -> dict:
    out = copy.deepcopy(notes)
    points = records(snapshot)["point"]
    for entry in out["entries"]:
        point = points[entry["point_id"]]
        entry.update(label=point["label"], cohort=point["cohort"])
    return out


def original_notes(notes: dict, corr: dict) -> dict:
    out = copy.deepcopy(notes)
    by_point = {e["point_id"]: e for e in corr["size_notes"]}
    for entry in out["entries"]:
        e = by_point.get(entry["point_id"])
        if e:
            entry.update(label=e["label_from"], cohort=e["cohort_from"])
    return out


def read_csv(path: Path):
    with path.open(newline="") as f:
        reader = csv.DictReader(f)
        return reader.fieldnames, list(reader)


def write_csv(path: Path, fields, rows) -> None:
    out = io.StringIO()
    writer = csv.DictWriter(out, fieldnames=fields, lineterminator="\r\n")
    writer.writeheader()
    writer.writerows(rows)
    path.write_text(out.getvalue())


def csv_problems(data: Path, snapshot: dict) -> list:
    index, problems = records(snapshot), []
    _, rows = read_csv(data / "observations.csv")
    for row in rows:
        point = index["point"].get(row["id"])
        if point is None:
            problems.append(f"observations.csv {row['id']}: no snapshot point")
        elif (row["label"], row["cohort"]) != (point["label"], point["cohort"]) or float(row["x"]) != float(point["x"]) \
                or float(row["y"]) != float(point["y"]):
            problems.append(f"observations.csv {row['id']}: differs from the snapshot")
    _, rows = read_csv(data / "candidates.csv")
    for row in rows:
        candidate = index["candidate"].get(row["id"])
        if candidate is None or (row["label"], row["cohort"]) != (candidate["label"], candidate["cohort"]):
            problems.append(f"candidates.csv {row['id']}: differs from the snapshot")
    return problems


def apply(data: Path, corr_path: Path) -> list:
    corr = json.loads(corr_path.read_text())
    snapshot = json.loads((data / "snapshot.json").read_text())
    problems = apply_snapshot(snapshot, corr)
    if problems:
        return problems
    (data / "snapshot.json").write_text(json.dumps(snapshot, ensure_ascii=False, separators=(",", ":")) + "\n")
    index = records(snapshot)
    fields, rows = read_csv(data / "observations.csv")
    for row in rows:
        point = index["point"][row["id"]]
        row.update(label=point["label"], cohort=point["cohort"])
    write_csv(data / "observations.csv", fields, rows)
    fields, rows = read_csv(data / "candidates.csv")
    for row in rows:
        candidate = index["candidate"][row["id"]]
        row.update(label=candidate["label"], cohort=candidate["cohort"])
    write_csv(data / "candidates.csv", fields, rows)
    aliases = json.loads((data / "variant_aliases.json").read_text())
    (data / "variant_aliases.json").write_text(json_text(corrected_aliases(aliases, corr)))
    notes = json.loads((data / "benchmark_size_notes.json").read_text())
    (data / "benchmark_size_notes.json").write_text(json_text(corrected_notes(notes, snapshot)))
    return check(data, corr_path)


def check(data: Path, corr_path: Path) -> list:
    corr = json.loads(corr_path.read_text())
    if corr.get("schema") != "dendriscale/metadata-corrections-v1":
        return [f"{corr_path.name}: unknown schema"]
    snapshot = json.loads((data / "snapshot.json").read_text())
    problems = check_snapshot(snapshot, corr) + csv_problems(data, snapshot)
    files = corr["ledger"]["files"]
    aliases = json.loads((data / "variant_aliases.json").read_text())
    if hashlib.sha256(json_text(original_aliases(aliases, corr)).encode()).hexdigest() != files["variant_aliases.json"]:
        problems.append("variant_aliases.json: changed beyond the listed corrections")
    if aliases != corrected_aliases(original_aliases(aliases, corr), corr):
        problems.append("variant_aliases.json: not at the corrected labels")
    notes = json.loads((data / "benchmark_size_notes.json").read_text())
    if hashlib.sha256(json_text(original_notes(notes, corr)).encode()).hexdigest() != files["benchmark_size_notes.json"]:
        problems.append("benchmark_size_notes.json: changed beyond the listed corrections")
    if notes != corrected_notes(notes, snapshot):
        problems.append("benchmark_size_notes.json: does not follow the corrected points")
    return problems


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("action", choices=("apply", "check"))
    parser.add_argument("corrections", type=Path)
    parser.add_argument("--data", type=Path, default=Path(__file__).resolve().parents[1] / "data")
    args = parser.parse_args()
    problems = (apply if args.action == "apply" else check)(args.data, args.corrections)
    for problem in problems[:50]:
        print(problem, file=sys.stderr)
    print(f"{args.action}: {len(problems)} problem(s)")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
