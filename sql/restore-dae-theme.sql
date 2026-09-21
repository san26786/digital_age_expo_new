-- ===========================================================================
--  RESTORE DIGITAL AGE EXPO (site 150) TO ITS SHIPPED PALETTE
-- ===========================================================================
--
--  Why this file exists.
--
--  Nothing read the CP's `cp_theme_*` rows until the Hub's theme wiring went in. The rows had
--  been sitting in find_settings for some time, unread, so nobody had reason to notice that
--  site 150's secondary colour had been saved as a near-black zinc grey rather than the brand
--  purple. The moment the site started honouring those rows, that grey went live: the header
--  gradient stopped being purple -> pink and became grey -> pink, and every surface derived from
--  the background went with it.
--
--  The shipped palette in src/app/globals.css is the original and is unchanged. So the fix is to
--  stop overriding it. Deleting the rows is better than correcting them: an absent row means
--  "use the design's own colour", which stays true if the design's colour is ever revised, while
--  a row holding #4B0082 would silently pin site 150 to today's value forever.
--
--  Run STEP 1 first and keep the output. If you would rather keep any of these, drop them from
--  the IN list in step 2.

-- STEP 1 — what site 150 currently overrides.
SELECT varname, value
FROM find_settings
WHERE "DOMAIN" = 150
  AND varname IN (
    'cp_theme_primary_color',
    'cp_theme_secondary_color',
    'cp_theme_background_color',
    'cp_theme_surface_alt_color',
    'cp_theme_card_color',
    'cp_theme_navbar_color',
    'cp_theme_footer_color'
  )
ORDER BY varname;

-- STEP 2 — hand the site back to the shipped palette.
DELETE FROM find_settings
WHERE "DOMAIN" = 150
  AND varname IN (
    'cp_theme_primary_color',
    'cp_theme_secondary_color',
    'cp_theme_background_color',
    'cp_theme_surface_alt_color',
    'cp_theme_card_color',
    'cp_theme_navbar_color',
    'cp_theme_footer_color'
  );

-- ===========================================================================
--  IF YOU WOULD RATHER SET THEM EXPLICITLY THAN CLEAR THEM
-- ===========================================================================
--
--  These are the exact values globals.css ships, so typing them into
--  /hub/sites/150/edit -> Theme colours produces the same result as deleting the rows:
--
--      Primary            #C71585
--      Secondary          #4B0082
--      Page background    #05030A
--      Alternate section  #0C0618   (leave blank - derives to #0C0718)
--      Cards & panels     #0A0514   (leave blank - derives to #0A0614)
--      Navbar             #0A0514   (leave blank - follows cards)
--      Footer             #03010A   (leave blank - derives to #030206)
--
--  The four optional ones are worth leaving blank. Derived, they track the background if it is
--  ever changed; pinned, they do not.
