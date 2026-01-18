import { readFileSync } from 'fs';
import { resolve } from 'path';
import type { CuadExample } from '../types.js';

type CuadAnswer = {
  readonly text: string;
  readonly answer_start: number;
};

type CuadQa = {
  readonly answers: readonly CuadAnswer[];
  readonly id: string;
  readonly question: string;
  readonly is_impossible: boolean;
};

type CuadParagraph = {
  readonly context: string;
  readonly qas: readonly CuadQa[];
};

type CuadDoc = {
  readonly title: string;
  readonly paragraphs: readonly CuadParagraph[];
};

type CuadRoot = {
  readonly version: string;
  readonly data: readonly CuadDoc[];
};

function extractCategory(question: string): string {
  const match = question.match(/\"([^\"]+)\"/);
  if (!match) {
    return question.trim();
  }
  return (match[1] ?? question).trim();
}

export function loadCuadExamples(datasetDirOrJson: string): readonly CuadExample[] {
  const datasetPath = datasetDirOrJson.endsWith('.json')
    ? datasetDirOrJson
    : resolve(datasetDirOrJson, 'CUAD_v1.json');

  const raw = readFileSync(datasetPath, 'utf-8');
  const parsed = JSON.parse(raw) as CuadRoot;

  const examples: CuadExample[] = [];
  for (const doc of parsed.data) {
    const paragraph = doc.paragraphs[0];
    if (!paragraph) continue;

    const contractText = paragraph.context;
    for (const qa of paragraph.qas) {
      const category = extractCategory(qa.question);
      const label = !qa.is_impossible;
      const goldSpans = (qa.answers ?? [])
        .map(a => ({
          start: a.answer_start,
          end: a.answer_start + (a.text?.length ?? 0),
        }))
        .filter(s => Number.isFinite(s.start) && Number.isFinite(s.end) && s.end > s.start)
        .filter(s => s.start >= 0 && s.end <= contractText.length);

      examples.push({
        qaId: qa.id,
        contractTitle: doc.title,
        category,
        label,
        contractText,
        question: qa.question,
        goldSpans,
      });
    }
  }

  return examples;
}

export function listCuadCategories(examples: readonly CuadExample[]): readonly string[] {
  return [...new Set(examples.map(e => e.category))].sort();
}
