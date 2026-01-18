/**
 * Gradual semantics for Quantitative Bipolar Argumentation Frameworks.
 *
 * @module semantics
 */

export type { GradualSemantics, ArgumentEvaluation, SemanticsType } from './types.js';

export {
  DFQuADSemantics,
  createDFQuADSemantics,
  evaluateWithDFQuAD,
} from './DFQuAD.js';
