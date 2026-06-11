require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") });
const fs = require("fs");
const path = require("path");
const pool = require("./pool");

async function migrate() {
  const sql = fs.readFileSync(
    path.join(__dirname, "migrations", "003_add_cat_to_modalidades.sql"),
    "utf8"
  );
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("COMMIT");
    console.log("✅ Migración 003 aplicada: columna cat agregada a modalidades.");
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
