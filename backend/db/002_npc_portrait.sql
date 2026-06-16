-- Add a column to store the generated NPC portrait (base64-encoded PNG).
-- Idempotent.

ALTER TABLE npc.npcs ADD COLUMN IF NOT EXISTS portrait text;
