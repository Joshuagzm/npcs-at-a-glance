-- Add appearance descriptors to NPCs. These persist and feed the portrait
-- prompt. Idempotent.

ALTER TABLE npc.npcs
  ADD COLUMN IF NOT EXISTS race text,
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS age text,
  ADD COLUMN IF NOT EXISTS skin_color text,
  ADD COLUMN IF NOT EXISTS appearance_details text;
