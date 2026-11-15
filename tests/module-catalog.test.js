import test from "node:test";
import assert from "node:assert/strict";
import { MODULES, NAVIGATION } from "../shared/modules.js";

const SPECIAL_PAGES = new Set([
  "dashboard", "users", "imports", "academics", "approvals", "folders", "events",
  "attendance", "marks", "classes", "profile",
]);

test("every ERP module has a complete, valid navigation entry for the Administrator", () => {
  const moduleKeys = Object.keys(MODULES);
  const adminPages = new Set(NAVIGATION.admin.flatMap((group) => group.items.map((item) => item.id)));
  assert.equal(moduleKeys.length, 22, "the shared module catalogue should include all planned operational modules");
  for (const key of moduleKeys) {
    assert.ok(adminPages.has(key), `Administrator navigation is missing ${key}`);
    const definition = MODULES[key];
    assert.ok(definition.label && definition.group && definition.description, `${key} needs a label, group and description`);
    const fieldKeys = (definition.fields || []).map((field) => field.key);
    assert.equal(new Set(fieldKeys).size, fieldKeys.length, `${key} contains duplicate form field keys`);
    for (const field of definition.fields || []) {
      assert.ok(field.key && field.label && field.type, `${key} contains an incomplete field definition`);
      assert.ok(["text", "textarea", "number", "select", "date", "time", "url"].includes(field.type), `${key}.${field.key} uses an unsupported field type`);
      if (field.type === "select" && !field.dynamic) assert.ok(Array.isArray(field.options), `${key}.${field.key} needs select options`);
    }
  }
});

test("each portal navigation references only a known module or a portal page", () => {
  const moduleKeys = new Set(Object.keys(MODULES));
  for (const role of ["admin", "faculty", "student"]) {
    assert.ok(Array.isArray(NAVIGATION[role]) && NAVIGATION[role].length, `${role} navigation is missing`);
    for (const group of NAVIGATION[role]) {
      assert.ok(group.group && Array.isArray(group.items), `${role} has a malformed navigation group`);
      for (const item of group.items) {
        assert.ok(moduleKeys.has(item.id) || SPECIAL_PAGES.has(item.id), `${role} navigation references unknown page ${item.id}`);
        assert.ok(item.label && item.icon, `${role}.${item.id} is missing its label or icon`);
      }
    }
  }
});

test("the Administrator portal contains every shared module", () => {
  const adminPages = new Set(NAVIGATION.admin.flatMap((group) => group.items.map((item) => item.id)));
  for (const key of Object.keys(MODULES)) assert.ok(adminPages.has(key));
});
