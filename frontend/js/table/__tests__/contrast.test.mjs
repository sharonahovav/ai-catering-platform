// WCAG 2.x contrast for the token pairs actually used in /table/ (text 4.5:1, UI/focus 3:1).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const css = readFileSync(new URL("../../../css/table/tokens.css", import.meta.url), "utf8");
const color = (name) => {
  const m = css.match(new RegExp(`--color-${name}:\\s*(#[0-9A-Fa-f]{6})`));
  assert.ok(m, `token --color-${name} missing`);
  return m[1];
};
const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [hi, lo] = [lum(color(a)), lum(color(b))].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const TEXT = [
  ["ink", "bg"], ["ink", "surface"], ["ink", "surface-raised"], ["ink", "blush"], ["ink", "sage"],
  ["muted", "bg"], ["muted", "surface"], ["muted", "surface-raised"],
  ["surface-raised", "ink"],      // primary button label
  ["aubergine", "blush"],         // demo tag
  ["rose", "surface-raised"],     // accent text
  ["positive", "surface-raised"], ["negative", "surface-raised"],
];
const UI = [
  ["focus", "bg"], ["focus", "surface"], ["focus", "surface-raised"], ["focus", "blush"], ["focus", "sage"],
  ["control-border", "bg"], ["control-border", "surface-raised"],
];

for (const [fg, bg] of TEXT) {
  test(`text ${fg} on ${bg} >= 4.5:1`, () => assert.ok(ratio(fg, bg) >= 4.5, ratio(fg, bg).toFixed(2)));
}
for (const [fg, bg] of UI) {
  test(`ui ${fg} on ${bg} >= 3:1`, () => assert.ok(ratio(fg, bg) >= 3, ratio(fg, bg).toFixed(2)));
}
