# LegalBench Evaluation

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

No runs yet. Generate a predictions file, then run:

`data/legalbench/.venv/bin/python scripts/legalbench-eval.py --predictions /path/to/predictions.jsonl --report docs/legalbench-results.md --run-name "my-run"`

