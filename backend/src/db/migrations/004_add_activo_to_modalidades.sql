-- Agrega columna activo a modalidades si no existe (definida en el esquema inicial pero ausente en la DB)
ALTER TABLE modalidades ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT TRUE;
