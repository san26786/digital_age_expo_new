# Putting the CP settings behind the Hub, per site — review

**Status:** proposal, nothing built. Angad reviews, then says go ahead.

---

## 1. The question

The Hub's edit screen has 7 colours, 6 logos and a handful of contact fields. The CP at
`/cp/settings` has **ten tabs** covering the same ground and a great deal more — General, Contact,
Company, Branding, Theme, Typography, Social Media, SEO, Website, Footer.

Can that whole suite be used per site, so building a new site means filling in the real settings
rather than my smaller editor?

Yes. The interesting part is that most of the work has already been done, by whoever wrote the
settings repository — and the part that has not been done is an authorisation question rather than
a plumbing one.

---

## 2. What exists today

| | |
|---|---|
| Tabs | 10 |
| Files | 37 |
| Lines | 2,659 |
| Shared components | `SettingsForm`, `ColorField`, `ImageUploadField`, `SettingsNav`, `validation.ts` |
| Per tab | `page.tsx` (reads + renders), `fields.ts` (the catalog), `actions.ts` (validates + saves) |

### 2.1 The good news: the settings repository is already site-aware

`src/lib/cp/settings/settingsRepository.ts` — **every** exported function already takes a domain:

```ts
getSettingsGroup(grouptitle: string, domainId: number = DOMAIN_ID)
getSetting(varname: string,      domainId: number = DOMAIN_ID)
setSetting(varname, value,        domainId: number = DOMAIN_ID)
setSettings(values,               domainId: number = DOMAIN_ID)
defineSetting({ …, domainId?: number })
```

Every `find_settings` read and write is therefore **already** capable of addressing any site. This
is the bulk of the data layer and it needs **no change at all**. All ten tabs use it.

### 2.2 The gap: the domain repository is hardwired

`src/lib/cp/settings/domainRepository.ts` writes `find_domains` and has `DOMAIN_ID` baked into
every function:

```ts
getDomainSettings()          → where: { id: DOMAIN_ID }
updateCompanyDetails(input)  → where: { id: DOMAIN_ID }
updateSocialMedia(input)     → where: { id: DOMAIN_ID }
updateBranding(input)        → where: { id: DOMAIN_ID }
```

Four functions need a `domainId` parameter, defaulted to `DOMAIN_ID` so the CP keeps working
untouched. **Six of the ten tabs** touch this (General, Company, Branding, Social, SEO, Footer);
the other four are pure `find_settings`.

### 2.3 The call sites assume one site

Each `actions.ts` ends with something like:

```ts
await setSettings(parsed.data);     // no domainId → writes to site 150, always
revalidatePath("/cp/settings/theme");
```

Ten action files and ten page files would need to know which site they are editing.

---

## 3. Three ways to do it

### Option A — Make the CP itself multi-site
`/cp/settings/general?site=151`, one set of pages, site chosen by a query parameter.

- **For:** maximum reuse, nothing duplicated, one place to add a future field.
- **Against:** the site id reaches a Server Action through a **hidden form field**, which is
  client-controlled. The action must re-authorise it on every save — a hidden field saying
  `site=150` from someone who may only edit 151 cannot be trusted. Also changes the CP for the
  main site, which is the one thing currently working and in daily use.

### Option B — Mount the same tabs under the Hub
`/hub/sites/[id]/settings/[tab]`, site id from the URL **path**.

- **For:** the id is a route parameter the Hub's own gate validates before anything renders — no
  client-controlled site field anywhere. The CP is untouched, so nothing about Digital Age Expo's
  admin changes. Reuses the two things that carry the real knowledge: the ten `fields.ts` catalogs
  and the four shared components.
- **Against:** if the pages and actions are *copied*, the Hub and the CP drift — a field added to
  one would silently not appear in the other. That is the exact failure this project has been
  avoiding all along (a toggle the engine ignores, a logo slot nothing reads).

### Option C — Extend the Hub's own small editor
Add the missing fields to `SiteEditForm`.

- **For:** smallest change.
- **Against:** a third implementation of the same settings. Worst drift of the three.

---

## 4. Recommendation — Option B, with the pages shared rather than copied

Take Option B's URL and gate, but do **not** duplicate the twenty thin files. Instead:

1. Extract each tab's body into a component that takes `siteId` — e.g.
   `ThemeSettingsPanel({ siteId })` — leaving the ten `fields.ts` catalogs exactly where they are.
2. `/cp/settings/theme` renders `<ThemeSettingsPanel siteId={DOMAIN_ID} />`.
3. `/hub/sites/[id]/settings/theme` renders `<ThemeSettingsPanel siteId={id} />`.
4. Each save action takes the site id as a **bound argument**, not a form field:
   `saveThemeSettingsAction.bind(null, siteId)` — the value is baked into the closure server-side
   and a tampered form cannot change it.
5. `domainRepository` gains a `domainId` parameter on its four functions, defaulted to
   `DOMAIN_ID`.

One implementation, two mount points, no drift, no client-controlled site id.

---

## 5. The decision I cannot make — who may edit what

The two areas gate differently today:

| | gate | means |
|---|---|---|
| CP | `requireCpPermission(SETTINGS_EDIT)` | a CP session with the settings permission |
| Hub | `getHubAccess()` | superadmin (env allowlist, or `find_users.user_role`) |

If the CP becomes multi-site, **a CP admin for Digital Age Expo could edit B2B Growth Expo's
settings** unless something stops them. Three possible answers:

- **(a) Hub-only.** Per-site settings live behind the Hub's superadmin gate; the CP keeps editing
  its own site only. Simplest and safest. *My recommendation.*
- **(b) Per-site CP permissions.** A real per-site role model — right long-term, considerably more
  work, and it needs a table that does not exist yet.
- **(c) Any CP admin may edit any site.** Fine while Geecon is the only operator; wrong the moment
  a client is given CP access to their own site.

**This is the one thing I need an answer on**, because it decides whether the work is a weekend or
a fortnight.

---

## 6. Effort, honestly

| Step | Size |
|---|---|
| `domainRepository` gains `domainId` (4 functions) | small |
| Extract 10 tab bodies into `siteId`-taking components | medium — mechanical but 10× |
| Bind site id into 10 save actions | small |
| Hub routes + a settings nav that knows its base path | small |
| Verify each tab saves to the right site, on both mount points | **medium — this is the real cost** |

Roughly **20 files touched, 2 new routes**. No schema change. No migration.

The verification is the part I would not compress: each of the ten tabs has to be proved to write
to the site in the URL and not to site 150, and the way that fails is silent — it saves, it says
"Settings updated", and the wrong site changed.

---

## 7. What I would also fix while in there

- **`SettingsNav` hardcodes `/cp/settings/*`.** It needs a base path so the same nav serves both.
- **Typography, Website and parts of SEO are almost certainly write-only**, in the same way Theme
  was until last week and Branding was before that. Worth checking what actually reads them before
  offering them per site — otherwise the Hub gains seven more controls that do nothing.

---

## 8. What I need from you

1. **Approve or amend the approach** (§4).
2. **Answer §5** — Hub-only, per-site CP permissions, or any CP admin edits any site.

On those two I can start. Nothing is built yet.
