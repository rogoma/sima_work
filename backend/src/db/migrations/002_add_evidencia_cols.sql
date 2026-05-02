-- Agrega columnas para evidencias adicionales en la tabla registros
ALTER TABLE registros
  ADD COLUMN IF NOT EXISTS evidencia_url_2 VARCHAR(500),
  ADD COLUMN IF NOT EXISTS evidencia_url_3 VARCHAR(500);
