import React, { useState, useEffect } from "react";
import { C } from "../styles/colors";
import { fetchUsuarios, fetchRoles, crearUsuario as apiCrearUsuario, editarUsuario as apiEditarUsuario, eliminarUsuarioDefinitivo, fetchTodasModalidades, crearModalidad as apiCrearModalidad, editarModalidad as apiEditarModalidad, eliminarModalidad as apiEliminarModalidad } from "../services/api";
import { RolBadge, CatBadge } from "../components/Badges";
import { Loading } from "../components/DataDisplay";
import { Campo, Input, Select } from "../components/FormFields";

const fmt = n => String(Math.round(Number(n))).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

// Mapeo rol_id → nombre para el badge
const ROL_MAP = { 1: "contratista", 2: "coordinador", 3: "equipo", 4: "junta" };

export default function VistaAdmin({ localidades, modalidades }) {
  const [tab, setTab] = useState("usuarios");
  const [usuarios, setUsuarios] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [nuevoU, setNuevoU] = useState({ user: "", nombre: "", rol_id: "", localidades: [], password: "" });
  const setN = (k, v) => setNuevoU((n) => ({ ...n, [k]: v }));
  const [editandoU, setEditandoU] = useState(null);
  const setE = (k, v) => setEditandoU((n) => ({ ...n, [k]: v }));

  // ── Modalidades ABM ──────────────────────────────────────────────────────────
  const CATS = ["JUNTA", "CONTRATISTA", "ICARO"];
  const TODOS_ROLES = [{ id: 1, nombre: "contratista" }, { id: 2, nombre: "coordinador" }, { id: 3, nombre: "equipo" }, { id: 4, nombre: "junta" }];
  const [modalidadesAdmin, setModalidadesAdmin] = useState(
    () => (modalidades || []).map((m) => ({ ...m, activo: true }))
  );
  const [loadingMod, setLoadingMod] = useState(false);
  const [showNewMod, setShowNewMod] = useState(false);
  const [nuevaMod, setNuevaMod] = useState({ nombre: "", cat: "ICARO", roles: [] });
  const setNM = (k, v) => setNuevaMod((n) => ({ ...n, [k]: v }));
  const [editandoMod, setEditandoMod] = useState(null);
  const setEM = (k, v) => setEditandoMod((n) => ({ ...n, [k]: v }));

  useEffect(() => {
    Promise.all([fetchUsuarios(), fetchRoles()])
      .then(([u, r]) => { setUsuarios(u); setRoles(r); if (r.length) setNuevoU(n => ({ ...n, rol_id: r[0].id })); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (tab !== "estrategias") return;
    setLoadingMod(true);
    fetchTodasModalidades()
      .then((data) => { if (data?.length) setModalidadesAdmin(data); })
      .catch(() => {})
      .finally(() => setLoadingMod(false));
  }, [tab]);

  const crearMod = async () => {
    if (!nuevaMod.nombre || !nuevaMod.roles.length) return;
    try {
      const created = await apiCrearModalidad(nuevaMod);
      setModalidadesAdmin((m) => [...m, created].sort((a, b) => a.cat.localeCompare(b.cat) || a.nombre.localeCompare(b.nombre)));
      setShowNewMod(false); setNuevaMod({ nombre: "", cat: "ICARO", roles: [] });
    } catch (e) { alert(e.error || "Error al crear modalidad"); }
  };

  const abrirEdicionMod = (m) => {
    setShowNewMod(false);
    setEditandoMod({ id: m.id, nombre: m.nombre, cat: m.cat, roles: m.roles || [] });
  };

  const guardarMod = async () => {
    if (!editandoMod.nombre || !editandoMod.roles.length) return;
    try {
      const updated = await apiEditarModalidad(editandoMod.id, { nombre: editandoMod.nombre, cat: editandoMod.cat, roles: editandoMod.roles });
      setModalidadesAdmin((m) => m.map((x) => x.id === editandoMod.id ? updated : x));
      setEditandoMod(null);
    } catch (e) { alert(e.error || "Error al editar modalidad"); }
  };

  const desactivarMod = async (id) => {
    if (!window.confirm("¿Desactivar esta modalidad?")) return;
    try {
      await apiEliminarModalidad(id);
      setModalidadesAdmin((m) => m.map((x) => x.id === id ? { ...x, activo: false } : x));
    } catch (e) { alert(e.error || "Error al desactivar modalidad"); }
  };

  const eliminarMod = async (id) => {
    if (!window.confirm("¿Eliminar esta modalidad definitivamente?")) return;
    try {
      await apiEliminarModalidad(id);
      setModalidadesAdmin((m) => m.filter((x) => x.id !== id));
    } catch (e) { alert(e.error || "Error al eliminar modalidad"); }
  };

  const crearUsuario = async () => {
    if (!nuevoU.user || !nuevoU.nombre || !nuevoU.password) return;
    try {
      const created = await apiCrearUsuario(nuevoU);
      setUsuarios((u) => [...u, created]);
      setShowNew(false); setNuevoU({ user: "", nombre: "", rol_id: 4, localidades: [], password: "" });
    } catch (e) { alert(e.error || "Error al crear usuario"); }
  };

  const eliminarU = async (id) => {
    if (!window.confirm("¿Eliminar este usuario definitivamente?")) return;
    try {
      await eliminarUsuarioDefinitivo(id);
      setUsuarios((u) => u.filter((x) => x.id !== id));
      alert("Usuario eliminado");
    } catch (e) { alert(e.error || "Error al eliminar usuario"); }
  };

  const abrirEdicion = (u) => {
    setShowNew(false);
    setEditandoU({ id: u.id, user: u.user || "", nombre: u.nombre || "", rol_id: u.rol_id || roles[0]?.id, localidades: u.localidades || [], password: "", activo: u.activo ?? true });
  };

  const guardarEdicion = async () => {
    if (!editandoU.nombre) return;
    const payload = { nombre: editandoU.nombre, rol_id: editandoU.rol_id, localidades: editandoU.localidades, activo: editandoU.activo };
    if (editandoU.password) payload.password = editandoU.password;
    try {
      const updated = await apiEditarUsuario(editandoU.id, payload);
      setUsuarios((u) => u.map((x) => x.id === editandoU.id ? { ...x, ...updated } : x));
      setEditandoU(null);
    } catch (e) { alert(e.error || "Error al editar usuario"); }
  };

  const tabs = [{ id: "usuarios", l: "👤 Usuarios" }, { id: "metas", l: "🎯 Metas" }, { id: "estrategias", l: "🔧 Estrategias" }];

  // Obtener el nombre de rol para un usuario
  const getRolNombre = (u) => u.rol || ROL_MAP[u.rol_id] || "—";
  const getLocNombre = (locId) => localidades.find((l) => Number(l.id) === Number(locId))?.nombre || locId;
  const rolActual = roles.find((r) => r.id === nuevoU.rol_id)?.nombre?.toLowerCase() || "";

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: C.texto, margin: 0, letterSpacing: "-0.03em" }}>⚙️ Administración</h1>
        <p style={{ color: C.grisTexto, marginTop: 4, fontSize: 13 }}>Usuarios, metas y parametrización</p>
      </div>
      <div style={{ display: "flex", gap: 0, marginBottom: 20, background: C.blanco, borderRadius: 12, border: `1px solid ${C.grisMedio}`, overflow: "hidden", width: "fit-content" }}>
        {tabs.map((t) => <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "10px 22px", background: tab === t.id ? C.azul : "none", color: tab === t.id ? C.blanco : C.grisTexto, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, borderRight: `1px solid ${C.grisMedio}`, transition: "all 0.2s" }}>{t.l}</button>)}
      </div>

      {tab === "usuarios" && (
        <div>
          {loading ? <Loading /> : <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Usuarios ({usuarios.length})</h3>
              {!editandoU && <button onClick={() => setShowNew(!showNew)} style={{ padding: "9px 18px", background: C.azul, color: C.blanco, border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>+ Nuevo usuario</button>}
            </div>
            {showNew && (
              <div className="fade-in" style={{ background: C.azulSuave, borderRadius: 14, padding: 20, marginBottom: 20, border: `1px solid ${C.grisMedio}` }}>
                <h4 style={{ margin: "0 0 14px" }}>Nuevo usuario</h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <Campo label="Usuario (letras, números, _)" required><Input value={nuevoU.user} onChange={(e) => setN("user", e.target.value)} placeholder="ej: j_caacupe" /></Campo>
                  <Campo label="Nombre" required><Input value={nuevoU.nombre} onChange={(e) => setN("nombre", e.target.value)} placeholder="Nombre" /></Campo>
                  <Campo label="Contraseña" required><Input type="password" value={nuevoU.password} onChange={(e) => setN("password", e.target.value)} placeholder="Mín. 6 caracteres" /></Campo>
                  <Campo label="Rol" required><Select value={nuevoU.rol_id} onChange={(e) => setN("rol_id", Number(e.target.value))}>{roles.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}</Select></Campo>
                  {(rolActual === "junta" || rolActual === "contratista") && (
                    <Campo label="Localidades">
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: 8, border: `1px solid ${C.grisBorde}`, borderRadius: 10, background: C.blanco }}>
                        {localidades.map((l) => (<label key={l.id} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, cursor: "pointer" }}><input type="checkbox" checked={nuevoU.localidades.includes(l.id)} onChange={(e) => { const c = nuevoU.localidades; setN("localidades", e.target.checked ? [...c, l.id] : c.filter((x) => x !== l.id)); }} />{l.nombre}</label>))}
                      </div>
                    </Campo>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button onClick={() => setShowNew(false)} style={{ padding: "8px 18px", background: C.gris, border: `1px solid ${C.grisMedio}`, borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 600, color: C.grisTexto }}>Cancelar</button>
                  <button onClick={crearUsuario} style={{ padding: "8px 22px", background: C.azul, color: C.blanco, border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Crear</button>
                </div>
              </div>
            )}
            {editandoU && (() => {
              const rolEditNombre = roles.find((r) => r.id === editandoU.rol_id)?.nombre?.toLowerCase() || "";
              return (
                <div className="fade-in" style={{ background: "#FFF9E6", borderRadius: 14, padding: 20, marginBottom: 20, border: `1px solid #F0D070` }}>
                  <h4 style={{ margin: "0 0 14px" }}>Editar usuario: <span style={{ color: C.azul }}>{editandoU.user}</span></h4>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <Campo label="Nombre" required><Input value={editandoU.nombre} onChange={(e) => setE("nombre", e.target.value)} placeholder="Nombre" /></Campo>
                    <Campo label="Nueva contraseña"><Input type="password" value={editandoU.password} onChange={(e) => setE("password", e.target.value)} placeholder="Dejar en blanco para no cambiar" /></Campo>
                    <Campo label="Rol" required><Select value={editandoU.rol_id} onChange={(e) => setE("rol_id", Number(e.target.value))}>{roles.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}</Select></Campo>
                    <Campo label="Estado" required><Select value={editandoU.activo ? "1" : "0"} onChange={(e) => setE("activo", e.target.value === "1")}><option value="1">Activo</option><option value="0">Inactivo</option></Select></Campo>
                    {(rolEditNombre === "junta" || rolEditNombre === "contratista") && (
                      <Campo label="Localidades">
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: 8, border: `1px solid ${C.grisBorde}`, borderRadius: 10, background: C.blanco }}>
                          {localidades.map((l) => (<label key={l.id} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, cursor: "pointer" }}><input type="checkbox" checked={editandoU.localidades.includes(l.id)} onChange={(e) => { const c = editandoU.localidades; setE("localidades", e.target.checked ? [...c, l.id] : c.filter((x) => x !== l.id)); }} />{l.nombre}</label>))}
                        </div>
                      </Campo>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <button onClick={() => setEditandoU(null)} style={{ padding: "8px 18px", background: C.gris, border: `1px solid ${C.grisMedio}`, borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 600, color: C.grisTexto }}>Cancelar</button>
                    <button onClick={guardarEdicion} style={{ padding: "8px 22px", background: "#D97706", color: C.blanco, border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Guardar</button>
                  </div>
                </div>
              );
            })()}
            <div style={{ background: C.blanco, borderRadius: 14, border: `1px solid ${C.grisMedio}`, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead><tr style={{ background: C.gris }}>{["Usuario", "Login", "Rol", "Localidades", "Estado", ""].map((h) => <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, color: C.grisTexto, fontSize: 12, borderBottom: `1px solid ${C.grisMedio}` }}>{h}</th>)}</tr></thead>
                <tbody>{usuarios.map((u, i) => (
                  <tr key={u.id} style={{ backgroundColor: i % 2 === 0 ? C.blanco : C.gris, borderBottom: `1px solid ${C.grisMedio}` }}>
                    <td style={{ padding: "12px 14px", fontWeight: 700 }}>{u.nombre}</td>
                    <td style={{ padding: "12px 14px", fontFamily: "monospace", fontSize: 12, color: C.grisTexto }}>{u.user || "—"}</td>
                    <td style={{ padding: "12px 14px" }}><RolBadge rol={getRolNombre(u)} /></td>
                    <td style={{ padding: "12px 14px", fontSize: 12, color: C.grisTexto }}>{u.localidades ? u.localidades.map((id) => getLocNombre(id)).join(", ") : "Todas"}</td>
                    <td style={{ padding: "12px 14px" }}><span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: u.activo ? C.verdeC : C.rojoClaro, color: u.activo ? "#065F46" : C.rojo }}>{u.activo ? "Activo" : "Inactivo"}</span></td>
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => abrirEdicion(u)} style={{ padding: "5px 12px", background: "#FEF3C7", color: "#92400E", border: "none", borderRadius: 8, fontSize: 11, cursor: "pointer", fontWeight: 600 }}>Editar</button>
                        <button onClick={() => eliminarU(u.id)} style={{ padding: "5px 12px", background: C.rojoClaro, color: C.rojo, border: "none", borderRadius: 8, fontSize: 11, cursor: "pointer", fontWeight: 600 }}>Eliminar</button>
                      </div>
                    </td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </>}
        </div>
      )}

      {tab === "metas" && (
        <div style={{ background: C.blanco, borderRadius: 14, border: `1px solid ${C.grisMedio}`, overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.grisMedio}` }}><h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Metas por localidad</h3></div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead><tr style={{ background: C.gris }}>{["Localidad", "Meta actual"].map((h) => <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, color: C.grisTexto, fontSize: 12, borderBottom: `1px solid ${C.grisMedio}` }}>{h}</th>)}</tr></thead>
            <tbody>{localidades.map((l, i) => (
              <tr key={l.id} style={{ backgroundColor: i % 2 === 0 ? C.blanco : C.gris, borderBottom: `1px solid ${C.grisMedio}` }}>
                <td style={{ padding: "12px 14px", fontWeight: 700 }}>{l.nombre}</td>
                <td style={{ padding: "12px 14px", fontWeight: 700, color: C.azul }}>{fmt(l.previstas)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {tab === "estrategias" && (
        <div>
          {loadingMod ? <Loading /> : <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Modalidades ({modalidadesAdmin.length})</h3>
              {!editandoMod && <button onClick={() => setShowNewMod(!showNewMod)} style={{ padding: "9px 18px", background: C.azul, color: C.blanco, border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>+ Nueva modalidad</button>}
            </div>

            {showNewMod && (
              <div className="fade-in" style={{ background: C.azulSuave, borderRadius: 14, padding: 20, marginBottom: 20, border: `1px solid ${C.grisMedio}` }}>
                <h4 style={{ margin: "0 0 14px" }}>Nueva modalidad</h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <Campo label="Nombre" required><Input value={nuevaMod.nombre} onChange={(e) => setNM("nombre", e.target.value)} placeholder="Ej: Llave en Mano" /></Campo>
                  <Campo label="Categoría" required>
                    <Select value={nuevaMod.cat} onChange={(e) => setNM("cat", e.target.value)}>
                      {CATS.map((c) => <option key={c} value={c}>{c}</option>)}
                    </Select>
                  </Campo>
                  <Campo label="Roles habilitados" required>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: 8, border: `1px solid ${C.grisBorde}`, borderRadius: 10, background: C.blanco }}>
                      {TODOS_ROLES.map((r) => (
                        <label key={r.id} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, cursor: "pointer" }}>
                          <input type="checkbox" checked={nuevaMod.roles.includes(r.id)} onChange={(e) => { const c = nuevaMod.roles; setNM("roles", e.target.checked ? [...c, r.id] : c.filter((x) => x !== r.id)); }} />
                          {r.nombre}
                        </label>
                      ))}
                    </div>
                  </Campo>
                </div>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
                  <button onClick={() => setShowNewMod(false)} style={{ padding: "8px 18px", background: C.gris, border: `1px solid ${C.grisMedio}`, borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 600, color: C.grisTexto }}>Cancelar</button>
                  <button onClick={crearMod} style={{ padding: "8px 22px", background: C.azul, color: C.blanco, border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Crear</button>
                </div>
              </div>
            )}

            {editandoMod && (
              <div className="fade-in" style={{ background: "#FFF9E6", borderRadius: 14, padding: 20, marginBottom: 20, border: `1px solid #F0D070` }}>
                <h4 style={{ margin: "0 0 14px" }}>Editar modalidad</h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <Campo label="Nombre" required><Input value={editandoMod.nombre} onChange={(e) => setEM("nombre", e.target.value)} placeholder="Nombre" /></Campo>
                  <Campo label="Categoría" required>
                    <Select value={editandoMod.cat} onChange={(e) => setEM("cat", e.target.value)}>
                      {CATS.map((c) => <option key={c} value={c}>{c}</option>)}
                    </Select>
                  </Campo>
                  {/* <Campo label="Roles habilitados" required>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: 8, border: `1px solid ${C.grisBorde}`, borderRadius: 10, background: C.blanco }}>
                      {TODOS_ROLES.map((r) => (
                        <label key={r.id} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, cursor: "pointer" }}>
                          <input type="checkbox" checked={editandoMod.roles.includes(r.id)} onChange={(e) => { const c = editandoMod.roles; setEM("roles", e.target.checked ? [...c, r.id] : c.filter((x) => x !== r.id)); }} />
                          {r.nombre}
                        </label>
                      ))}
                    </div>
                  </Campo> */}
                </div>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
                  <button onClick={() => setEditandoMod(null)} style={{ padding: "8px 18px", background: C.gris, border: `1px solid ${C.grisMedio}`, borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 600, color: C.grisTexto }}>Cancelar</button>
                  <button onClick={guardarMod} style={{ padding: "8px 22px", background: C.amarillo, color: C.blanco, border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Guardar</button>
                </div>
              </div>
            )}

            <div style={{ background: C.blanco, borderRadius: 14, border: `1px solid ${C.grisMedio}`, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: C.gris }}>
                    {["Categoría", "Modalidad", "Estado", ""].map((h) => (
                      <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, color: C.grisTexto, fontSize: 12, borderBottom: `1px solid ${C.grisMedio}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>{modalidadesAdmin.map((m, i) => (
                  <tr key={m.id} style={{ backgroundColor: i % 2 === 0 ? C.blanco : C.gris, borderBottom: `1px solid ${C.grisMedio}`, opacity: m.activo ? 1 : 0.5 }}>
                    <td style={{ padding: "12px 14px" }}><CatBadge cat={m.cat} /></td>
                    <td style={{ padding: "12px 14px", fontWeight: 600 }}>{m.nombre}</td>
                    <td style={{ padding: "12px 14px" }}>
                      <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: m.activo ? C.verdeC : C.rojoClaro, color: m.activo ? "#065F46" : C.rojo }}>
                        {m.activo ? "Activa" : "Inactiva"}
                      </span>
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => abrirEdicionMod(m)} style={{ padding: "5px 12px", background: "#FEF3C7", color: "#92400E", border: "none", borderRadius: 8, fontSize: 11, cursor: "pointer", fontWeight: 600 }}>Editar</button>
                        <button onClick={() => desactivarMod(m.id)} style={{ padding: "5px 12px", background: C.amarilloC, color: C.amarillo, border: "none", borderRadius: 8, fontSize: 11, cursor: "pointer", fontWeight: 600 }}>Desactivar</button>
                        <button onClick={() => eliminarMod(m.id)} style={{ padding: "5px 12px", background: C.rojoClaro, color: C.rojo, border: "none", borderRadius: 8, fontSize: 11, cursor: "pointer", fontWeight: 600 }}>Eliminar</button>
                      </div>
                    </td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </>}
        </div>
      )}
    </div>
  );
}
