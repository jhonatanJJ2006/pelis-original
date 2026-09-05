-- Concurrent session/device limit per plan (MVP).
ALTER TABLE "plan" ADD COLUMN "maxDevices" INTEGER NOT NULL DEFAULT 1;

-- Seed / live plan name heuristics (Mensual|Básico=1, Trimestral|Estándar=2, Anual|Premium=4).
UPDATE "plan" SET "maxDevices" = CASE
  WHEN name ILIKE '%Anual%' OR name ILIKE '%Premium%' THEN 4
  WHEN name ILIKE '%Trimestral%' OR name ILIKE '%Estándar%' OR name ILIKE '%Estandar%' THEN 2
  WHEN name ILIKE '%Mensual%' OR name ILIKE '%Básico%' OR name ILIKE '%Basico%' THEN 1
  ELSE 1
END;
