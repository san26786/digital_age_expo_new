"use client";

import { useState } from "react";
import { CodeXml, Eye, KeyRound, MailWarning, Save, Send, Timer, ListChecks } from "lucide-react";
import type { SiteMailSettings } from "@/lib/email/siteMailSettings";
import type { BounceSummary } from "@/lib/email/emailLog";

/**
 * ===========================================================================
 *  SEND QUEUE — THE PART OF IT THAT EXISTS
 * ===========================================================================
 *
 *  The reference design for this screen has four sections: the email provider, bounce capture,
 *  send cadence and a job list. Exactly one of them has anything behind it in this codebase.
 *
 *  There is no queue. No jobs table, no worker, no campaigns, no bounce records, no unsubscribe
 *  list, no open or click tracking — checked against prisma/schema.prisma, where the only mail
 *  model besides the templates is find_email_log, which is a record of what was sent rather than
 *  a list of what is going to be. A batch size input, a send window, a "Scan now" button and a
 *  bounce rate would every one of them be a control wired to nothing.
 *
 *  So the provider section is real and the other three say plainly what they would do and that
 *  they do not do it yet. That is a worse-looking screen and a far better one to work from: the
 *  alternative teaches somebody that this app paces its sending, and it does not.
 */

const FIELD =
  "w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-white/35 focus:border-brand-pink/50 focus:outline-none focus:ring-1 focus:ring-brand-pink/40";
const LABEL = "mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/55";
const PANEL = "rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-6";

export function SendQueueSettings({
  settings,
  siteName,
  envConfigured,
  saveAction,
  bounces,
}: {
  settings: SiteMailSettings;
  siteName: string;
  /** Whether the platform mailbox in .env is usable, so "Default" can be honest about itself. */
  envConfigured: boolean;
  saveAction: (formData: FormData) => Promise<void>;
  bounces: BounceSummary;
}) {
  const [provider, setProvider] = useState<"" | "smtp">(settings.provider);
  const [signature, setSignature] = useState(settings.signatureHtml);
  const [signatureView, setSignatureView] = useState<"html" | "preview">("html");

  const [testTo, setTestTo] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const sendTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const response = await fetch("/api/email-templates/test-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: testTo,
          subject: `Send Queue test — ${siteName}`,
          html:
            `<p>This is a test from ${siteName}'s Send Queue settings.</p>` +
            `<p>If it arrived, the mailbox this site sends from is working.</p>` +
            `{{signature}}`,
        }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string };
      setTestResult(data.ok ? `Sent to ${testTo}.` : data.error ?? "The test could not be sent.");
    } catch {
      setTestResult("The test could not be sent.");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------- email provider */}
      <form action={saveAction} className={PANEL}>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold text-white">Email provider</h2>
          <span className="rounded-full border border-brand-pink/30 bg-brand-pink/[0.08] px-2.5 py-0.5 text-[0.62rem] font-semibold uppercase tracking-wider text-brand-pink">
            This site only
          </span>
        </div>
        <p className="mt-1 text-sm text-white/55">
          How <strong className="text-white/80">{siteName}</strong> sends email. These settings
          belong to the site you are signed in on and do not affect any other site on this
          platform. Leave the provider on Default to inherit the platform mailbox.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={LABEL}>Provider</span>
            <select
              name="provider"
              value={provider}
              onChange={(event) => setProvider(event.target.value as "" | "smtp")}
              className={`${FIELD} [&_option]:bg-zinc-900`}
            >
              <option value="">Default (environment)</option>
              <option value="smtp">SMTP — this site&apos;s own mailbox</option>
            </select>
            <span className="mt-1.5 block text-xs text-white/45">
              {provider === "smtp"
                ? "Used only once a host, username and password are all filled in — a half-filled form keeps sending through the platform mailbox rather than through one that cannot connect."
                : envConfigured
                  ? "The platform mailbox from .env is configured and will be used."
                  : "No platform mailbox is configured in .env, so nothing can send until this site has its own."}
            </span>
          </label>

          <label className="block">
            <span className={LABEL}>From address</span>
            <input
              name="fromAddress"
              defaultValue={settings.fromAddress}
              placeholder={`${siteName} <noreply@yourdomain.com>`}
              className={FIELD}
            />
            <span className="mt-1.5 block text-xs text-white/45">
              Applies on Default too — sending through the platform mailbox is a deliverability
              choice, showing the platform&apos;s name in the From line is not.
            </span>
          </label>

          <label className="block sm:col-span-2">
            <span className={LABEL}>Reply-to address (optional)</span>
            <input
              name="replyTo"
              defaultValue={settings.replyTo}
              placeholder="hello@yourdomain.com"
              className={FIELD}
            />
          </label>

          <div className="sm:col-span-2 border-t border-white/10 pt-4">
            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
              <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-white/50">
                Email signature (HTML)
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setSignatureView("html")}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                    signatureView === "html" ? "bg-brand-pink/15 text-brand-pink" : "text-white/55 hover:text-white"
                  }`}
                >
                  <CodeXml className="h-3.5 w-3.5" /> HTML
                </button>
                <button
                  type="button"
                  onClick={() => setSignatureView("preview")}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                    signatureView === "preview" ? "bg-brand-pink/15 text-brand-pink" : "text-white/55 hover:text-white"
                  }`}
                >
                  <Eye className="h-3.5 w-3.5" /> Preview
                </button>
              </div>
            </div>

            {/* The textarea stays mounted whichever view is showing, so it is always what submits. */}
            <textarea
              name="signatureHtml"
              rows={8}
              spellCheck={false}
              value={signature}
              onChange={(event) => setSignature(event.target.value)}
              placeholder="<p>Kind regards,<br />Your Name</p>"
              className={`w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 font-mono text-xs leading-relaxed text-white focus:border-brand-pink/50 focus:outline-none ${
                signatureView === "preview" ? "hidden" : ""
              }`}
            />

            {signatureView === "preview" && (
              // sandbox="" for the same reason the template preview has it: this is markup
              // somebody typed into a box and it is about to be rendered as HTML.
              <iframe
                title="Signature preview"
                sandbox=""
                srcDoc={`<!doctype html><html><body style="margin:0;padding:12px;background:#fff;font-family:Arial,Helvetica,sans-serif;color:#18181b">${signature}</body></html>`}
                className="h-[184px] w-full rounded-xl border border-white/10 bg-white"
              />
            )}

            <p className="mt-1.5 text-xs text-white/45">
              Put <code className="rounded bg-white/10 px-1 text-white/70">{"{{signature}}"}</code>{" "}
              in a template where the sign-off belongs and it renders there, inside the design. A
              template without it gets the signature appended below. Use full https:// URLs for
              links and images — an inbox cannot resolve relative ones.
            </p>
          </div>

          <div className="sm:col-span-2 space-y-4 border-t border-white/10 pt-4">
            <div>
              <h3 className="text-sm font-semibold text-white">SMTP mailbox</h3>
              <p className="mt-0.5 text-xs text-white/55">
                Used when the provider above is set to SMTP. One mailbox — splitting a large send
                across several needs the queue worker, which does not exist yet.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className={LABEL}>SMTP host</span>
                <input name="host" defaultValue={settings.host} placeholder="smtp.yourhost.com" className={FIELD} />
              </label>
              <label className="block">
                <span className={LABEL}>SMTP port</span>
                <input name="port" type="number" defaultValue={settings.port || "587"} className={FIELD} />
              </label>
              <label className="block">
                <span className={LABEL}>SMTP username</span>
                <input
                  name="username"
                  autoComplete="off"
                  defaultValue={settings.username}
                  placeholder="mailbox@yourdomain.com"
                  className={FIELD}
                />
              </label>
              <label className="block">
                <span className={LABEL}>SMTP password</span>
                <input
                  name="password"
                  type="password"
                  autoComplete="off"
                  placeholder={settings.passwordSet ? "Configured: leave blank to keep" : "Not set"}
                  className={FIELD}
                />
                <span className="mt-1.5 block text-xs text-white/45">
                  Never sent back to this page. Stored as plain text in find_settings, the same
                  table as the logos and colours — anyone with database access can read it.
                </span>
              </label>
              <label className="flex items-center gap-2 self-end pb-2.5 text-sm text-white/75">
                <input
                  name="secure"
                  type="checkbox"
                  defaultChecked={settings.secure}
                  className="h-4 w-4 accent-[var(--color-brand-pink)]"
                />
                TLS/SSL (port 465)
              </label>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-purple to-brand-pink px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:opacity-90"
          >
            <Save className="h-4 w-4" /> Save provider
          </button>
        </div>

        <div className="mt-5 flex flex-wrap items-end gap-2 border-t border-white/10 pt-5">
          <div className="min-w-[220px] flex-1">
            <span className={LABEL}>Send a test email to</span>
            <input
              type="email"
              value={testTo}
              onChange={(event) => setTestTo(event.target.value)}
              placeholder="you@example.com"
              className={FIELD}
            />
          </div>
          <button
            type="button"
            disabled={!testTo || testing}
            onClick={() => void sendTest()}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:border-brand-pink/40 disabled:opacity-60"
          >
            <Send className="h-4 w-4 text-brand-pink" /> {testing ? "Sending…" : "Send test"}
          </button>
        </div>
        <p className="mt-1.5 text-xs text-white/45">
          Sends through the mailbox as currently <strong className="text-white/70">saved</strong>,
          not as currently typed — save first if you have just changed something.
        </p>
        {testResult && <p className="mt-2 text-xs text-white/70">{testResult}</p>}
      </form>

      {/* --------------------------------------------------------- not built yet */}
      {/* ----------------------------------------------------- bounce capture */}
      <section className={PANEL}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <MailWarning className="h-5 w-5 text-brand-pink" />
            <h2 className="text-lg font-semibold text-white">Bounce capture</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <Stat label="sent" value={bounces.sends.toLocaleString()} />
            <Stat
              label="bounce rate"
              value={bounces.rate === null ? "—" : `${bounces.rate.toFixed(1)}%`}
            />
            <Stat label="hard" value={String(bounces.hard)} tone={bounces.hard > 0 ? "bad" : undefined} />
            <Stat label="soft" value={String(bounces.soft)} />
          </div>
        </div>

        {/*
          * The honest limit, stated where the numbers are rather than in a footnote.
          *
          * These counts come from rejections the mail server made DURING the send — the address
          * did not exist, the domain did not resolve. A message the server accepted and then
          * failed to deliver comes back hours later as a delivery report to the sending mailbox,
          * and reading those needs an IMAP poller this app does not have yet. Presenting the
          * figure as "the bounce rate" without saying which bounces it counts would be a number
          * that quietly means less than it appears to.
          */}
        <p className="mt-2 text-sm leading-relaxed text-white/55">
          A recipient the mail server <strong className="text-white/80">refuses outright</strong> is
          recorded here with the server&apos;s own reason. Hard bounces (the address does not exist)
          stop future sends to that address; soft ones (full mailbox, greylisting) block nothing.
          Every send is logged either way — the full list is under{" "}
          <a href="/members/event_mail_logs" className="text-brand-pink underline">
            Email Logs
          </a>
          .
        </p>

        {/*
          * The limit, stated beside the numbers rather than in a footnote.
          *
          * SMTP has no webhook. What is counted here are refusals made DURING the send, which
          * arrive as an exception and are recorded within milliseconds. A message the server
          * accepts and then fails to deliver comes back hours later as a delivery report to this
          * site's own mailbox, and reading those means polling it over IMAP — a package this app
          * does not have and a mailbox password it would need to use for reading as well as
          * sending. Until that exists these figures are a floor, and saying so is the difference
          * between a number and a number somebody trusts.
          */}
        <p className="mt-2 text-xs leading-relaxed text-white/40">
          Delivery reports that arrive later still need an IMAP reader, which is not built — so
          these are a floor, not a total.
        </p>

        {!bounces.available && (
          <p className="mt-4 rounded-xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-xs leading-relaxed text-amber-100/90">
            <strong>The bounce table does not exist yet.</strong> Run{" "}
            <code className="rounded bg-black/30 px-1">prisma/email_bounces.sql</code> against this
            database and bounces will start being recorded. Sending works either way — nothing here
            blocks an email going out.
          </p>
        )}

        {bounces.recent.length > 0 && (
          <div className="mt-5 overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.02]">
            <table className="w-full min-w-[520px] border-collapse">
              <thead className="border-b border-white/10 bg-white/[0.02]">
                <tr>
                  <Th>Address</Th>
                  <Th>When</Th>
                  <Th>Type</Th>
                  <Th>Reason the server gave</Th>
                </tr>
              </thead>
              <tbody>
                {bounces.recent.map((row, index) => (
                  <tr key={`${row.email}-${index}`} className="border-b border-white/5 last:border-0">
                    <td className="px-3 py-2.5 text-xs text-white/80">{row.email}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-xs text-white/60">
                      {row.detectedOn.toLocaleString()}
                    </td>
                    <td className="px-3 py-2.5 text-xs">
                      <span
                        className={
                          row.type === "hard"
                            ? "rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-black uppercase text-red-300"
                            : "rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-black uppercase text-white/50"
                        }
                      >
                        {row.type}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-white/45">{row.reason || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {bounces.available && bounces.recent.length === 0 && (
          <p className="mt-5 rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-8 text-center text-sm text-white/45">
            No bounces recorded.
          </p>
        )}
      </section>

      <NotBuilt
        icon={<Timer className="h-5 w-5 text-white/40" />}
        title="Send cadence"
        detail="Batch sizes, intervals, daily send windows and chosen weekdays all describe how a worker should pace itself. This app sends inline, one email at a time, at the moment the action happens — there is no worker for these numbers to instruct."
      />

      <NotBuilt
        icon={<ListChecks className="h-5 w-5 text-white/40" />}
        title="Jobs"
        detail="A queued send is a row somewhere saying who is left to receive it. The schema has find_email_log, which records what was already sent, and nothing that represents work outstanding."
      />

      <p className="flex items-start gap-2 text-xs leading-relaxed text-white/40">
        <KeyRound className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        The two sections above are named rather than hidden so the shape of the feature is visible,
        and left empty rather than filled with controls that would save nowhere. Both need a queue
        worker before they can do anything.
      </p>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "bad" }) {
  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-semibold ${
        tone === "bad"
          ? "border-red-400/30 bg-red-500/10 text-red-200"
          : "border-white/10 bg-white/[0.03] text-white/70"
      }`}
    >
      {value} <span className="text-white/40">{label}</span>
    </span>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-3 py-2 text-left text-[0.65rem] font-semibold uppercase tracking-wider text-white/45">
      {children}
    </th>
  );
}

function NotBuilt({ icon, title, detail }: { icon: React.ReactNode; title: string; detail: string }) {
  return (
    <section className="rounded-3xl border border-dashed border-white/10 bg-white/[0.015] p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        {icon}
        <h2 className="text-lg font-semibold text-white/70">{title}</h2>
        <span className="rounded-full border border-white/10 px-2.5 py-0.5 text-[0.62rem] font-semibold uppercase tracking-wider text-white/40">
          Not built yet
        </span>
      </div>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/45">{detail}</p>
    </section>
  );
}
