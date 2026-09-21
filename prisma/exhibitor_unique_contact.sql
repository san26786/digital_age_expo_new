-- ===========================================================================
--  ONE CONTACT PER BUSINESS + EMAIL, PER EVENT
-- ===========================================================================
--
--  ---------------------------------------------------------------------------
--  READ THIS FIRST — THIS INDEX AND THE IMPORT'S "ADD ANYWAY" CONTRADICT EACH OTHER
--  ---------------------------------------------------------------------------
--
--  The import screen lets an organiser tick an "already exists" row and add it as a second contact
--  on purpose. This index forbids exactly that. Both behaviours are wanted for different reasons
--  and they cannot both win, so decide which matters more here:
--
--    DO NOT create this index if "add anyway" must work. The application still classifies every
--    row twice and still refuses an unticked exact match, so ordinary duplicates are prevented.
--    What you give up is protection against two imports landing in the same millisecond — rare,
--    and it produces a duplicate rather than corrupt data.
--
--    DO create it if the list must be provably free of duplicate contacts. "Add anyway" then fails
--    for genuine exact matches; the import reports the row as "already exists" with a message
--    naming the index, so nothing is lost silently and nobody is left guessing.
--
--  There is no third option that keeps both. A constraint that an override can bypass is not a
--  constraint.
--
--  The import classifies every row against the event before inserting, and classifies them a
--  second time at the moment of writing. That closes the minutes between the preview and the
--  confirm. It cannot close the milliseconds between two concurrent inserts: both read, both see
--  nothing, both write. No amount of application code fixes a read-then-write race; only the
--  database can, and this is how.
--
--  WHY THE KEY IS THE PAIR
--
--  find_event_exhibitor stores a CONTACT — first_name, last_name, email, position, phone — with
--  `business` as an attribute. One exhibiting company therefore has several legitimate rows: the
--  MD, the stand manager, the marketing lead. A unique index on business alone would reject every
--  colleague after the first. Email alone would reject one person representing two companies,
--  which is the exact bug this work set out to fix.
--
--  WHY IT IS PARTIAL
--
--  Historic rows have a blank or NULL business or email, and several of them. Indexing those would
--  fail to build against the data that is already there, so rows missing either half are left
--  outside the index: unconstrained, exactly as they are today, and untouched by the import, which
--  rejects a row with no email through the same schema the Add Exhibitor form uses.
--
--  WHY lower()
--
--  The matcher compares case-insensitively. An index that did not would let "ABC Ltd"/"info@abc.com"
--  and "abc ltd"/"INFO@ABC.COM" both land, which is the duplicate the whole exercise is about.
--  Whitespace inside a business name is NOT collapsed here — Postgres cannot index a regexp cheaply
--  — so "ABC  Ltd" with a double space still slips past the index. The application matcher does
--  collapse it, so that case is caught in the normal path; the index is the last line, not the only
--  one.
--
--  HOW TO RUN IT
--
--  CONCURRENTLY does not run inside a transaction block, so run this file statement by statement
--  in psql or the Neon SQL editor, NOT wrapped in BEGIN/COMMIT. It takes no write lock on the
--  table, so it is safe on a live event.
--
--  IF IT FAILS with "could not create unique index", the table already holds duplicates. Find them
--  with the SELECT at the bottom, merge or delete by hand, then run the CREATE again. A failed
--  CONCURRENTLY build leaves an INVALID index behind — drop it first with the DROP below.

-- 1. Remove a previous failed attempt, if there is one.
DROP INDEX CONCURRENTLY IF EXISTS find_event_exhibitor_uniq_contact;

-- 2. The index.
CREATE UNIQUE INDEX CONCURRENTLY find_event_exhibitor_uniq_contact
  ON find_event_exhibitor (event_id, lower(business), lower(email))
  WHERE email IS NOT NULL
    AND email <> ''
    AND business IS NOT NULL
    AND business <> '';

-- 3. Run this FIRST if step 2 fails: the rows that are already duplicated.
--
-- SELECT event_id,
--        lower(business) AS business,
--        lower(email)    AS email,
--        count(*)        AS copies,
--        array_agg(id ORDER BY id) AS ids
--   FROM find_event_exhibitor
--  WHERE email IS NOT NULL AND email <> ''
--    AND business IS NOT NULL AND business <> ''
--  GROUP BY 1, 2, 3
-- HAVING count(*) > 1
--  ORDER BY copies DESC, event_id;
