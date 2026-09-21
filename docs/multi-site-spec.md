# Multi-site cloning — technical specification

**Digital Age Expo → location sites (B2B Growth Expo, London Growth Expo, …)**
Status: **for approval — no code written yet**
Revision 4 · 17 September 2026

> **Changes in revision 4**
> - Unknown hosts: **404**, recorded (§1.1, §3.1).
> - Registrar: **Cloudflare**, recorded — but "Cloudflare" leaves the *hosting* question open,
>   and that question turns out to decide whether §4.5 is possible at all (§9).
> - New: **where uploaded files actually live** (§4.6). This affects the existing app, not just
>   the clone.
>
> **Changes in revision 3**
> - Six of the seven open questions are now **answered and recorded** (§1.1).
> - Asset duplication has a complication worth reading: **filenames embed row ids** (§4.5).
> - DNS and TLS are now **automated through the hosting provider**, which brings a deployment
>   API token and a new class of risk into the app (§7, §8).
> - **One question is still open** and blocks Phase 1: what happens on an unknown host (§9).
>
> **Changes in revision 2**
> - The clone copies from a chosen **event**, not just a chosen site (§4.2, §6.2).
> - Speakers, sponsors, exhibitors, visitors and the rest are **no longer copied by default**.
>   Each is an opt-in toggle on the create form (§4.3, §6.3).
> - New section on **toggle dependencies** — what a toggle silently requires (§5.2).

---

## 1. What this covers

One button in a Hub admin area that creates a working duplicate of an existing site — its own
domain, its own branding, its own copy of every page — served by the same deployment. Whether
that duplicate arrives populated or empty is chosen per content type at the moment of
creation.

| Decision | Choice |
|---|---|
| How a site is served | **One deployment, many domains.** The app reads the request hostname and serves the matching tenant. |
| What a clone copies | **Structure and branding always; content only where ticked.** Speakers, sponsors, exhibitors and visitors default to off. |
| Where content comes from | **A chosen source event**, selected on the form — not simply "the source site". |
| Order of work | **This specification first**, then build. |

### 1.1 Decisions taken

| # | Question | Decision |
|---|---|---|
| 1 | Unknown hosts | **404.** No fallback to the parent site. |
| 2 | Asset files shared or duplicated | **Duplicated.** Each site owns its own files. |
| 3 | Exhibitors shared or copied | **Copied.** Two independent rows; the sites never touch each other's. |
| 4 | Exhibitor sub-choice default | **Unallocated.** Rows arrive without zone, spot or stand number. |
| 5 | Who may reach the Hub | **Superadmin only.** |
| 6 | DNS and TLS | **Automated.** DNS at **Cloudflare**; the deployment platform is still to confirm (§9). |
| 7 | Is DAE the parent or a site | **Both.** It is the parent, and it is listed as a site like the reference's "Super Hub" group. |

Three of those answers have consequences worth being explicit about before you approve.

**Copied exhibitors means divergence is permanent (#3).** A company exhibiting in London and at
the B2B show becomes two unrelated rows. Correcting its logo on one site leaves the other wrong,
and nothing will ever reconcile them. That is the right call for independent brands, and it is
also the behaviour that will generate "I already fixed that" support messages a year from now.
The mitigation is that `scripts/import-exhibitor-logos.ts` can simply be re-run per site — worth
knowing the answer exists before the question is asked.

**Automated DNS and TLS puts a production credential inside the app (#6).** See §7.2 and §8.

**404 on unknown hosts is the safe answer, with one consequence (#1).** Every domain must exist
in `find_domains` *before* it resolves, including during provisioning. A site whose DNS is live
but whose row is not yet flagged active will 404 rather than showing a holding page. If you would
rather it showed "coming soon", that is a third state to design, not a fallback — say so and I
will add it.

---

## 2. Where we are starting from

This is the part worth reading carefully, because the starting position is further from the
goal than the Hub screenshots suggest.

### 2.1 The app is single-tenant on purpose

`src/lib/site-config.ts` states it plainly:

> This migration targets a single find_domains row (Digital Age Expo) rather than
> re-implementing the legacy host-based domain resolution.

`DOMAIN_ID = 150` is a module-level constant. `getDomain()` reads that one row, and every page
resolves its tenant through it. **Nothing anywhere reads the request hostname.** The Power
Business Awards hub you showed me is a different codebase that already has host-based tenancy;
this one had it removed during the migration from the legacy PHP site.

So the clone button is the small half of this job. The large half is giving the application a
notion of "which site am I serving right now".

### 2.2 The legacy schema still remembers how to be multi-tenant

`find_domains` has 85 columns, among them `domain_code`, `parent_domain`, `domain_group_cd`
and `is_cms_domain`. The old PHP system resolved tenants by host against this table. The rows
and the columns survive; only the resolution logic was dropped. That is a genuine advantage —
we are restoring a capability the data model was built for, not inventing one.

### 2.3 Only 8 tables are domain-scoped; 55 are event-scoped

Of 106 models in `schema.prisma`:

- **Domain-scoped** (carry a `DOMAIN` column) — 8: `find_domains`, `find_settings`,
  `find_menu_links`, `find_events`, `find_listings`, `find_users`, `find_meeting`,
  `find_news_letter_subscriber`, `find_products_groups`.
- **Event-scoped** (carry `event_id`) — 55: every exhibitor, lobby, zone, spot, schedule,
  speaker, sponsor, ticket and order table.
- **Neither** — 43, including **`find_pages`**.

The practical consequence: *a site's identity is a domain row, but a site's content is an
event*. This is also why the source **event** has to be chosen explicitly — see §4.2.

### 2.4 Two defects that must be fixed before a second site can exist

**Cache keys have no tenant in them.** `getDomain()` reads through
`cachedRead(["domain", "domainRow"], …)`. The key is a constant. The moment two sites exist,
whichever one warms that cache first is served to visitors of both. The same applies to
`["exhibitors", …]`, `["event", …]` and every other key in `src/lib/cache.ts`. This is not a
performance issue — it is a data-leak issue between tenants, and it is silent.

**CMS pages are global.** `find_pages` has neither a `DOMAIN` column nor an `event_id`. The
`[...slug]` catch-all serves the same rows to every host. Two sites could not have different
About pages; editing one would edit both. This needs a schema change.

---

## 3. Target architecture

### 3.1 Tenant resolution

A request arrives for `b2bgrowthexpo.com/exhibitors`.

1. `src/proxy.ts` (Next 16's middleware) reads the `Host` header, normalises it (strip `www.`,
   strip port) and looks up the matching `find_domains` row.
2. It stamps the resolved domain id onto a request header — `x-site-domain-id` — the same
   mechanism `proxy.ts` already uses for `x-cp-pathname`.
3. `getDomain()` reads that header instead of the `DOMAIN_ID` constant.

The host → id lookup runs on every request, so it must be cached in memory and refreshed on a
tag rather than queried per request.

**An unrecognised host returns 404.** It does not fall back to the parent site. A fallback feels
forgiving, but it means a mistyped DNS record, a lapsed domain someone else has picked up, or a
half-finished provisioning run would all quietly serve your flagship brand from an address you did
not intend — and nothing would alert you, because every request succeeds. 404 makes those visible.

`DOMAIN_ID` survives as the fallback for **localhost and the configured parent domain only**, so
local development is unaffected.

### 3.2 Cache keys

Every `cachedRead` key gains the domain id as its first part:

```ts
cachedRead([String(domainId), "domain", "domainRow"], …)
```

Every call site that builds a key must be audited, and revalidation tags need the same
treatment or a save on one site clears another's cache. This is mechanical but wide, and it is
the single highest-risk change in the project: getting it wrong produces cross-tenant content
bleed that looks like a caching glitch rather than a bug.

### 3.3 Pages

`find_pages` gains a `DOMAIN` column, defaulted to 150 for existing rows so the current site is
unaffected. The catch-all route filters on it. The clone copies the source site's pages into
the new domain.

### 3.4 The CP and the Hub

- **Hub** (`/hub/sites`) — **superadmin only**, served on the parent site's own domain
  (`digitalageexpo.com/hub/sites`), exactly as the reference serves it on
  `thepowerbusinessawards.com/hub/sites`. Gated by a new `hub.sites` permission granted only to
  accounts whose group carries `administrator`; the existing `session.admin` bypass in
  `src/lib/cp/rbac.ts` is the natural hook.
- **CP** — scoped to one site, chosen by the host it is accessed on, or by an explicit switcher
  for superadmins.

**Digital Age Expo is both the parent and a listed site.** Its `find_domains` row is flagged as
the parent so the Hub groups it under "Super Hub", and it otherwise behaves like any other site —
editable through the CP, clonable as a source. `find_domains` already carries `parent_domain` and
`is_cms_domain` columns from the legacy system; one of those can hold the flag rather than adding
a column, subject to checking what the legacy wrote there.

---

## 4. What a clone copies

### 4.1 Always copied — the site's identity and shell

These define what the site *is*. A site without them is not a site, so they are not optional.

| Table | Notes |
|---|---|
| `find_domains` | One new row. Name, brand, contact, socials from the form; everything else inherited from the source. |
| `find_settings` | All rows for the source `DOMAIN`, re-keyed. This is the ten CP tabs — general, contact, company, branding, theme, typography, social, SEO, website, footer. |
| `find_menu_links` | The whole navigation tree. `parent_id` remapped (§5.1). |
| `find_pages` | After the schema change in §3.3. |
| `find_events` | One new event row, copied from the **chosen source event** (§4.2), with the new name, year and dates from the form. |
| `find_events_dates`, `find_events_categories_lookup` | The new event's dates and categories. |

`copyEvent()` in `src/lib/services/eventDetails.ts` already does the event row, its category
lookups and its dates. It is the right precedent to extend rather than replace.

### 4.2 The source event is chosen, not assumed

A site can hold several events. Digital Age Expo holds at least two — **852** (the 2025
edition, with ~1,100 exhibitors across zones 250–330) and **1474** (the 2026 edition, 252
exhibitors across zones 2733–2748). They have different zones, different stand layouts and
different exhibitor rosters.

"Clone the site" is therefore ambiguous on its own, and guessing would be the same class of
mistake as the allocator writing to the wrong `layout_type`. The form takes:

- **Copy from site** — which `find_domains` row supplies branding, settings, menus and pages.
- **Copy from event** — which `find_events` row of that site supplies the show content.

The event picker lists that site's events with their year, date and exhibitor count, so the
choice is made on visible facts rather than an id.

### 4.3 Optional — chosen per content type at creation

**Nothing in this section is copied unless its toggle is ticked.** Default for every one of
them is **off**. A new location site starts as a correct, empty shell; you pull across only
what genuinely carries over.

| Toggle | Copies | Default |
|---|---|---|
| **Virtual event / lobby** | `find_event_lobby_layout_manager`, `find_event_lobby_child_layout_manager` (zones **and** stand-layout templates — both live in this table, distinguished by `layout_type`), `find_event_lobby_spots`, `find_event_lobby_templates`, `find_event_lobby_menu` | off |
| **Stand artwork** | `find_event_lobby_layout_type_assets` and the generated banner files | off |
| **Exhibitors** | `find_event_exhibitor` — rows only, or rows with their zone/stand allocation (§5.2) | off |
| **Speakers** | `find_speakers`, `find_guest_speaker`, `find_speakers_questions` | off |
| **Sponsors & advertisers** | `find_event_sponsorer`, `find_event_advertisor`, `find_banner_stands` | off |
| **Schedule & agenda** | `event_schedules`, `find_event_lobby_agenda`, `find_event_lobby_agenda_items` | off |
| **Tickets & pricing** | `find_event_ticket`, `find_event_sponsorship_setup`, `find_event_tradestand_setup` | off |
| **Show content** | `find_event_about_show`, `find_show_info`, `find_event_promotions`, `find_event_magazine_setup`, `find_event_welcome_pack`, `find_event_networking_rooms` | off |
| **Registration form** | `find_event_registration_fields`, `find_event_faqs_permission` | off |
| **Polling** | `find_event_lobby_polling_questions`, `find_event_lobby_polling_options` — questions and options only, never responses | off |
| **Visitors** ⚠ | `find_event_member` and the visitor accounts behind it | off — see the caution below |

⚠ **On copying visitors.** These are real people who registered for the source event. They
consented to that show, from that organiser, at that domain — not to a new brand appearing in
their inbox. Copying them is technically straightforward and the toggle is there because you
asked for it, but my recommendation is that it stays off and new sites build their own list.
If it is ever switched on, that is a decision worth recording with whoever owns data
protection at Geecon. The toggle is labelled accordingly in the UI rather than sitting
innocuously beside "Speakers".

### 4.4 Never copied, whatever is ticked

No toggle exposes these. They hold money that was paid and messages real people sent, against
a show that is not the new one. Duplicating them would corrupt the new site's books and
misrepresent its history.

`find_orders`, `find_invoices`, `find_event_ticket_purchased`, `find_events_rsvp`,
`find_event_lobby_briefcase`, `find_event_lobby_visitor_enquires`, `find_event_schedule_meeting`,
`find_event_lobby_polling_response`, `find_user_enquiry`, `find_email_log`, `find_letter_log`,
`find_event_notifications`, `find_feeds_external`, `find_blog`.

### 4.5 Files on disk — duplicated, and renamed

**Decision: duplicated.** Each site owns its own copy, so replacing a logo on one never touches
the other. Files are copied only for the toggles actually selected — a shell-only clone copies
nothing.

There is a complication here that is easy to miss and expensive to discover late: **these
filenames are derived from row ids.**

| Folder | Pattern | Id embedded |
|---|---|---|
| `public/files/exhibitor_profile_images/` | `ex154678_logo.png` | exhibitor id |
| `public/files/exhibitor_stand_logo/` | `ex154678_logo.png` | exhibitor id |
| `public/images/lobby_assets/` | `event_209886_top_banner_1789464214847.png` | asset row id |
| `public/files/settings/` | free-form | none |

So "duplicate the files" is **not** a directory copy. Exhibitor 154678 becomes, say, 301234 in
the new site; its logo has to be copied to `ex301234_logo.png` *and* the new
`find_event_exhibitor.logo` value has to point at the new name. Copy the bytes without renaming
and the two sites share a file after all — the precise outcome this decision exists to prevent,
arrived at silently.

The file copier therefore runs **after** the rows it depends on, consuming the same id maps as
§5.1:

1. Insert the new rows, obtaining `exhibitorIdMap` and `assetIdMap`.
2. For each copied file, compute the new name from the map.
3. Copy the bytes.
4. Update the row's filename column to the new name.

A file whose source is missing on disk is logged and skipped, not failed — the roster already
contains exhibitors whose logo column names a file that was never mirrored, and one of those
should not abort an otherwise good clone.

**Volume.** Roughly 20–40 MB per clone with artwork and exhibitors on, against ~1,700 files in
`lobby_assets` and ~138 in `exhibitor_profile_images` today. Ten location sites is a few hundred
megabytes in `public/` — fine on disk, but it does enlarge every deployment bundle, and the build
is already running out of memory (§8). Worth a conversation about moving uploads to object
storage before the site count grows, though nothing in this specification depends on that.

### 4.6 Where uploaded files actually live — needs confirming

§4.5 assumes the clone can write files into `public/`. That assumption is inherited from how the
app already works, and it is worth testing before we build on it.

Nine API routes write to `public/` **at runtime** — settings uploads, exhibitor images,
stand assets, lobby spots and templates, news feed, leaderboard, sponsors, to-do list — using
`writeFile(path.join(process.cwd(), "public", …))`.

That works on a server with a persistent writable disk. It does **not** work on a platform with a
read-only or ephemeral filesystem, where the write either throws `EROFS` or succeeds into a layer
that is never served and disappears on redeploy.

The signals in this repo point both ways: `next.config.ts` sets `output: "standalone"`, which is
the self-hosting build, while its own comments talk about Vercel serving the mirrored images.
There is no `vercel.json`, no `Dockerfile` and no CI config to settle it.

So one of three is true, and they lead to very different work:

| If the app is… | §4.5 file duplication | Existing uploads |
|---|---|---|
| **Self-hosted** (VPS or container, persistent volume) | Works exactly as written. | Fine today. |
| **On Vercel** | Impossible at runtime — needs object storage first. | **Already broken in production**, silently. |
| **On Cloudflare Pages/Workers** | Impossible — and more besides. | Already broken. |

That third row is worth spelling out: Cloudflare Workers is not a Node runtime. No `fs`, and
`sharp` (which `generate-stand-artwork.ts` and the logo importer depend on) does not run there.
Prisma needs a driver adapter. Moving this app to Cloudflare hosting would be a port, not a
configuration change — well beyond this specification.

**If the answer is anything but "self-hosted", a storage migration becomes a prerequisite for
Phase 3** — uploads move to object storage (Cloudflare R2 is the natural fit given DNS is already
there), and §4.5's copier copies objects rather than files. That is perhaps a week of work on its
own, and it fixes an existing production bug rather than only serving the clone feature.

---

## 5. The clone engine

### 5.1 Id remapping

The hard part is not the copying; it is that copied rows reference each other **by id**, and
every id changes.

An exhibitor row carries `exhibition_zone_id = 2733`. In the new site that zone is row 4102. If
the exhibitor is inserted with 2733 it silently points at the *source site's* zone, and the new
site's hall renders empty — precisely the failure we spent this week debugging, at clone scale.

So the engine maintains an **id map per table**:

```
zoneIdMap: 2733 → 4102, 2739 → 4103, …
spotIdMap: 46772 → 51001, …
```

Copying proceeds in strict dependency order. Every foreign key is translated through the map of
the table it points at; any key that cannot be translated is a **hard failure**, never a silent
pass-through.

### 5.2 Toggle dependencies

Toggles are not independent, and the engine must not let an inconsistent combination through.

| If you tick | It requires | Because |
|---|---|---|
| Exhibitors **with allocations** | Virtual event / lobby | `exhibition_zone_id`, `spot_id` and `ex_stand_layout_id` all point at lobby rows. Without them there is nothing to remap to. |
| Stand artwork | Virtual event / lobby **and** Exhibitors | `find_event_lobby_layout_type_assets.exhibition_stand_id` is an exhibitor id. |
| Schedule & agenda | Speakers, if any session names one | An agenda item pointing at a speaker that was not copied is a dead link. |

Two ways to handle a violated dependency, and the choice matters:

- **Auto-enable the prerequisite**, telling the user why. Simple, but ticking one box silently
  brings four.
- **Copy exhibitors unallocated.** Exhibitors arrive with `exhibition_zone_id`, `spot_id` and
  `stand_number` set to null, ready to be allocated into the new site's own zones with the
  existing allocator script.

I recommend the second as the default behaviour, with the first offered explicitly: for a
location site, the exhibitor list often carries over while the floor plan does not. The form
shows this as a sub-choice under Exhibitors — *"with their stand allocation"* vs *"unallocated"*
— rather than as a hidden rule.

### 5.3 Transaction and duration

**The whole clone runs in one transaction.** A half-copied site is worse than no site — it would
appear in the Hub list and serve broken pages. Prisma's interactive transactions have a default
timeout that a large copy will exceed; it has to be raised explicitly and the work batched with
`createMany` where the table allows.

A shell-only clone is a few hundred rows and finishes inside a normal request. A clone with
exhibitors and artwork is tens of thousands of rows and will not. The engine therefore runs as a
**background job with a progress row**: the form returns immediately, a `clone_jobs` row tracks
state, and the Hub polls it. The job records which toggles were selected and the source event id,
so a failed clone can be diagnosed from the row rather than from logs.

### 5.4 Files do not roll back

The database work is transactional. The file copying of §4.5 is not — a rolled-back transaction
leaves the copied files behind, orphaned and invisible.

So the order is: **rows first, commit, then files.** If the transaction fails, no files were
written. If the file stage fails after the commit, the site exists with some artwork missing,
which is recoverable by re-running the file stage alone — the `clone_jobs` row records how far it
got. The reverse order (files first) leaves litter after every failed attempt, with filenames
derived from ids that were never committed.

The "delete site" path of Phase 4 has the same asymmetry and must remove files as well as rows.

---

## 6. The Hub UI

`/hub/sites` — superadmin only, behind the existing CP session check with a new permission.

### 6.1 List

Every site as a card: logo, name, domain, hero layout, ceremony date, active state, exhibitor
count. Grouped as in your reference.

### 6.2 New Site form — identity

| Field | Notes |
|---|---|
| Domain * | Without `www.`. Must be unique across `find_domains`. |
| Site name * | |
| Slug * | Auto-generated from name, unique. |
| Event year | |
| Contact email | |
| Organising company | |
| **Copy from site** * | Which existing site supplies branding, settings, menus and pages. Defaults to Digital Age Expo. |
| **Copy from event** * | Which event of that site supplies the show content. Lists year, dates and exhibitor count per event so the choice is made on facts, not ids. |
| Hero layout | Luxury / Sport / Corporate. |
| Colour scheme | The twelve presets. |

### 6.3 New Site form — what to copy

A clearly separated block, every toggle **off** by default, each showing the row count it would
bring so the cost is visible before the button is pressed:

```
WHAT TO COPY                                    from: DAE 2026 (event 1474)

  ☐  Virtual event / lobby            11 zones · 253 booths
  ☐  Stand artwork                    1,700 files · 38 MB
  ☐  Exhibitors                       252 exhibitors
        ◉ unallocated    ○ with their stand allocation
  ☐  Speakers                         18 speakers
  ☐  Sponsors & advertisers           9 sponsors
  ☐  Schedule & agenda                42 sessions
  ☐  Tickets & pricing                6 ticket types
  ☐  Show content                     about, promotions, magazine
  ☐  Registration form                14 fields
  ☐  Polling                          questions and options only
  ⚠  Visitors                         1,240 registrations — see note

  Orders, invoices, purchased tickets, enquiries and message history
  are never copied.
```

That last line belongs in the UI, not only in this document: it is the reassurance that stops
someone wondering whether they have just duplicated a year of paid orders.

---

## 7. Phasing

**Phase 1 — Tenancy foundation.** Host → tenant resolution, tenant in every cache key and tag,
`find_pages.DOMAIN`, CP scoped to a site. Digital Age Expo becomes tenant #1 and nothing visibly
changes. *Largest and riskiest phase; no demo at the end of it.*

**Phase 2 — Hub and shell clone.** `/hub/sites`, the New Site form with the site and event
pickers, and the always-copied shell of §4.1. A new site exists, opens, and looks right — with
no content. Demonstrable, and useful on its own.

**Phase 3 — Content toggles.** The optional copiers of §4.3, id remapping, dependency rules,
background job and progress UI, asset duplication.

**Phase 4 — Domain provisioning and operations.** Automated DNS and TLS (§7.2), a "delete site"
path that removes rows *and* files, and a rehearsal clone against a restored copy of the database
before this is used in anger.

Phase 1 must land before any cloned site can be served, but 2 and 3 can be built and tested
against tenant #1 while it is in progress.

### 7.2 Automated DNS and TLS

**Decision: automated through the hosting provider's API.** In practice that is three steps, and
they belong to two different vendors:

1. **Attach the domain to the deployment.** Platform-specific — for Vercel,
   `POST /v10/projects/{projectId}/domains`, whose response carries a verification challenge if
   the account does not already own the domain.
2. **Create the DNS records at Cloudflare** — `POST /client/v4/zones/{zoneId}/dns_records` for the
   `A` or `CNAME` pointing at the platform, plus any `TXT` record the verification step asked for.
   Needs a scoped API token with `Zone.DNS:Edit` on the specific zone, and the zone id, which the
   app can look up by name. Records should be created **proxied off (grey cloud)** initially:
   proxying breaks most platforms' domain verification until the certificate exists.
3. **Wait for issuance.** TLS is automatic once DNS resolves, but not instant. The Hub shows the
   site as *Provisioning* until the platform reports the certificate issued, then *Active*.

Two things follow that are worth deciding now rather than mid-build:

- **A site is not "created" when its rows exist.** Provisioning is asynchronous and can fail for
  reasons entirely outside the app — a registrar rejecting a record, a domain still inside its
  transfer lock. The `clone_jobs` row and the site card need a provisioning state distinct from
  the clone state, or a DNS failure will present as "the clone broke".
- **Provisioning must be retryable on its own**, without re-running the clone.

---

---

## 8. Risks

**Cross-tenant cache bleed.** Highest severity. Manifests as site B showing site A's exhibitors,
intermittently, depending on which was requested first. Mitigation: tenant in every key; a test
that requests two hosts in sequence and asserts the responses differ.

**Partial clones.** Mitigated by the single transaction and by hard-failing on unmappable
foreign keys.

**Wrong source event.** The reason §4.2 exists. Mitigated by showing exhibitor counts and dates
in the picker, and by recording the source event id on the clone job.

**`find_users` is domain-scoped.** Copying user rows means copying credentials. Default: **do not
copy users**; the new site gets one fresh organiser account created from the form's contact
email. The Visitors toggle is the only exception, with the caution in §4.3.

**A deployment credential now lives in the app.** Automated provisioning means an API token with
rights to alter the production deployment's domains, reachable from a button in the Hub. That is
a genuine escalation of what a compromised superadmin session can do — before this, the worst
case was bad data; after it, the worst case includes pointing a live domain somewhere else.
Mitigations: keep the token in the server environment only, scope it to the single project if the
provider allows, log every provisioning call with the acting user, and treat the Hub permission
as a higher bar than ordinary CP admin.

**DNS automation fails in other people's systems.** Registrar rate limits, propagation delay and
verification races are all outside our control and none of them mean the clone was wrong. Hence
the separate provisioning state in §7.2.

**The build is already at its memory ceiling.** `npm run build` currently dies with
`Zone Allocation failed — process out of memory`. This project adds routes, not removes them.
That should be resolved before, not after.

**Rehearsal.** The first real clone should run against a restored copy of the database, not
production. Nothing here is reversible by itself — that is what Phase 4's delete path is for.

---

## 9. Still open

**One question, and it is the one that decides whether §4.5 can be built as written.**

**Where is this application actually deployed?** Cloudflare answers the *DNS* half, and that part
is settled — §7.2 is written against the Cloudflare DNS API. What it does not answer is what runs
the app, and §4.6 explains why that matters: nine existing routes write files into `public/` at
runtime, and the clone's file-copy stage would be a tenth.

Please confirm which of these it is:

- **A server you control** — VPS, container, anything with a persistent disk. Everything in this
  specification works as written, and there is nothing further to decide.
- **Vercel** — then uploads are already failing in production and the clone cannot write files.
  A move to object storage (R2, since you are already on Cloudflare) becomes a prerequisite for
  Phase 3.
- **Cloudflare Pages / Workers** — then it is a port rather than a deployment target: no Node
  `fs`, no `sharp`, and Prisma needs a driver adapter. Worth discussing separately before any of
  this proceeds.

If you are not certain, the quickest test is to upload a logo through the CP on the deployed site
and reload the page an hour later. If it is still there, it is a persistent disk.

This does **not** block Phase 1 — tenant resolution and cache keys touch none of it. It blocks
Phase 3.

---

## 10. What I need from you

Approve, amend, or reject this specification. The one remaining question in §9 blocks Phase 3, not
Phase 1 — so **on your approval I can start Phase 1 immediately** (tenant resolution, cache keys,
`find_pages.DOMAIN`) while you confirm the deployment target.
