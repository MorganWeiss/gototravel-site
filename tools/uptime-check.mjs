// Is Go To Travel's server answering? .github/workflows/uptime.yml runs this every 10 minutes (Pavan's call 4 on the
// Build 213 page, Nov 9 2026: on Sunday Nov 8 the server's sign-in, data and storage stopped answering for at least
// 16 hours, and nobody knew until Pavan opened the app). It asks what the app asks, plus the website. A part counts as
// down only when it fails twice, 20 seconds apart. When the overall answer changes (down, or back up) it emails
// ALERT_TO through Resend, once each way. While anything is down the run fails, so the Actions tab shows red.
// Prints only names, status codes and seconds, never a key.
//
// Env: SUPABASE_URL; SUPABASE_KEY (the app's publishable key); RESEND_API_KEY and ALERT_TO (comma-separated
// addresses), both optional; GITHUB_TOKEN, GITHUB_REPOSITORY and GITHUB_RUN_ID (set by Actions) to read the last
// run's result, which is how a change is told from more of the same.
import { pathToFileURL } from "node:url";

const TIMEOUT_MS = 15_000;
const RETRY_AFTER_MS = 20_000;
const SLOW_MS = 8_000;
const SITE = "https://gototravelapp.com";

/** What gets asked: the website, then the four things every screen of the app needs. */
export function parts(base) {
  return [
    { name: "Website", url: `${SITE}/`, withKey: false },
    { name: "Sign-in", url: `${base}/auth/v1/health` },
    { name: "Trips and saves", url: `${base}/rest/v1/explore_itineraries?select=id&featured=eq.true&limit=1` },
    { name: "Photos", url: `${base}/storage/v1/bucket` },
    // A CORS preflight: proves the functions answer without planning anything.
    { name: "Pip and planning", url: `${base}/functions/v1/generate-activities`, method: "OPTIONS" },
  ];
}

/** "down" when it just went down, "up" when it just came back, null when nothing changed. `before` is the last
 *  run's answer ("up", "down" or null when unknown): an unknown start that's down still says so. */
export function change(before, isDown) {
  if (isDown) return before === "down" ? null : "down";
  return before === "down" ? "up" : null;
}

/** The last finished run's answer from its conclusion: a failed run was down. */
export function answerOf(conclusion) {
  return conclusion === "success" ? "up" : conclusion === "failure" ? "down" : null;
}

/** "Mon Nov 9, 4:20 PM" in California. */
export function laTime(date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

/** The email for a change. `down`: the parts that didn't answer. */
export function message(kind, down, at) {
  if (kind === "down") {
    return {
      subject: "Go To Travel's server isn't answering",
      text: [
        `Since about ${laTime(at)}, these didn't answer, twice, 20 seconds apart: ${down.join(", ")}.`,
        "",
        "People opening the app now see Pip's \"Can't reach Go To Travel\" note.",
        "Supabase's status page: https://status.supabase.com",
        "The project: https://supabase.com/dashboard/project/zkwamqtnaegvlptzdqxn",
        "",
        "This check runs every 10 minutes. You'll get one more email when everything answers again.",
      ].join("\n"),
    };
  }
  return {
    subject: "Go To Travel's server is answering again",
    text: `Everything answered at ${laTime(at)}: the website, sign-in, trips and saves, photos, and Pip and planning.`,
  };
}

async function ask(part, key) {
  const headers = {};
  if (part.withKey !== false) {
    headers.apikey = key;
    headers.Authorization = `Bearer ${key}`;
  }
  if (part.method === "OPTIONS") {
    headers.Origin = SITE;
    headers["Access-Control-Request-Method"] = "POST";
  }
  const started = Date.now();
  try {
    const res = await fetch(part.url, { method: part.method ?? "GET", headers, signal: AbortSignal.timeout(TIMEOUT_MS) });
    await res.arrayBuffer().catch(() => {});
    return { ok: res.ok, status: res.status, ms: Date.now() - started };
  } catch (e) {
    return { ok: false, status: e?.name === "TimeoutError" ? "no answer in 15 s" : "no answer", ms: Date.now() - started };
  }
}

async function lastAnswer(env) {
  const { GITHUB_TOKEN: token, GITHUB_REPOSITORY: repo, GITHUB_RUN_ID: runId } = env;
  if (!token || !repo || !runId) return null;
  const gh = async (path) => {
    const res = await fetch(`https://api.github.com/repos/${repo}${path}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`GitHub answered ${res.status}`);
    return res.json();
  };
  try {
    const run = await gh(`/actions/runs/${runId}`);
    const { workflow_runs: runs = [] } = await gh(`/actions/workflows/${run.workflow_id}/runs?status=completed&per_page=5`);
    const last = runs.find((r) => String(r.id) !== String(runId));
    return last ? answerOf(last.conclusion) : null;
  } catch (e) {
    console.log(`Couldn't read the last run's result (${e.message}); treating it as unknown.`);
    return null;
  }
}

async function email(env, kind, down, at) {
  const to = (env.ALERT_TO ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!env.RESEND_API_KEY || !to.length) {
    console.log(`No email set up (RESEND_API_KEY and ALERT_TO); it would have said: ${kind}.`);
    return;
  }
  const { subject, text } = message(kind, down, at);
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: "Go To Travel <hello@gototravelapp.com>", to, subject, text }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  }).catch((e) => ({ ok: false, status: e?.name ?? "error" }));
  console.log(res.ok ? `Emailed: ${subject}` : `The email didn't send (Resend answered ${res.status}).`);
}

async function main(env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_KEY) {
    console.log("Set up first: SUPABASE_URL in the workflow and the UPTIME_SUPABASE_KEY secret (the app's publishable key).");
    process.exitCode = 1;
    return;
  }
  const list = parts(env.SUPABASE_URL.replace(/\/+$/, ""));
  const first = await Promise.all(list.map((p) => ask(p, env.SUPABASE_KEY)));
  let results = first;
  if (first.some((r) => !r.ok)) {
    await new Promise((resolve) => setTimeout(resolve, RETRY_AFTER_MS));
    results = await Promise.all(list.map((p, i) => (first[i].ok ? first[i] : ask(p, env.SUPABASE_KEY))));
  }
  list.forEach((p, i) => {
    const r = results[i];
    const note = !r.ok ? "  <- DOWN" : r.ms > SLOW_MS ? "  <- slow" : "";
    console.log(`${p.name}: ${r.status} in ${(r.ms / 1000).toFixed(2)} s${note}`);
  });
  const down = list.filter((_, i) => !results[i].ok).map((p) => p.name);
  const kind = change(await lastAnswer(env), down.length > 0);
  if (kind) await email(env, kind, down, new Date());
  if (down.length) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main(process.env);
}
