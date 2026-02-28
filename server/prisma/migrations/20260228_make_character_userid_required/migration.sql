-- Make Character.userId NOT NULL
-- Precondition: all Character rows must have a non-null userId (backfill migration should have populated these)

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Character" WHERE "userId" IS NULL) THEN
    RAISE EXCEPTION 'Cannot make Character.userId NOT NULL: some rows still have NULL userId. Run backfill before applying this migration.';
  END IF;
END$$;

ALTER TABLE "Character"
ALTER COLUMN "userId" SET NOT NULL;

-- Ensure foreign key constraint exists (should already exist from relation)
-- If constraint doesn't exist in your DB, add it here. Typical FK is already present.
