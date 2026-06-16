-- Store the seed each NPC's portrait was generated with, so regenerations
-- can reuse it and stay visually consistent. Idempotent.

ALTER TABLE npc.npcs ADD COLUMN IF NOT EXISTS portrait_seed bigint;
