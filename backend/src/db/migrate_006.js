require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") });
const pool = require("./pool");

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`
      ALTER TABLE profesionales
        ADD COLUMN IF NOT EXISTS estado_id  INTEGER      NOT NULL DEFAULT 1,
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ  DEFAULT NOW()
    `);
    await client.query("COMMIT");
    console.log("✅ Migración 006: columnas estado_id y created_at agregadas a profesionales.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Error en migración:", err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
