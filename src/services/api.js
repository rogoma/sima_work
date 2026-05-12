// ─── Servicio de comunicación con la API ─────────────────────────────────────
// Gracias al proxy de Vite, usamos rutas relativas (/api/...)
// En producción, cambiar a la URL del servidor

const API = "/api";

export async function apiFetch(path, options = {}) {
  const { skipAuthRedirect = false, ...fetchOptions } = options;
  const token = localStorage.getItem("simsas_token");
  const headers = { "Content-Type": "application/json", ...fetchOptions.headers };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API}${path}`, { ...fetchOptions, headers });

  if (res.status === 401 && !skipAuthRedirect) {
    localStorage.removeItem("simsas_token");
    localStorage.removeItem("simsas_usuario");
    window.location.reload();
    return null;
  }

  let data;
  try { data = await res.json(); } catch { data = {}; }
  if (!res.ok) throw { status: res.status, error: data.error || `Error ${res.status}`, ...data };
  return data;
}

// ─── AUTH ────────────────────────────────────────────────────────────────────

export async function login(user, password) {
  const data = await apiFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify({ user, password }),
    skipAuthRedirect: true,
  });
  localStorage.setItem("simsas_token", data.token);
  localStorage.setItem("simsas_usuario", JSON.stringify(data.usuario));
  return data.usuario;
}

export function logout() {
  localStorage.removeItem("simsas_token");
  localStorage.removeItem("simsas_usuario");
}

export async function cambiarPassword(actual, nueva) {
  return apiFetch("/usuarios/me/password", {
    method: "PUT",
    body: JSON.stringify({ actual, nueva }),
  });
}

export function getUsuarioGuardado() {
  const saved = localStorage.getItem("simsas_usuario");
  return saved ? JSON.parse(saved) : null;
}

// ─── LOCALIDADES ─────────────────────────────────────────────────────────────

export function fetchLocalidades() {
  return apiFetch("/localidades");
}

export function fetchLocalidad(id) {
  return apiFetch(`/localidades/${id}`);
}

export function fetchDashboard() {
  return apiFetch("/localidades/dashboard");
}

// ─── REGISTROS ───────────────────────────────────────────────────────────────

export function fetchRegistros(params = {}) {
  const query = new URLSearchParams({ limit: "500", ...params }).toString();
  return apiFetch(`/registros?${query}`);
}

export function fetchRegistro(id) {
  return apiFetch(`/registros/${id}`);
}

export function crearRegistro(data) {
  return apiFetch("/registros", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function corregirRegistro(id, data) {
  return apiFetch(`/registros/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function validarRegistro(id, comentario) {
  return apiFetch(`/registros/${id}/validar`, {
    method: "PATCH",
    body: JSON.stringify({ comentario }),
  });
}

export function rechazarRegistro(id, comentario) {
  return apiFetch(`/registros/${id}/rechazar`, {
    method: "PATCH",
    body: JSON.stringify({ comentario }),
  });
}

// ─── EVIDENCIA ───────────────────────────────────────────────────────────────

export async function subirEvidencia(file) {
  const token = localStorage.getItem("simsas_token");
  const formData = new FormData();
  formData.append("archivo", file);
  const res = await fetch(`${API}/evidencia/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw { status: res.status, ...data };
  return data;
}

// ─── USUARIOS ────────────────────────────────────────────────────────────────

export function fetchUsuarios() {
  return apiFetch("/usuarios");
}

export function fetchRoles() {
  return apiFetch("/usuarios/roles");
}

export function crearUsuario(data) {
  return apiFetch("/usuarios", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function desactivarUsuario(id) {
  return apiFetch(`/usuarios/${id}`, { method: "DELETE" });
}

export function editarUsuario(id, data) {
  return apiFetch(`/usuarios/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function eliminarUsuarioDefinitivo(id) {
  return apiFetch(`/usuarios/${id}/eliminar`, { method: "DELETE" });
}

// ─── ROLES ───────────────────────────────────────────────────────────────────

export function fetchRolesAdmin() {
  return apiFetch("/roles");
}

export function crearRol(data) {
  return apiFetch("/roles", { method: "POST", body: JSON.stringify(data) });
}

export function editarRol(id, data) {
  return apiFetch(`/roles/${id}`, { method: "PUT", body: JSON.stringify(data) });
}

export function eliminarRol(id) {
  return apiFetch(`/roles/${id}`, { method: "DELETE" });
}

// ─── MODALIDADES ─────────────────────────────────────────────────────────────

export function fetchModalidades() {
  return apiFetch("/usuarios/modalidades/lista");
}

export function fetchTodasModalidades() {
  return apiFetch("/modalidades");
}

export function fetchTiposModalidad() {
  return apiFetch("/modalidades/tipos");
}

export function fetchEstadosModalidad() {
  return apiFetch("/modalidades/estados");
}

export function crearModalidad(data) {
  return apiFetch("/modalidades", { method: "POST", body: JSON.stringify(data) });
}

export function editarModalidad(id, data) {
  return apiFetch(`/modalidades/${id}`, { method: "PUT", body: JSON.stringify(data) });
}

export function eliminarModalidad(id) {
  return apiFetch(`/modalidades/${id}`, { method: "DELETE" });
}
