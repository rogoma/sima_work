import React, { useState, useEffect } from "react";
import { C } from "../styles/colors";
import { fetchUsuarios, fetchRoles, crearUsuario as apiCrearUsuario, editarUsuario as apiEditarUsuario, eliminarUsuarioDefinitivo, fetchTodasModalidades, fetchTiposModalidad, fetchEstadosModalidad, crearModalidad as apiCrearModalidad, editarModalidad as apiEditarModalidad } from "../services/api";
import { RolBadge, CatBadge } from "../components/Badges";
import { Loading } from "../components/DataDisplay";
import { Campo, Input, Select } from "../components/FormFields";

const fmt = n => String(Math.round(Number(n))).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

// Mapeo rol_id → nombre para el badge
const ROL_MAP = { 1: "contratista", 2: "coordinador", 3: "equipo", 4: "junta" };

const ESTADOS = [
  { id: 1, nombre: "Activo",     bg: "#D1FAE5", color: "#065F46" },
  { id: 2, nombre: "Inactivo",   bg: "#FEE2E2", color: "#DC2626" },
  { id: 6, nombre: "Suspendido", bg: "#FEF3C7", color: "#92400E" },
];

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
  const [modalidadesAdmin, setModalidadesAdmin] = useState(
    () => (modalidades || []).map((m) => ({ ...m, activo: true }))
  );
  const [tiposMod, setTiposMod] = useState([]);
  const [estadosMod, setEstadosMod] = useState([]);
  const [loadingMod, setLoadingMod] = useState(false);
  const [showNewMod, setShowNewMod] = useState(false);
  const [nuevaMod, setNuevaMod] = useState({ nombre: "", cat: "" });
  const setNM = (k, v) => setNuevaMod((n) => ({ ...n, [k]: v }));
  const [editandoMod, setEditandoMod] = useState(null);
  const setEM = (k, v) => setEditandoMod((n) => ({ ...n, [k]: v }));

  useEffect(() => {
    Promise.all([fetchUsuarios(), fetchRoles()])
      .then(([u, r]) => { setUsuarios(u); setRoles(r); if (r.length) { const rid = r[0].id; setNuevoU(n => ({ ...n, rol_id: rid, localidades: [1, 3, 5].includes(rid) ? localidades.map(l => l.id) : [2, 7].includes(rid) ? localidades.slice(0, 1).map(l => l.id) : n.localidades })); } })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (tab !== "estrategias") return;
    setLoadingMod(true);
    Promise.all([fetchTodasModalidades(), fetchTiposModalidad(), fetchEstadosModalidad()])
      .then(([data, tipos, estados]) => {
        if (data?.length) setModalidadesAdmin(data);
        const t = tipos || [];
        setTiposMod(t);
        setEstadosMod(estados || []);
        setNuevaMod(n => ({ ...n, cat: n.cat || t[0]?.nombre || "" }));
      })
      .catch(() => {})
      .finally(() => setLoadingMod(false));
  }, [tab]);

  const crearMod = async () => {
    if (!nuevaMod.nombre || !nuevaMod.cat) return;
    try {
      const created = await apiCrearModalidad({ nombre: nuevaMod.nombre, cat: nuevaMod.cat, roles: [] });
      setModalidadesAdmin((m) => [...m, created].sort((a, b) => (a.cat || "").localeCompare(b.cat || "") || a.nombre.localeCompare(b.nombre)));
      setShowNewMod(false); setNuevaMod({ nombre: "", cat: tiposMod[0]?.nombre || "" });
    } catch (e) { alert(e.error || "Error al crear modalidad"); }
  };

  const abrirEdicionMod = (m) => {
    setShowNewMod(false);
    setEditandoMod({ id: m.id, nombre: m.nombre, cat: m.cat, estado_id: m.estado_id ?? 1 });
  };

  const guardarMod = async () => {
    if (!editandoMod.nombre) return;
    try {
      const updated = await apiEditarModalidad(editandoMod.id, { nombre: editandoMod.nombre, cat: editandoMod.cat, estado_id: editandoMod.estado_id });
      setModalidadesAdmin((m) => m.map((x) => x.id === editandoMod.id ? updated : x));
      setEditandoMod(null);
    } catch (e) { alert(e.error || "Error al editar modalidad"); }
  };

  const crearUsuario = async () => {
    if (!nuevoU.user || !nuevoU.nombre || !nuevoU.password) return;
    if ([2, 4, 7].includes(nuevoU.rol_id) && !nuevoU.localidades.length) { alert("Este rol requiere seleccionar una localidad."); return; }
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
    setEditandoU({ id: u.id, user: u.user || "", nombre: u.nombre || "", rol_id: u.rol_id || roles[0]?.id, localidades: u.localidades || [], password: "", estado_id: u.estado_id ?? 1 });
  };

  const guardarEdicion = async () => {
    if (!editandoU.nombre) return;
    if ([2, 7].includes(editandoU.rol_id) && !editandoU.localidades.length) { alert("Este rol requiere seleccionar al menos una localidad."); return; }
    const payload = { nombre: editandoU.nombre, rol_id: editandoU.rol_id, localidades: editandoU.localidades, estado_id: editandoU.estado_id };
    if (editandoU.password) payload.password = editandoU.password;
    try {
      const updated = await apiEditarUsuario(editandoU.id, payload);
      setUsuarios((u) => u.map((x) => x.id === editandoU.id ? { ...x, ...updated } : x));
      setEditandoU(null);
    } catch (e) { alert(e.error || "Error al editar usuario"); }
  };

  const generarPDFUsuarios = async () => {
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    // Logo
    try {
      const res = await fetch("/Logo_Senasa.jpg");
      const blob = await res.blob();
      const logoBase64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
      doc.addImage(logoBase64, "JPEG", 14, 10, 38, 19);
    } catch {}

    // Título
    doc.setFontSize(13);
    doc.setTextColor(18, 85, 161);
    doc.setFont("helvetica", "bold");
    doc.text("SIMA — Listado de Usuarios", 58, 17);

    // Subtítulo
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "normal");
    doc.text(`Generado: ${new Date().toLocaleString("es-PY")}   ·   Total: ${usuarios.length} usuarios`, 58, 24);

    // Línea separadora
    doc.setDrawColor(18, 85, 161);
    doc.setLineWidth(0.4);
    doc.line(14, 32, 196, 32);

    // Tabla
    const filas = usuarios.map((u) => [
      u.nombre || "—",
      u.user ? fmt(u.user) : "—",
      getRolNombre(u),
      u.localidades?.length ? u.localidades.map((id) => getLocNombre(id)).join(", ") : "Todas",
      ESTADOS.find((e) => e.id === u.estado_id)?.nombre || "Activo",
    ]);

    autoTable(doc, {
      startY: 35,
      head: [["Nombre", "Usuario", "Rol", "Localidades", "Estado"]],
      body: filas,
      headStyles: { fillColor: [18, 85, 161], fontSize: 9, fontStyle: "bold", textColor: 255 },
      bodyStyles: { fontSize: 9, textColor: 30 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      styles: { cellPadding: 3, overflow: "linebreak" },
      columnStyles: { 3: { cellWidth: 55 } },
    });

    doc.save("listado_usuarios.pdf");
  };

  const tabs = [{ id: "usuarios", l: "👤 Usuarios" }, { id: "metas", l: "🎯 Metas" }, { id: "estrategias", l: "🔧 Estrategias" }];

  // Obtener el nombre de rol para un usuario
  const getRolNombre = (u) => u.rol || roles.find((r) => r.id === u.rol_id)?.nombre || ROL_MAP[u.rol_id] || "—";
  const getLocNombre = (locId) => localidades.find((l) => Number(l.id) === Number(locId))?.nombre || locId;

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
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={generarPDFUsuarios} style={{ padding: "9px 18px", background: C.rojo, color: C.blanco, border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>🖨️ Listado de Usuarios</button>
                {!editandoU && !showNew && <button onClick={() => setShowNew(true)} style={{ padding: "9px 18px", background: C.azul, color: C.blanco, border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>+ Nuevo usuario</button>}
              </div>
            </div>
            {showNew && (
              <div className="fade-in" style={{ background: C.azulSuave, borderRadius: 14, padding: 20, marginBottom: 20, border: `1px solid ${C.grisMedio}` }}>
                <h4 style={{ margin: "0 0 14px" }}>Nuevo usuario</h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <Campo label="Usuario (cédula)" required><Input value={nuevoU.user} onChange={(e) => { const digits = e.target.value.replace(/[^0-9]/g, ""); setN("user", digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".")); }} placeholder="ej: 1.155.372" /></Campo>
                  <Campo label="Nombre y Apellido" required><Input value={nuevoU.nombre} onChange={(e) => setN("nombre", e.target.value)} placeholder="Nombre" /></Campo>
                  <Campo label="Contraseña" required><Input type="password" value={nuevoU.password} onChange={(e) => setN("password", e.target.value)} placeholder="Mín. 6 caracteres" /></Campo>
                  <Campo label="Rol" required><Select value={nuevoU.rol_id} onChange={(e) => { const rid = Number(e.target.value); setN("rol_id", rid); if (![1, 2, 3, 4, 5, 7].includes(rid)) setN("localidades", []); else if ([1, 3, 5].includes(rid)) setN("localidades", localidades.map(l => l.id)); else if ([2, 7].includes(rid)) setN("localidades", localidades.slice(0, 1).map(l => l.id)); else if (rid === 4) setN("localidades", []); }}>{roles.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}</Select></Campo>
                  {[1, 2, 3, 4, 5, 7].includes(nuevoU.rol_id) && (
                    <Campo label={[4, 7].includes(nuevoU.rol_id) ? "Localidad" : "Localidades"}>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: 8, border: `1px solid ${C.grisBorde}`, borderRadius: 10, background: C.blanco }}>
                        {localidades.map((l) => (
                          <label key={l.id} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, cursor: "pointer" }}>
                            <input
                              type={[4, 7].includes(nuevoU.rol_id) ? "radio" : "checkbox"}
                              name="nueva_localidad"
                              checked={nuevoU.localidades.includes(l.id)}
                              onChange={() => {
                                if ([4, 7].includes(nuevoU.rol_id)) { setN("localidades", [l.id]); }
                                else { const c = nuevoU.localidades; setN("localidades", c.includes(l.id) ? c.filter((x) => x !== l.id) : [...c, l.id]); }
                              }}
                            />
                            {l.nombre}
                          </label>
                        ))}
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
              return (
                <div className="fade-in" style={{ background: "#FFF9E6", borderRadius: 14, padding: 20, marginBottom: 20, border: `1px solid #F0D070` }}>
                  <h4 style={{ margin: "0 0 14px" }}>Editar usuario: <span style={{ color: C.azul }}>{fmt(editandoU.user)}</span></h4>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <Campo label="Nombre" required><Input value={editandoU.nombre} onChange={(e) => setE("nombre", e.target.value)} placeholder="Nombre" /></Campo>
                    <Campo label="Nueva contraseña"><Input type="password" value={editandoU.password} onChange={(e) => setE("password", e.target.value)} placeholder="Dejar en blanco para no cambiar" /></Campo>
                    <Campo label="Rol" required><Select value={editandoU.rol_id} onChange={(e) => { const rid = Number(e.target.value); setE("rol_id", rid); if (![1, 2, 3, 4, 5, 7].includes(rid)) setE("localidades", []); else if ([1, 3, 5].includes(rid)) setE("localidades", localidades.map(l => l.id)); else if ([2, 7].includes(rid)) setE("localidades", editandoU.localidades.slice(0, 1)); }}>{roles.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}</Select></Campo>
                    <Campo label="Estado" required><Select value={editandoU.estado_id} onChange={(e) => setE("estado_id", Number(e.target.value))}>{ESTADOS.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}</Select></Campo>
                    {[1, 2, 3, 4, 5, 7].includes(editandoU.rol_id) && (
                      <Campo label={[4, 7].includes(editandoU.rol_id) ? "Localidad" : "Localidades"}>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: 8, border: `1px solid ${C.grisBorde}`, borderRadius: 10, background: C.blanco }}>
                          {localidades.map((l) => (
                            <label key={l.id} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, cursor: "pointer" }}>
                              <input
                                type={[4, 7].includes(editandoU.rol_id) ? "radio" : "checkbox"}
                                name="edit_localidad"
                                checked={editandoU.localidades.includes(l.id)}
                                onChange={() => {
                                  if ([4, 7].includes(editandoU.rol_id)) { setE("localidades", [l.id]); }
                                  else { const c = editandoU.localidades; setE("localidades", c.includes(l.id) ? c.filter((x) => x !== l.id) : [...c, l.id]); }
                                }}
                              />
                              {l.nombre}
                            </label>
                          ))}
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
                <thead><tr style={{ background: C.gris }}>{["Nombre", "Usuario", "Rol", "Localidades", "Estado", ""].map((h) => <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, color: C.grisTexto, fontSize: 12, borderBottom: `1px solid ${C.grisMedio}` }}>{h}</th>)}</tr></thead>
                <tbody>{usuarios.map((u, i) => (
                  <tr key={u.id} style={{ backgroundColor: i % 2 === 0 ? C.blanco : C.gris, borderBottom: `1px solid ${C.grisMedio}` }}>
                    <td style={{ padding: "12px 14px", fontWeight: 700 }}>{u.nombre}</td>
                    <td style={{ padding: "12px 14px", fontFamily: "monospace", fontSize: 12, color: C.grisTexto }}>{u.user ? fmt(u.user) : "—"}</td>
                    <td style={{ padding: "12px 14px" }}><RolBadge rol={getRolNombre(u)} /></td>
                    <td style={{ padding: "12px 14px", fontSize: 12, color: C.grisTexto }}>{u.localidades ? u.localidades.map((id) => getLocNombre(id)).join(", ") : "Todas"}</td>
                    <td style={{ padding: "12px 14px" }}>{(() => { const est = ESTADOS.find((e) => e.id === u.estado_id) || ESTADOS[0]; return <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: est.bg, color: est.color }}>{est.nombre}</span>; })()}</td>
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => abrirEdicion(u)} style={{ padding: "5px 12px", background: "#FEF3C7", color: "#92400E", border: "none", borderRadius: 8, fontSize: 11, cursor: "pointer", fontWeight: 600 }}>Editar</button>
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
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Estrategias ({modalidadesAdmin.length})</h3>
              {!editandoMod && <button onClick={() => setShowNewMod(!showNewMod)} style={{ padding: "9px 18px", background: C.azul, color: C.blanco, border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>+ Nueva Estrategia</button>}
            </div>

            {showNewMod && (
              <div className="fade-in" style={{ background: C.azulSuave, borderRadius: 14, padding: 20, marginBottom: 20, border: `1px solid ${C.grisMedio}` }}>
                <h4 style={{ margin: "0 0 14px" }}>Nueva modalidad</h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <Campo label="Nombre" required><Input value={nuevaMod.nombre} onChange={(e) => setNM("nombre", e.target.value)} placeholder="Ej: Llave en Mano" /></Campo>
                  <Campo label="Categoría" required>
                    <Select value={nuevaMod.cat} onChange={(e) => setNM("cat", e.target.value)}>
                      {tiposMod.map((t) => <option key={t.id} value={t.nombre}>{t.nombre}</option>)}
                    </Select>
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
                      {tiposMod.map((t) => <option key={t.id} value={t.nombre}>{t.nombre}</option>)}
                    </Select>
                  </Campo>
                  <Campo label="Estado" required>
                    <Select value={editandoMod.estado_id} onChange={(e) => setEM("estado_id", Number(e.target.value))}>
                      {estadosMod.filter(e => e.id === 1 || e.id === 2).map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                    </Select>
                  </Campo>
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
                    {["Categoría", "Estrategia", "Estado", ""].map((h) => (
                      <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, color: C.grisTexto, fontSize: 12, borderBottom: `1px solid ${C.grisMedio}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>{modalidadesAdmin.map((m, i) => {
                  const est = estadosMod.find(e => e.id === m.estado_id);
                  return (
                  <tr key={m.id} style={{ backgroundColor: i % 2 === 0 ? C.blanco : C.gris, borderBottom: `1px solid ${C.grisMedio}`, opacity: m.activo ? 1 : 0.5 }}>
                    <td style={{ padding: "12px 14px" }}><CatBadge cat={m.cat} /></td>
                    <td style={{ padding: "12px 14px", fontWeight: 600 }}>{m.nombre}</td>
                    <td style={{ padding: "12px 14px" }}>
                      <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: m.activo ? C.verdeC : C.rojo, color: m.activo ? "#065F46" : C.blanco }}>
                        {est?.nombre || (m.activo ? "Activa" : "Inactiva")}
                      </span>
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <button onClick={() => abrirEdicionMod(m)} style={{ padding: "5px 12px", background: "#FEF3C7", color: "#92400E", border: "none", borderRadius: 8, fontSize: 11, cursor: "pointer", fontWeight: 600, opacity: 1 }}>Editar</button>
                    </td>
                  </tr>
                  );
                })}</tbody>
              </table>
            </div>
          </>}
        </div>
      )}
    </div>
  );
}
