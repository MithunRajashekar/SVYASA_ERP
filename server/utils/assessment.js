export const CIA_FIELDS = Object.freeze(["cia1", "cia2", "cia3"]);
export const INTERNAL_FIELDS = Object.freeze(["internal1", "internal2"]);
export const ASSESSMENT_FIELDS = Object.freeze([...CIA_FIELDS, ...INTERNAL_FIELDS]);

export function normalizeAssessmentScore(value, field) {
  if (value === "" || value === null || value === undefined) return null;
  const score = Number(value);
  if (!Number.isFinite(score) || score < 0 || score > 100) {
    throw new Error(`${field} must be between 0 and 100.`);
  }
  return score;
}

function summarize(fields, values) {
  const entered = fields
    .map((field) => values?.[field])
    .filter((value) => value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value)))
    .map(Number);
  const total = entered.length ? entered.reduce((sum, value) => sum + value, 0) : null;
  return {
    total: total === null ? null : Number(total.toFixed(2)),
    average: total === null ? null : Number((total / entered.length).toFixed(2)),
    count: entered.length,
  };
}

/** Calculate the two assessment streams separately. The overall average is
 * informational only and is never used in place of the CIA or Internal average.
 */
export function calculateAssessmentSummary(values = {}) {
  const cia = summarize(CIA_FIELDS, values);
  const internal = summarize(INTERNAL_FIELDS, values);
  const overall = summarize(ASSESSMENT_FIELDS, values);
  return {
    ciaTotal: cia.total,
    ciaAverage: cia.average,
    ciaCount: cia.count,
    internalTotal: internal.total,
    internalAverage: internal.average,
    internalCount: internal.count,
    total: overall.total,
    average: overall.average,
    assessmentCount: overall.count,
  };
}

export function mergeAssessmentValues(existing = {}, incoming = {}, { ignoreBlank = false } = {}) {
  const values = {};
  for (const field of ASSESSMENT_FIELDS) {
    const candidate = Object.hasOwn(incoming, field) ? incoming[field] : undefined;
    if (candidate === undefined || (ignoreBlank && (candidate === null || candidate === ""))) {
      values[field] = existing[field] ?? null;
    } else {
      values[field] = normalizeAssessmentScore(candidate, field);
    }
  }
  return { ...values, ...calculateAssessmentSummary(values) };
}


/** Map the former fourth/fifth CIA values into the new Internal 1/2 fields.
 * Existing Internal values take precedence; original CIA 4/5 fields remain in
 * MongoDB as hidden legacy fields for audit/recovery.
 */
export function migrateLegacyCiaValues(values = {}) {
  const migrated = {};
  if ((values.internal1 === null || values.internal1 === undefined) && values.cia4 !== null && values.cia4 !== undefined) {
    migrated.internal1 = normalizeAssessmentScore(values.cia4, "internal1");
  }
  if ((values.internal2 === null || values.internal2 === undefined) && values.cia5 !== null && values.cia5 !== undefined) {
    migrated.internal2 = normalizeAssessmentScore(values.cia5, "internal2");
  }
  return { changed: Object.keys(migrated).length > 0, values: migrated };
}
