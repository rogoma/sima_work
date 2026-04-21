const router = require("express").Router();
const pool = require("../db/pool");
const auth = require("../middlewares/auth");
const { puedeAccederLocalidad } = require("../middlewares/roles");

// ─── GET /api/localidades ──────────────────────────────────────────────────────
router.get("/", auth, async (req, res) => {
  const usuario = req.usuario;

  let where = "";
  const params = [];

  if (usuario.localidades?.length) {
    where = `WHERE l.id = ANY($1)`;
    params.push(usuario.localidades);
  }

  const { rows } = await pool.query(
    `SELECT
       l.id, l.nombre, l.previstas, l.conectados AS conectados_base, l.adecuaciones AS adecuaciones_base, l.ci,
       COUNT(r.id) FILTER (WHERE r.estado='validado' AND r.tipo='conectado')  AS nuevos_conectados,
       COUNT(r.id) FILTER (WHERE r.estado='validado' AND r.tipo='adecuacion') AS nuevas_adecuaciones,
       COUNT(r.id) FILTER (WHERE r.estado='pendiente')                        AS pendientes
     FROM localidades l
     LEFT JOIN registros r ON r.localidad_id = l.id
     ${where}
     GROUP BY l.id
     ORDER BY l.nombre`,
    params
  );

  const result = rows.map((loc) => ({
    ...loc,
    conectados_total: Number(loc.conectados_base) + Number(loc.nuevos_conectados),
    adecuaciones_total: Number(loc.adecuaciones_base) + Number(loc.nuevas_adecuaciones),
    pendientes: Number(loc.pendientes),
    avance_pct: loc.previstas
      ? Math.min(100, Math.round(((Number(loc.conectados_base) + Number(loc.nuevos_conectados)) / loc.previstas) * 100))
      : 0,
    brecha: loc.previstas - (Number(loc.conectados_base) + Number(loc.nuevos_conectados)),
  }));

  res.json(result);
});

// ─── GET /api/localidades/dashboard ───────────────────────────────────────────
router.get("/dashboard", auth, async (req, res) => {
  const { rows: totales } = await pool.query(
    `SELECT
       SUM(l.conectados) AS conectados_base,
       SUM(l.adecuaciones) AS adecuaciones_base,
       SUM(l.previstas) AS previstas_total,
       COUNT(r.id) FILTER (WHERE r.estado='validado' AND r.tipo='conectado')  AS nuevos_conectados,
       COUNT(r.id) FILTER (WHERE r.estado='validado' AND r.tipo='adecuacion') AS nuevas_adecuaciones,
       COUNT(r.id) FILTER (WHERE r.estado='pendiente')                        AS pendientes
     FROM localidades l
     LEFT JOIN registros r ON r.localidad_id = l.id`
  );

  const t = totales[0];
  const conectados = Number(t.conectados_base) + Number(t.nuevos_conectados);
  const adecuaciones = Number(t.adecuaciones_base) + Number(t.nuevas_adecuaciones);
  const previstas = Number(t.previstas_total);

  res.json({
    conectados_total: conectados,
    adecuaciones_total: adecuaciones,
    previstas_total: previstas,
    pendientes: Number(t.pendientes),
    avance_pct: previstas ? Math.min(100, Math.round((conectados / previstas) * 100)) : 0,
    brecha: previstas - conectados,
  });
});

// ─── GET /api/localidades/:id ──────────────────────────────────────────────────
router.get("/:id", auth, async (req, res) => {
  const locId = Number(req.params.id);

  if (!puedeAccederLocalidad(req.usuario, locId)) {
    return res.status(403).json({ error: "Sin acceso a esta localidad." });
  }

  const { rows } = await pool.query(
    `SELECT
       l.id, l.nombre, l.previstas, l.conectados AS conectados_base, l.adecuaciones AS adecuaciones_base, l.ci,
       COUNT(r.id) FILTER (WHERE r.estado='validado' AND r.tipo='conectado')  AS nuevos_conectados,
       COUNT(r.id) FILTER (WHERE r.estado='validado' AND r.tipo='adecuacion') AS nuevas_adecuaciones,
       COUNT(r.id) FILTER (WHERE r.estado='pendiente')                        AS pendientes
     FROM localidades l
     LEFT JOIN registros r ON r.localidad_id = l.id
     WHERE l.id = $1
     GROUP BY l.id`,
    [locId]
  );

  if (!rows.length) return res.status(404).json({ error: "Localidad no encontrada." });

  const loc = rows[0];

  // Proyecciones ICARO - ahora con JOIN a modalidades
  const { rows: proyecciones } = await pool.query(
    `SELECT ip.cantidad, m.nombre AS modalidad
     FROM icaro_proyecciones ip
     JOIN modalidades m ON m.id = ip.modalidad_id
     WHERE ip.localidad_id = $1
     ORDER BY ip.cantidad DESC`,
    [locId]
  );

  res.json({
    ...loc,
    conectados_total: Number(loc.conectados_base) + Number(loc.nuevos_conectados),
    adecuaciones_total: Number(loc.adecuaciones_base) + Number(loc.nuevas_adecuaciones),
    pendientes: Number(loc.pendientes),
    avance_pct: loc.previstas
      ? Math.min(100, Math.round(((Number(loc.conectados_base) + Number(loc.nuevos_conectados)) / loc.previstas) * 100))
      : 0,
    brecha: loc.previstas - (Number(loc.conectados_base) + Number(loc.nuevos_conectados)),
    proyecciones_icaro: proyecciones,
  });
});

module.exports = router;
