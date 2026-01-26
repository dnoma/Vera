#!/usr/bin/env python3
"""
Evaluate LegalBench predictions (JSONL) and write results to a Markdown report.

JSONL format (one object per line):
  - task: str (e.g. "abercrombie")
  - split: str ("test")
  - id: int (row index in tasks/<task>/test.tsv)
  - prediction: str

Optional:
  - meta: object (model name, temperature, etc.)
  - input: object (raw row fields for debugging)
"""

from __future__ import annotations

import argparse
import csv
import datetime as dt
import json
import os
import sys
import warnings
from dataclasses import dataclass
from typing import Any, Dict, Iterable, List, Mapping, Optional, Tuple


def read_jsonl(path: str) -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []
    with open(path, "r", encoding="utf-8") as f:
        for line_no, line in enumerate(f, start=1):
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
            except json.JSONDecodeError as e:
                raise SystemExit(f"Invalid JSONL at {path}:{line_no}: {e}") from e
            if not isinstance(obj, dict):
                raise SystemExit(f"Invalid JSONL at {path}:{line_no}: expected object")
            rows.append(obj)
    return rows


def ensure_parent_dir(path: str) -> None:
    parent = os.path.dirname(path)
    if parent:
        os.makedirs(parent, exist_ok=True)


def normalize_id(value: Any) -> int:
    if isinstance(value, int):
        return value
    if isinstance(value, str) and value.strip().isdigit():
        return int(value.strip())
    raise ValueError(f"Invalid id: {value!r} (expected int)")


def pick_answer_column(fieldnames: List[str]) -> str:
    candidates = ["answer", "label", "output", "target", "gold"]
    for c in candidates:
        if c in fieldnames:
            return c
    raise ValueError(f"Couldn't find answer column; got columns: {fieldnames!r}")


@dataclass(frozen=True)
class TaskResult:
    task: str
    n_test: int
    n_pred: int
    coverage: float
    score: Optional[float]
    note: Optional[str]


def mean(values: Iterable[float]) -> Optional[float]:
    vs = list(values)
    if not vs:
        return None
    return sum(vs) / len(vs)


def weighted_mean(pairs: Iterable[Tuple[float, int]]) -> Optional[float]:
    items = list(pairs)
    if not items:
        return None
    num = sum(v * w for v, w in items)
    den = sum(w for _, w in items)
    if den == 0:
        return None
    return num / den


def format_float(value: Optional[float]) -> str:
    if value is None:
        return "—"
    return f"{value:.4f}"


def load_tasks_list(legalbench_dir: str) -> List[str]:
    sys.path.insert(0, legalbench_dir)
    try:
        from tasks import TASKS  # type: ignore

        return list(TASKS)
    finally:
        try:
            sys.path.remove(legalbench_dir)
        except ValueError:
            pass


def load_evaluator(legalbench_dir: str):
    sys.path.insert(0, legalbench_dir)
    try:
        import evaluation  # type: ignore

        return evaluation
    finally:
        try:
            sys.path.remove(legalbench_dir)
        except ValueError:
            pass


def evaluate_task(
    evaluation_module: Any,
    tasks_dir: str,
    task: str,
    preds_by_id: Mapping[int, str],
) -> TaskResult:
    test_path = os.path.join(tasks_dir, task, "test.tsv")
    if not os.path.exists(test_path):
        return TaskResult(task=task, n_test=0, n_pred=0, coverage=0.0, score=None, note="missing test.tsv")

    with open(test_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f, delimiter="\t")
        if not reader.fieldnames:
            return TaskResult(task=task, n_test=0, n_pred=0, coverage=0.0, score=None, note="empty test.tsv")

        answer_col = pick_answer_column(reader.fieldnames)
        has_index_col = "index" in reader.fieldnames
        answers: List[str] = []
        generations: List[str] = []
        n_pred = 0

        for idx, row in enumerate(reader):
            ans = (row.get(answer_col) or "").strip()
            answers.append(ans)
            example_id = idx
            if has_index_col:
                raw_idx = (row.get("index") or "").strip()
                if raw_idx.isdigit():
                    example_id = int(raw_idx)
            pred = preds_by_id.get(example_id)
            if pred is None:
                generations.append("")
            else:
                generations.append(str(pred))
                n_pred += 1

    n_test = len(answers)
    coverage = (n_pred / n_test) if n_test else 0.0

    try:
        with warnings.catch_warnings():
            warnings.filterwarnings(
                "ignore",
                message="y_pred contains classes not in y_true",
                category=UserWarning,
            )
            score_raw = evaluation_module.evaluate(task, generations, answers)
        score: Optional[float]
        if isinstance(score_raw, (int, float)):
            score = float(score_raw)
        else:
            score = None
        return TaskResult(task=task, n_test=n_test, n_pred=n_pred, coverage=coverage, score=score, note=None)
    except Exception as e:
        return TaskResult(
            task=task,
            n_test=n_test,
            n_pred=n_pred,
            coverage=coverage,
            score=None,
            note=f"eval_error: {type(e).__name__}",
        )


REPORT_HEADER = """# LegalBench Evaluation

## Predictions JSONL format

One JSON object per line:

```json
{"task":"abercrombie","split":"test","id":0,"prediction":"Yes","meta":{"model":"gpt-4.1-mini"}}
```

Required fields:
- `task`: task directory name under `data/legalbench/tasks/`
- `split`: use `"test"`
- `id`: row index (0-based) in `test.tsv`
- `prediction`: string output

Optional fields:
- `meta`: any metadata (model, temperature, prompt version)
- `input`: saved raw row fields for debugging

## Results
"""


def append_report(
    report_path: str,
    *,
    run_name: Optional[str],
    predictions_path: str,
    results: List[TaskResult],
) -> None:
    ensure_parent_dir(report_path)
    if not os.path.exists(report_path):
        with open(report_path, "w", encoding="utf-8") as f:
            f.write(REPORT_HEADER)

    now = dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%d %H:%M:%SZ")
    scored = [r for r in results if r.score is not None]
    macro = mean(r.score for r in scored)  # type: ignore[arg-type]
    weighted = weighted_mean((r.score, r.n_test) for r in scored if r.score is not None)  # type: ignore[arg-type]
    overall_cov = weighted_mean((r.coverage, r.n_test) for r in results)

    with open(report_path, "a", encoding="utf-8") as f:
        f.write("\n")
        title = f"### Run {now}"
        if run_name:
            title += f" — {run_name}"
        f.write(title + "\n\n")
        f.write(f"- Predictions: `{predictions_path}`\n")
        f.write(f"- Tasks: `{len(results)}`\n")
        f.write(f"- Weighted coverage: `{format_float(overall_cov)}`\n")
        f.write(f"- Macro avg (scored tasks): `{format_float(macro)}`\n")
        f.write(f"- Weighted avg (scored tasks): `{format_float(weighted)}`\n\n")

        f.write("| task | n_test | n_pred | coverage | score | note |\n")
        f.write("|---|---:|---:|---:|---:|---|\n")
        for r in results:
            f.write(
                f"| {r.task} | {r.n_test} | {r.n_pred} | {r.coverage:.3f} | {format_float(r.score)} | {r.note or ''} |\n"
            )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--predictions", required=True, help="Path to predictions JSONL file.")
    parser.add_argument("--report", default="docs/legalbench-results.md", help="Markdown report path.")
    parser.add_argument("--run-name", default=None, help="Optional run name shown in the report.")
    parser.add_argument("--legalbench-dir", default="data/legalbench", help="Path to LegalBench clone directory.")
    parser.add_argument("--tasks-dir", default="data/legalbench/tasks", help="Path to tasks directory.")
    parser.add_argument(
        "--tasks",
        default=None,
        help="Comma-separated task names to score (default: tasks present in predictions). Use --all-tasks to force all.",
    )
    parser.add_argument(
        "--all-tasks",
        action="store_true",
        help="Score all LegalBench tasks (missing predictions count as empty strings).",
    )
    args = parser.parse_args()

    preds_rows = read_jsonl(args.predictions)
    preds_by_task: Dict[str, Dict[int, str]] = {}

    for obj in preds_rows:
        split = obj.get("split")
        if split is not None and split != "test":
            continue
        task = obj.get("task")
        pred = obj.get("prediction")
        if not isinstance(task, str) or not task:
            raise SystemExit("Each JSONL row must include a non-empty string field: task")
        if pred is None:
            raise SystemExit("Each JSONL row must include field: prediction")
        idx = normalize_id(obj.get("id"))
        preds_by_task.setdefault(task, {})[idx] = str(pred)

    if args.all_tasks:
        tasks = load_tasks_list(args.legalbench_dir)
    elif args.tasks:
        tasks = [t.strip() for t in str(args.tasks).split(",") if t.strip()]
    else:
        tasks = sorted(preds_by_task.keys())
    evaluation_module = load_evaluator(args.legalbench_dir)

    results: List[TaskResult] = []
    for task in tasks:
        results.append(evaluate_task(evaluation_module, args.tasks_dir, task, preds_by_task.get(task, {})))

    append_report(args.report, run_name=args.run_name, predictions_path=args.predictions, results=results)

    scored = [r for r in results if r.score is not None]
    print(f"tasks={len(results)} scored={len(scored)} report={args.report}")


if __name__ == "__main__":
    main()
