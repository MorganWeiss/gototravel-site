// node --test tools/uptime-check.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { answerOf, change, laTime, message, parts } from "./uptime-check.mjs";

test("emails once when it goes down and once when it's back, never in between", () => {
  assert.equal(change("up", true), "down");
  assert.equal(change(null, true), "down");
  assert.equal(change("down", true), null);
  assert.equal(change("down", false), "up");
  assert.equal(change("up", false), null);
  assert.equal(change(null, false), null);
});

test("reads the last run: failed means down, anything else unclear", () => {
  assert.equal(answerOf("success"), "up");
  assert.equal(answerOf("failure"), "down");
  assert.equal(answerOf("cancelled"), null);
  assert.equal(answerOf(undefined), null);
});

test("asks the website and the four things the app needs, the website without the key", () => {
  const list = parts("https://example.supabase.co");
  assert.deepEqual(list.map((p) => p.name), ["Website", "Sign-in", "Trips and saves", "Photos", "Pip and planning"]);
  assert.equal(list[0].withKey, false);
  assert.ok(list.slice(1).every((p) => p.url.startsWith("https://example.supabase.co/")));
  assert.equal(list[4].method, "OPTIONS");
});

test("says when in California time and names what's down", () => {
  const at = new Date("2026-11-09T00:20:00Z");
  assert.equal(laTime(at), "Sun, Nov 8, 4:20 PM");
  const down = message("down", ["Sign-in", "Photos"], at);
  assert.equal(down.subject, "Go To Travel's server isn't answering");
  assert.match(down.text, /Since about Sun, Nov 8, 4:20 PM, these didn't answer, twice, 20 seconds apart: Sign-in, Photos\./);
  assert.match(message("up", [], at).text, /^Everything answered at Sun, Nov 8, 4:20 PM/);
});
