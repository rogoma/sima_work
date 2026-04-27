const router = require("express").Router();
const pool = require("../db/pool");
const auth = require("../middlewares/auth");
const { puedeAccederLocalidad } = require("../middlewares/roles");

// tipo_conexiones: 1=Previstas, 2=Conectados, 3=Adecuaciones
// estados:        4=Validado,  5=Pendiente
// tipo_registro:  1=Conectado, 2=Adecuación

function mapearLocalidad(loc) {
  const previstas       = Number(loc.previstas);
  const conectados_base = Number(loc.conectados_base);
  const adec_base       = Number(loc.adecuaciones_base);
  const nuevos_con      = Number(loc.nuevos_conectados);
  const nuevas_adec     = Number(loc.nuevas_adecuaciones);
  return {
    ...loc,
    previstas,
    conectados_total:    conectados_base + nuevos_con,
    adecuaciones_total:  adec_base + nuevas_adec,
    pendientes:          Number(loc.pendientes),
    avance_pct: previstas
      ? Math.min(100, Math.round(((conectados_base + nuevos_con) / previstas) * 100))
      : 0,
    brecha: previstas - (conectados_base + nuevos_con),
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
       COALESCE(SUM(lt.cantidad) FILTER (WHERE lt.tipoconex_id = 1), 0) AS previstas,
       COALESCE(SUM(lt.cantidad) FILTER (WHERE lt.tipoconex_id = 2), 0) AS conectados_base,
       COALESCE(SUM(lt.cantidad) FILTER (WHERE lt.tipoconex_id = 3), 0) AS adecuaciones_base,
       COUNT(r.id) FILTER (WHERE r.estado_id = 4 AND r.tipo_registro_id = 1) AS nuevos_conectados,
       COUNT(r.id) FILTER (WHERE r.estado_id = 4 AND r.tipo_registro_id = 2) AS nuevas_adecuaciones,
       COUNT(r.id) FILTER (WHERE r.estado_id = 5)                            AS pendientes
     FROM localidades l
     LEFT JOIN localidad_tipoconex lt ON lt.localidad_id = l.id
     LEFT JOIN registros r ON r.localidad_id = l.id
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
       COALESCE(SUM(lt.cantidad) FILTER (WHERE lt.tipoconex_id = 2), 0) AS conectados_base,
       COALESCE(SUM(lt.cantidad) FILTER (WHERE lt.tipoconex_id = 3), 0) AS adecuaciones_base,
       COALESCE(SUM(lt.cantidad) FILTER (WHERE lt.tipoconex_id = 1), 0) AS previstas_total,
       COUNT(r.id) FILTER (WHERE r.estado_id = 4 AND r.tipo_registro_id = 1) AS nuevos_conectados,
       COUNT(r.id) FILTER (WHERE r.estado_id = 4 AND r.tipo_registro_id = 2) AS nuevas_adecuaciones,
       COUNT(r.id) FILTER (WHERE r.estado_id = 5)                            AS pendientes
     FROM localidades l
     LEFT JOIN localidad_tipoconex lt ON lt.localidad_id = l.id
     LEFT JOIN registros r ON r.localidad_id = l.id`
  );

  const t = rows[0];
  const conectados  = Number(t.conectados_base) + Number(t.nuevos_conectados);
  const adecuaciones = Number(t.adecuaciones_base) + Number(t.nuevas_adecuaciones);
  const previstas   = Number(t.previstas_total);

  res.json({
    conectados_total:    conectados,
    adecuaciones_total:  adecuaciones,
    previstas_total:     previstas,
    pendientes:          Number(t.pendientes),
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
       l.id, l.nombre,
       COALESCE(SUM(lt.cantidad) FILTER (WHERE lt.tipoconex_id = 1), 0) AS previstas,
       COALESCE(SUM(lt.cantidad) FILTER (WHERE lt.tipoconex_id = 2), 0) AS conectados_base,
       COALESCE(SUM(lt.cantidad) FILTER (WHERE lt.tipoconex_id = 3), 0) AS adecuaciones_base,
       COUNT(r.id) FILTER (WHERE r.estado_id = 4 AND r.tipo_registro_id = 1) AS nuevos_conectados,
       COUNT(r.id) FILTER (WHERE r.estado_id = 4 AND r.tipo_registro_id = 2) AS nuevas_adecuaciones,
       COUNT(r.id) FILTER (WHERE r.estado_id = 5)                            AS pendientes
     FROM localidades l
     LEFT JOIN localidad_tipoconex lt ON lt.localidad_id = l.id
     LEFT JOIN registros r ON r.localidad_id = l.id
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
