-- Backfill character.userId from party ownership
-- This migration updates Character.userId when the character appears in parties
-- owned by a single user. Conflicting cases (character in parties with multiple
-- different owners) are left unchanged (userId remains NULL) for manual review.

-- Run backfill in a DO block and swallow errors so migration doesn't abort
DO $$
BEGIN
  -- Update characters that appear in parties owned by exactly one distinct user
  WITH owner_map AS (
    SELECT pc."characterId" AS cid, p."userId" AS uid
    FROM "PartyCharacter" pc
    JOIN "Party" p ON pc."partyId" = p.id
  ), updates AS (
    SELECT d.cid, d.uids[1] AS uid
    FROM (
      SELECT cid, array_agg(DISTINCT uid) AS uids
      FROM owner_map
      GROUP BY cid
    ) d
    WHERE array_length(d.uids, 1) = 1
  )
  UPDATE "Character" c
  SET "userId" = u.uid
  FROM updates u
  WHERE c.id = u.cid AND c."userId" IS NULL;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'Backfill migration skipped due to error: %', SQLERRM;
END$$;

-- Note: this migration assumes table names are quoted as shown.
-- If your DB uses a different casing strategy, adjust identifiers.
