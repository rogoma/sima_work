function requireRol(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.usuario.rol)) {
      return res.status(403).json({ error: "Sin permisos para esta acción." });
    }
    next();
  };
}

function puedeAccederLocalidad(usuario, localidadId) {
  if (!usuario.localidades || !usuario.localidades.length) return true;
  // Comparar como números ya que ahora son integers
  return usuario.localidades.includes(Number(localidadId));
}

module.exports = { requireRol, puedeAccederLocalidad };
