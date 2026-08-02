-- Strike kind: pending (?) vs definitive (X)
ALTER TABLE "directory_strikes" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'pending';

UPDATE "directory_strikes"
SET "kind" = 'definitive'
WHERE trim("reason") IN ('X', 'x');

UPDATE "directory_strikes"
SET "kind" = 'definitive'
WHERE trim("reason") NOT IN ('?', 'X', 'x', '') AND "reason" IS NOT NULL;

UPDATE "directory_strikes"
SET "reason" = ''
WHERE trim("reason") IN ('?', 'X', 'x');

ALTER TABLE "directory_strikes" ALTER COLUMN "reason" SET DEFAULT '';
