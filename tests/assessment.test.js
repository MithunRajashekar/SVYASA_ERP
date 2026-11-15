import test from "node:test";
import assert from "node:assert/strict";
import {
  ASSESSMENT_FIELDS,
  calculateAssessmentSummary,
  mergeAssessmentValues,
  migrateLegacyCiaValues,
  normalizeAssessmentScore,
} from "../server/utils/assessment.js";

test("assessment model separates the three CIA and two Internal averages", () => {
  assert.deepEqual(ASSESSMENT_FIELDS, ["cia1", "cia2", "cia3", "internal1", "internal2"]);
  const summary = calculateAssessmentSummary({
    cia1: 18, cia2: 20, cia3: 17,
    internal1: 19, internal2: 16,
  });
  assert.equal(summary.ciaTotal, 55);
  assert.equal(summary.ciaAverage, 18.33);
  assert.equal(summary.ciaCount, 3);
  assert.equal(summary.internalTotal, 35);
  assert.equal(summary.internalAverage, 17.5);
  assert.equal(summary.internalCount, 2);
  assert.equal(summary.total, 90);
  assert.equal(summary.average, 18);
  assert.equal(summary.assessmentCount, 5);
});

test("partial marks average only the scores that have actually been entered", () => {
  const summary = calculateAssessmentSummary({ cia1: 80, cia2: null, cia3: 70, internal1: 90, internal2: null });
  assert.equal(summary.ciaAverage, 75);
  assert.equal(summary.ciaCount, 2);
  assert.equal(summary.internalAverage, 90);
  assert.equal(summary.internalCount, 1);
  assert.equal(summary.average, 80);
  assert.equal(summary.assessmentCount, 3);
});

test("blank Excel cells can preserve existing marks while nonblank cells update", () => {
  const merged = mergeAssessmentValues(
    { cia1: 70, cia2: 75, cia3: 80, internal1: 60, internal2: 65 },
    { cia1: null, cia2: 85, internal1: null },
    { ignoreBlank: true },
  );
  assert.equal(merged.cia1, 70);
  assert.equal(merged.cia2, 85);
  assert.equal(merged.cia3, 80);
  assert.equal(merged.internal1, 60);
  assert.equal(merged.internal2, 65);
  assert.equal(merged.ciaAverage, 78.33);
  assert.equal(merged.internalAverage, 62.5);
});

test("assessment scores must be numeric and between 0 and 100", () => {
  assert.equal(normalizeAssessmentScore("0", "cia1"), 0);
  assert.equal(normalizeAssessmentScore("100", "cia1"), 100);
  assert.equal(normalizeAssessmentScore("", "cia1"), null);
  assert.throws(() => normalizeAssessmentScore(-1, "cia1"), /between 0 and 100/);
  assert.throws(() => normalizeAssessmentScore(100.1, "internal2"), /between 0 and 100/);
  assert.throws(() => normalizeAssessmentScore("absent", "cia2"), /between 0 and 100/);
});

test("legacy CIA 4/5 values map to Internal 1/2 without replacing existing internals", () => {
  const migration = migrateLegacyCiaValues({ cia4: 72, cia5: 81, internal1: null, internal2: 77 });
  assert.equal(migration.changed, true);
  assert.deepEqual(migration.values, { internal1: 72 });
  const noChange = migrateLegacyCiaValues({ cia4: 72, cia5: 81, internal1: 65, internal2: 70 });
  assert.equal(noChange.changed, false);
  assert.deepEqual(noChange.values, {});
});
