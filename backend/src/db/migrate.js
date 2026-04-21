const fs = require("fs");
const path = require("path");
const pool = require("./pool");

async function migrate() {
  const sql = fs.readFileSync(
    path.join(__dirname, "migrations", "001_init.sql"),
    "utf8"
  );
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("COMMIT");
    console.log("✅ Migración aplicada correctamente.");
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
