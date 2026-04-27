const jwt = require("jsonwebtoken");
const pool = require("../db/pool");

module.exports = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token no proporcionado." });
  }

  let decoded;
  try {
    decoded = jwt.verify(header.split(" ")[1], process.env.JWT_SECRET);
  } catch (e) {
    return res.status(401).json({ error: "Token inválido o expirado." });
  }

  const { rows } = await pool.query(
    `SELECT u.id, u."user", u.nombre, r.nombre AS rol, u.rol_id, u.password_hash, u.estado_id,
            array_agg(ul.localidad_id) FILTER (WHERE ul.localidad_id IS NOT NULL) AS localidades
     FROM usuarios u
     LEFT JOIN roles r ON r.id = u.rol_id
     LEFT JOIN usuario_localidades ul ON ul.usuario_id = u.id
     WHERE u.id = $1
     GROUP BY u.id, r.nombre`,
    [decoded.id]
  );
  if (!rows.length) return res.status(401).json({ error: "Usuario no encontrado." });
  if (rows[0].estado_id === 2 || rows[0].estado_id === 6) return res.status(401).json({ error: "Usuario inactivo." });
  req.usuario = rows[0];
  next();
};
