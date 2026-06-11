-- Agrega columna cat a modalidades si no existe (columna definida en el esquema inicial pero ausente en la DB)
ALTER TABLE modalidades ADD COLUMN IF NOT EXISTS cat VARCHAR(20) NOT NULL DEFAULT '';
