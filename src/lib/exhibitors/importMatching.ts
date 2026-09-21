/**
 * ===========================================================================
 *  WHICH CSV ROWS ARE ALREADY EXHIBITING, AND WHICH ARE NEW
 * ===========================================================================
 *
 *  Pure, no imports, no database. The same function classifies the preview the admin reviews and
 *  the rows the server is about to insert — because a preview produced by different code from the
 *  insert is a preview that can be wrong, and the only moment anyone would find out is afterwards.
 *
 *  ---------------------------------------------------------------------------
 *  IDENTITY IS BUSINESS + EMAIL, TOGETHER
 *  ---------------------------------------------------------------------------
 *
 *  Not email alone, which is what this import used before: one person can represent two companies,
 *  and skipping the second is silently losing an exhibitor.
 *
 *  Not business alone either, and that matters just as much. `find_event_exhibitor` stores a
 *  CONTACT — first_name, last_name, email, position, phone, with `business` as an attribute — so
 *  one exhibiting company legitimately has several rows: the MD, the stand manager, the marketing
 *  lead. Keying on the company name would block every colleague after the first, with no way to
 *  override it.
 *
 *  So the pair is the identity, and each half alone is a SIGNAL worth showing:
 *
 *      business + email match   ->  already exists, not importable
 *      email matches only       ->  potential email match: same person, different company
 *      business matches only    ->  new, and flagged as a second contact at that exhibitor
 *      neither                  ->  new
 *
 *  ---------------------------------------------------------------------------
 *  PRECEDENCE IS FIXED, BECAUSE A ROW CAN BE SEVERAL THINGS AT ONCE
 *  ---------------------------------------------------------------------------
 *
 *      invalid  >  csv duplicate  >  already exists  >  potential email match  >  new
 *
 *  A row repeated inside the file AND already in the database is reported as the duplicate it is;
 *  without a stated order the categories overlap, the counts stop summing to the row total, and
 *  two people reading the same screen disagree about what happened.
 *
 *  ---------------------------------------------------------------------------
 *  EVERY COMPARISON IS SCOPED TO ONE EVENT
 *  ---------------------------------------------------------------------------
 *
 *  The caller passes only that event's exhibitors. The same company exhibiting at last year's show
 *  has no bearing on this one, and a matcher that reached across events would refuse to import a
 *  returning exhibitor.
 */

export type ImportCategory =
  | "new"
  | "potential_email_match"
  | "already_exists"
  | "csv_duplicate"
  | "invalid";

/** Trimmed, lower-cased. Nothing else — the matching has to stay explainable. */
export function normaliseEmail(value: string | null | undefined): string {
  return String(value ?? "").trim().toLowerCase();
}

/** Trimmed, lower-cased, runs of whitespace collapsed to one space. */
export function normaliseBusiness(value: string | null | undefined): string {
  return String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

/** The identity key. Both halves normalised, joined by a character neither can contain. */
export function identityKey(business: string, email: string): string {
  return `${normaliseBusiness(business)}\u0000${normaliseEmail(email)}`;
}

export interface ExistingExhibitor {
  id: number;
  business: string;
  email: string;
  contact: string;
  /**
   * Their status on the event right now. Carried purely so the import screen can show, and let the
   * organiser change, the standing of an exhibitor the file has dropped — the matcher itself never
   * reads it. Whether a row is a duplicate has nothing to do with whether it is active.
   */
  status: string;
}

/** One CSV row as the caller has already validated it. */
export interface CandidateRow {
  /** 1-based position among DATA rows, which is what the admin counts in their spreadsheet. */
  row: number;
  business: string;
  email: string;
  contact: string;
  phone: string;
  /** The caller validates with the app's own schema; this module only places the result. */
  valid: boolean;
  invalidReason?: string;
}

export interface ClassifiedRow extends CandidateRow {
  category: ImportCategory;
  /** Always populated. Every skipped or flagged row can say why without the reader guessing. */
  reason: string;
  /** Whether the import screen ticks it on arrival. Never true for a row that cannot be imported. */
  selectedByDefault: boolean;
  /** The existing exhibitor this row matched, for the side-by-side columns. */
  existing?: ExistingExhibitor;
  /** For a csv_duplicate: the earlier row carrying the same identity. */
  duplicateOfRow?: number;
  /** New, but this business is already exhibiting under a different address. */
  secondContact?: boolean;
  /** New, but an earlier row in this same file uses the same email for another business. */
  emailAlsoOnRow?: number;
}

export interface ImportAnalysis {
  records: ClassifiedRow[];
  /** Exhibitors on the event that this file does not mention. Informational; never touched. */
  existingNotInCsv: ExistingExhibitor[];
  summary: {
    total: number;
    newRows: number;
    potentialEmailMatches: number;
    alreadyExists: number;
    csvDuplicates: number;
    invalid: number;
    existingNotInCsv: number;
    /** new + potential email match: the ceiling on what this file could add. */
    importable: number;
  };
}

/** A row that imports on its own merits — ticked by default, needing no override. */
export function isImportable(category: ImportCategory): boolean {
  return category === "new" || category === "potential_email_match";
}

/**
 * A row the admin is ALLOWED to tick, override included.
 *
 * `already_exists` is in this list and the two below it are not, which is a deliberate line rather
 * than an inconsistency. An already-existing contact is a judgement call the organiser is entitled
 * to make — they may know the second row carries a corrected phone number, or that the company
 * genuinely wants two entries — so the screen lets them force it, unticked, with a warning.
 *
 * `csv_duplicate` is the same row twice in ONE file, which is a mistake in the file every time, and
 * `invalid` cannot be written at all. Neither is a judgement call, so neither gets an override.
 *
 * Forcing a duplicate needs the row to carry `_allowDuplicate` when it is submitted. Without that
 * flag an already_exists row is still skipped — which is what protects the case where a row was NEW
 * at preview and somebody else added it before the confirm.
 */
export function canImport(category: ImportCategory): boolean {
  return isImportable(category) || category === "already_exists";
}

export function classifyImportRows(
  rows: CandidateRow[],
  existing: ExistingExhibitor[]
): ImportAnalysis {
  /*
   * Three lookups built once. The alternative — scanning the existing list per row — is the N+1
   * of in-memory code: 125 rows against 232 exhibitors is 29,000 comparisons for no reason.
   */
  const byIdentity = new Map<string, ExistingExhibitor>();
  const byEmail = new Map<string, ExistingExhibitor>();
  const byBusiness = new Map<string, ExistingExhibitor>();

  for (const entry of existing) {
    const email = normaliseEmail(entry.email);
    const business = normaliseBusiness(entry.business);
    if (business && email) byIdentity.set(identityKey(entry.business, entry.email), entry);
    if (email && !byEmail.has(email)) byEmail.set(email, entry);
    if (business && !byBusiness.has(business)) byBusiness.set(business, entry);
  }

  const seenIdentity = new Map<string, number>();
  const seenEmail = new Map<string, number>();
  const csvIdentities = new Set<string>();

  const records: ClassifiedRow[] = rows.map((row) => {
    const email = normaliseEmail(row.email);
    const business = normaliseBusiness(row.business);
    const key = identityKey(row.business, row.email);

    // 1. INVALID — the app's own schema rejected it. Nothing else is worth saying about it.
    if (!row.valid) {
      return {
        ...row,
        category: "invalid",
        reason: row.invalidReason ?? "This row failed validation.",
        selectedByDefault: false,
      };
    }

    csvIdentities.add(key);

    // 2. CSV DUPLICATE — the same business and email earlier in this same file.
    const earlier = seenIdentity.get(key);
    if (earlier !== undefined) {
      return {
        ...row,
        category: "csv_duplicate",
        reason: `Same business and email as row ${earlier} of this file.`,
        selectedByDefault: false,
        duplicateOfRow: earlier,
      };
    }
    seenIdentity.set(key, row.row);

    // 3. ALREADY EXISTS — this exact contact is on the event.
    const exact = byIdentity.get(key);
    if (exact) {
      return {
        ...row,
        category: "already_exists",
        reason: "This business and email are already on this event.",
        selectedByDefault: false,
        existing: exact,
      };
    }

    /*
     * 4. POTENTIAL EMAIL MATCH — the address is on the event under a DIFFERENT business.
     *
     * Not a duplicate, and the reason this category exists at all: one person can represent two
     * companies, and the old email-only rule threw the second away without telling anybody. It is
     * importable, but it arrives unticked — this is the one case that genuinely wants a human to
     * look at it.
     */
    const sameEmail = email ? byEmail.get(email) : undefined;
    if (sameEmail && normaliseBusiness(sameEmail.business) !== business) {
      return {
        ...row,
        category: "potential_email_match",
        reason: `${row.email} is already on this event for ${sameEmail.business}. This may be the same person representing another company.`,
        selectedByDefault: false,
        existing: sameEmail,
      };
    }

    // 5. NEW. Two things are worth saying about a new row without changing what it is.
    const sameBusiness = business ? byBusiness.get(business) : undefined;
    const emailEarlierInFile = email ? seenEmail.get(email) : undefined;
    if (email && emailEarlierInFile === undefined) seenEmail.set(email, row.row);

    const notes: string[] = [];
    if (sameBusiness) notes.push(`${sameBusiness.business} is already exhibiting — this adds another contact.`);
    if (emailEarlierInFile !== undefined) {
      notes.push(`Row ${emailEarlierInFile} of this file uses the same email for a different business.`);
    }

    return {
      ...row,
      category: "new",
      reason: notes.join(" ") || "Not on this event.",
      selectedByDefault: true,
      secondContact: Boolean(sameBusiness),
      emailAlsoOnRow: emailEarlierInFile,
      existing: sameBusiness,
    };
  });

  const existingNotInCsv = existing.filter(
    (entry) => !csvIdentities.has(identityKey(entry.business, entry.email))
  );

  const count = (category: ImportCategory) =>
    records.filter((record) => record.category === category).length;

  const newRows = count("new");
  const potentialEmailMatches = count("potential_email_match");

  return {
    records,
    existingNotInCsv,
    summary: {
      total: records.length,
      newRows,
      potentialEmailMatches,
      alreadyExists: count("already_exists"),
      csvDuplicates: count("csv_duplicate"),
      invalid: count("invalid"),
      existingNotInCsv: existingNotInCsv.length,
      importable: newRows + potentialEmailMatches,
    },
  };
}
