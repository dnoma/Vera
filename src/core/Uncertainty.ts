import { randomUUID } from 'crypto';
import type {
  Uncertainty,
  Unknown,
  RiskFlag,
  Severity,
  ArgumentId,
} from './types.js';

/**
 * Creates an Unknown factor.
 *
 * @param description - What is unknown
 * @param impact - How it might affect the reasoning
 * @param mitigationStrategy - Optional strategy to address the unknown
 */
export function createUnknown(
  description: string,
  impact: string,
  mitigationStrategy?: string,
  id?: string
): Unknown {
  const base: Unknown = {
    id: id ?? `unknown-${randomUUID()}`,
    description,
    impact,
  };
  if (mitigationStrategy !== undefined) {
    return Object.freeze({
      ...base,
      mitigationStrategy,
    });
  }
  return Object.freeze(base);
}

/**
 * Creates a RiskFlag.
 *
 * @param description - Description of the risk
 * @param severity - Risk severity level
 * @param relatedArgumentIds - Arguments related to this risk
 */
export function createRiskFlag(
  description: string,
  severity: Severity,
  relatedArgumentIds: readonly ArgumentId[] = [],
  id?: string
): RiskFlag {
  return Object.freeze({
    id: id ?? `risk-${randomUUID()}`,
    description,
    severity,
    relatedArgumentIds: Object.freeze([...relatedArgumentIds]),
  });
}

/**
 * Creates an Uncertainty object.
 *
 * @param confidenceStatement - Human-readable confidence statement
 * @param unknowns - Array of unknown factors
 * @param riskFlags - Array of risk flags
 */
export function createUncertainty(
  confidenceStatement: string,
  unknowns: readonly Unknown[] = [],
  riskFlags: readonly RiskFlag[] = []
): Uncertainty {
  return Object.freeze({
    unknowns: Object.freeze([...unknowns]),
    riskFlags: Object.freeze([...riskFlags]),
    confidenceStatement,
  });
}

/**
 * Creates a minimal uncertainty object.
 * Use when reasoning has high confidence with no significant unknowns.
 */
export function createMinimalUncertainty(
  confidenceStatement: string = 'High confidence based on available evidence.'
): Uncertainty {
  return createUncertainty(confidenceStatement, [], []);
}

/**
 * Adds an unknown to an existing uncertainty.
 */
export function addUnknown(
  uncertainty: Uncertainty,
  unknown: Unknown
): Uncertainty {
  return createUncertainty(
    uncertainty.confidenceStatement,
    [...uncertainty.unknowns, unknown],
    uncertainty.riskFlags
  );
}

/**
 * Adds a risk flag to an existing uncertainty.
 */
export function addRiskFlag(
  uncertainty: Uncertainty,
  riskFlag: RiskFlag
): Uncertainty {
  return createUncertainty(
    uncertainty.confidenceStatement,
    uncertainty.unknowns,
    [...uncertainty.riskFlags, riskFlag]
  );
}

/**
 * Gets the highest severity risk flag, if any.
 */
export function getHighestSeverity(
  uncertainty: Uncertainty
): Severity | undefined {
  if (uncertainty.riskFlags.length === 0) {
    return undefined;
  }

  const severityOrder: Severity[] = ['critical', 'high', 'medium', 'low'];
  for (const severity of severityOrder) {
    if (uncertainty.riskFlags.some(r => r.severity === severity)) {
      return severity;
    }
  }
  return undefined;
}

/**
 * Checks if uncertainty has any critical or high severity risks.
 */
export function hasSignificantRisks(uncertainty: Uncertainty): boolean {
  return uncertainty.riskFlags.some(
    r => r.severity === 'critical' || r.severity === 'high'
  );
}

/**
 * Validates an uncertainty object.
 */
export function isValidUncertainty(unc: unknown): unc is Uncertainty {
  if (typeof unc !== 'object' || unc === null) return false;
  const u = unc as Record<string, unknown>;
  return (
    Array.isArray(u['unknowns']) &&
    Array.isArray(u['riskFlags']) &&
    typeof u['confidenceStatement'] === 'string' &&
    u['confidenceStatement'].length > 0
  );
}
