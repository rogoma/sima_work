const router = require("express").Router();
const pool = require("../db/pool");
const auth = require("../middlewares/auth");
const { puedeAccederLocalidad } = require("../middlewares/roles");

// localidad_tiporegistro: tiporegistro_id 0=Previstas, 1=Conectados
// estados:                4=Validado, 5=Pendiente

function mapearLocalidad(loc) {
  const previstas  = Number(loc.previstas);
  const conectados = Number(loc.conectados);
  return {
    ...loc,
    previstas,
    conectados_total:   conectados,
    adecuaciones_total: 0,
    pendientes:         Number(loc.pendientes),
    avance_pct: previstas
      ? parseFloat(((conectados / previstas) * 100).toFixed(2))
      : 0,
    brecha: previstas - conectados,
  };
}

// ─── GET /api/localidades ──────────────────────────────────────────────────────
router.get("/", auth, async (req, res) => {
  const usuario = req.usuario;
  const params = [];
  let where = "";

  if (usuario.localidades?.length) {
    where = `WHERE l.id = ANY($${params.push(usuario.localidades)})`;
  }

  const { rows } = await pool.query(
    `SELECT
       l.id, l.nombre,
       COALESCE(SUM(lt.cantidad) FILTER (WHERE lt.tiporegistro_id = 0), 0) AS previstas,
       COALESCE(SUM(lt.cantidad) FILTER (WHERE lt.tiporegistro_id = 1), 0) AS conectados,
       (SELECT COUNT(*) FROM registros r WHERE r.localidad_id = l.id AND r.estado_id = 5) AS pendientes
     FROM localidades l
     LEFT JOIN localidad_tiporegistro lt ON lt.localidad_id = l.id
     ${where}
     GROUP BY l.id
     ORDER BY l.nombre`,
    params
  );

  res.json(rows.map(mapearLocalidad));
});

// ─── GET /api/localidades/dashboard ───────────────────────────────────────────
router.get("/dashboard", auth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT
       (SELECT COALESCE(SUM(cantidad), 0) FROM localidad_tiporegistro WHERE tiporegistro_id = 0) AS meta,
       (SELECT COUNT(*) FROM registros WHERE estado_id = 4)                                       AS conectados,
       (SELECT COUNT(*) FROM registros WHERE estado_id = 5)                                       AS pendientes`
  );

  const t = rows[0];
  const meta       = Number(t.meta);
  const conectados = Number(t.conectados);
  const pendientes = Number(t.pendientes);

  res.json({
    meta,
    conectados_total: conectados,
    pendientes,
    avance_pct: meta ? parseFloat(((conectados / meta) * 100).toFixed(2)) : 0,
    brecha: meta - conectados,
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
       l.id, l.nombre,
       COALESCE(SUM(lt.cantidad) FILTER (WHERE lt.tiporegistro_id = 0), 0) AS previstas,
       COALESCE(SUM(lt.cantidad) FILTER (WHERE lt.tiporegistro_id = 1), 0) AS conectados,
       (SELECT COUNT(*) FROM registros r WHERE r.localidad_id = l.id AND r.estado_id = 5) AS pendientes
     FROM localidades l
     LEFT JOIN localidad_tiporegistro lt ON lt.localidad_id = l.id
     WHERE l.id = $1
     GROUP BY l.id`,
    [locId]
  );

  if (!rows.length) return res.status(404).json({ error: "Localidad no encontrada." });

  const { rows: proyecciones } = await pool.query(
    `SELECT ip.cantidad, m.nombre AS modalidad
     FROM icaro_proyecciones ip
     JOIN modalidades m ON m.id = ip.modalidad_id
     WHERE ip.localidad_id = $1
     ORDER BY ip.cantidad DESC`,
    [locId]
  );

  res.json({ ...mapearLocalidad(rows[0]), proyecciones_icaro: proyecciones });
});

module.exports = router;
