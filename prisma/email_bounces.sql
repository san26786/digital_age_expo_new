-- ===========================================================================
--  BOUNCE RECORDS  (run once, against the app's database)
-- ===========================================================================
--
--  Raw SQL rather than a Prisma model, deliberately. Adding a model to schema.prisma would mean
--  `npx prisma generate` before the code even compiles, and this codebase already reaches
--  find_settings the same way for the same reason. One statement to run, nothing to regenerate.
--
--  WHAT A ROW MEANS: at <detected_on>, sending to <email> for site <DOMAIN> failed in a way the
--  mail server described as <reason>. `hard` means the address is wrong and always will be —
--  unknown mailbox, bad domain — and the app stops sending to it. `soft` means it failed this
--  time — full mailbox, greylisting, a server having a moment — and blocks nothing.
--
--  SCOPED PER SITE. A mailbox that rejects mail from Digital Age Expo's sender may accept it from
--  B2B Growth Expo's, because they are different senders on different IPs with different
--  reputations. Suppressing one site's bad address across every site would be guessing.

CREATE TABLE IF NOT EXISTS find_email_bounces (
  id                BIGSERIAL PRIMARY KEY,
  "DOMAIN"          integer      NOT NULL,
  email             varchar(765) NOT NULL,
  bounce_type       varchar(16)  NOT NULL,
  reason            text,
  email_template_id varchar(255),
  detected_on       timestamp(0) NOT NULL DEFAULT now()
);

-- Suppression asks "has this address hard-bounced for this site?" on every send, so it is the
-- lookup that must not become a scan.
CREATE INDEX IF NOT EXISTS find_email_bounces_lookup
  ON find_email_bounces ("DOMAIN", bounce_type, lower(email));

CREATE INDEX IF NOT EXISTS find_email_bounces_recent
  ON find_email_bounces ("DOMAIN", detected_on DESC);
