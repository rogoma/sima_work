import React, { useState, useEffect } from "react";
import { C } from "../styles/colors";
import { fetchRolesAdmin, crearRol, editarRol, eliminarRol } from "../services/api";
import { Loading } from "../components/DataDisplay";

export default function VistaRoles() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Alta
  const [showNew, setShowNew] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [savingNew, setSavingNew] = useState(false);
  const [errorNew, setErrorNew] = useState("");

  // Edición
  const [editandoId, setEditandoId] = useState(null);
  const [editNombre, setEditNombre] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [errorEdit, setErrorEdit] = useState("");

  // Eliminación
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const cargar = () => {
    setLoading(true);
    fetchRolesAdmin()
      .then(setRoles)
      .catch(() => setError("No se pudieron cargar los roles."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, []);

  const handleCrear = async () => {
    if (!nuevoNombre.trim()) { setErrorNew("El nombre es requerido."); return; }
    setSavingNew(true); setErrorNew("");
    try {
      const created = await crearRol({ nombre: nuevoNombre.trim() });
      setRoles((r) => [...r, created].sort((a, b) => a.id - b.id));
      setShowNew(false); setNuevoNombre("");
    } catch (e) {
      setErrorNew(e.error || "Error al crear el rol.");
    } finally {
      setSavingNew(false);
    }
  };

  const iniciarEdicion = (rol) => {
    setEditandoId(rol.id);
    setEditNombre(rol.nombre);
    setErrorEdit("");
    setConfirmDeleteId(null);
  };

  const handleGuardarEdicion = async () => {
    if (!editNombre.trim()) { setErrorEdit("El nombre es requerido."); return; }
    setSavingEdit(true); setErrorEdit("");
    try {
      const updated = await editarRol(editandoId, { nombre: editNombre.trim() });
      setRoles((r) => r.map((rol) => rol.id === updated.id ? updated : rol));
      setEditandoId(null);
    } catch (e) {
      setErrorEdit(e.error || "Error al guardar.");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleEliminar = async (id) => {
    setDeletingId(id);
    try {
      await eliminarRol(id);
      setRoles((r) => r.filter((rol) => rol.id !== id));
      setConfirmDeleteId(null);
    } catch (e) {
      alert(e.error || "No se puede eliminar el rol.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      {/* Encabezado */}
      <div className="admin-header-row" style={{ alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: C.azulOscuro, letterSpacing: "-0.03em" }}>
            🔑 Roles
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: C.grisTexto }}>
            Gestión de roles del sistema
          </p>
        </div>
        {!showNew && (
          <button
            onClick={() => { setShowNew(true); setNuevoNombre(""); setErrorNew(""); }}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", background: `linear-gradient(135deg,${C.azul},${C.azulMedio})`, color: C.blanco, border: "none", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 700, boxShadow: "0 2px 8px rgba(18,85,161,0.2)" }}
          >
            + Nuevo Rol
          </button>
        )}
      </div>

      {/* Formulario nuevo rol */}
      {showNew && (
        <div style={{ background: C.blanco, border: `1.5px solid ${C.azul}`, borderRadius: 12, padding: "18px 20px", marginBottom: 20, boxShadow: "0 2px 12px rgba(18,85,161,0.09)" }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: C.azulOscuro, marginBottom: 12 }}>Nuevo Rol</div>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <input
                autoFocus
                placeholder="Nombre del rol"
                value={nuevoNombre}
                onChange={(e) => setNuevoNombre(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleCrear(); if (e.key === "Escape") setShowNew(false); }}
                style={{ width: "100%", padding: "9px 12px", border: `1.5px solid ${errorNew ? C.rojo : C.grisMedio}`, borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box" }}
              />
              {errorNew && <div style={{ color: C.rojo, fontSize: 11, marginTop: 4 }}>{errorNew}</div>}
            </div>
            <button
              onClick={handleCrear}
              disabled={savingNew}
              style={{ padding: "9px 18px", background: C.verde, color: C.blanco, border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, opacity: savingNew ? 0.7 : 1 }}
            >
              {savingNew ? "Guardando…" : "Guardar"}
            </button>
            <button
              onClick={() => setShowNew(false)}
              style={{ padding: "9px 14px", background: C.gris, color: C.grisTexto, border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Tabla de roles */}
      <div style={{ background: C.blanco, borderRadius: 14, boxShadow: "0 1px 8px rgba(0,0,0,0.07)", overflowX: "auto" }}>
        {loading ? (
          <div style={{ padding: 40, display: "flex", justifyContent: "center" }}>
            <Loading text="Cargando roles…" />
          </div>
        ) : error ? (
          <div style={{ padding: 32, textAlign: "center", color: C.rojo, fontSize: 14 }}>{error}</div>
        ) : roles.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", color: C.grisTexto, fontSize: 14 }}>No hay roles registrados.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F8F9FC" }}>
                <th style={{ padding: "12px 20px", textAlign: "left", fontSize: 11, fontWeight: 700, color: C.grisTexto, textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: `1px solid ${C.grisMedio}` }}>ID</th>
                <th style={{ padding: "12px 20px", textAlign: "left", fontSize: 11, fontWeight: 700, color: C.grisTexto, textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: `1px solid ${C.grisMedio}` }}>Nombre</th>
                <th style={{ padding: "12px 20px", textAlign: "center", fontSize: 11, fontWeight: 700, color: C.grisTexto, textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: `1px solid ${C.grisMedio}` }}>Usuarios</th>
                <th style={{ padding: "12px 20px", textAlign: "right", fontSize: 11, fontWeight: 700, color: C.grisTexto, textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: `1px solid ${C.grisMedio}` }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {roles.map((rol, idx) => (
                <tr key={rol.id} style={{ borderBottom: idx < roles.length - 1 ? `1px solid ${C.grisMedio}` : "none", background: editandoId === rol.id ? "#F0F7FF" : "transparent" }}>
                  <td style={{ padding: "14px 20px", fontSize: 13, color: C.grisTexto, fontWeight: 600 }}>#{rol.id}</td>
                  <td style={{ padding: "14px 20px" }}>
                    {editandoId === rol.id ? (
                      <div>
                        <input
                          autoFocus
                          value={editNombre}
                          onChange={(e) => setEditNombre(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") handleGuardarEdicion(); if (e.key === "Escape") setEditandoId(null); }}
                          style={{ padding: "7px 10px", border: `1.5px solid ${errorEdit ? C.rojo : C.azul}`, borderRadius: 7, fontSize: 13, outline: "none", minWidth: 180 }}
                        />
                        {errorEdit && <div style={{ color: C.rojo, fontSize: 11, marginTop: 3 }}>{errorEdit}</div>}
                      </div>
                    ) : (
                      <span style={{ fontSize: 14, fontWeight: 600, color: C.azulOscuro }}>{rol.nombre}</span>
                    )}
                  </td>
                  <td style={{ padding: "14px 20px", textAlign: "center" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 28, height: 24, background: rol.cantidad_usuarios > 0 ? "#EFF6FF" : C.gris, color: rol.cantidad_usuarios > 0 ? C.azul : C.grisTexto, borderRadius: 12, fontSize: 12, fontWeight: 700, padding: "0 8px" }}>
                      {rol.cantidad_usuarios}
                    </span>
                  </td>
                  <td style={{ padding: "14px 20px", textAlign: "right" }}>
                    {editandoId === rol.id ? (
                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <button
                          onClick={handleGuardarEdicion}
                          disabled={savingEdit}
                          style={{ padding: "6px 14px", background: C.verde, color: C.blanco, border: "none", borderRadius: 7, cursor: "pointer", fontSize: 12, fontWeight: 700, opacity: savingEdit ? 0.7 : 1 }}
                        >
                          {savingEdit ? "…" : "Guardar"}
                        </button>
                        <button
                          onClick={() => setEditandoId(null)}
                          style={{ padding: "6px 12px", background: C.gris, color: C.grisTexto, border: "none", borderRadius: 7, cursor: "pointer", fontSize: 12 }}
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : confirmDeleteId === rol.id ? (
                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", alignItems: "center" }}>
                        <span style={{ fontSize: 12, color: C.rojo, fontWeight: 600 }}>¿Confirmar?</span>
                        <button
                          onClick={() => handleEliminar(rol.id)}
                          disabled={deletingId === rol.id}
                          style={{ padding: "6px 12px", background: C.rojo, color: C.blanco, border: "none", borderRadius: 7, cursor: "pointer", fontSize: 12, fontWeight: 700, opacity: deletingId === rol.id ? 0.7 : 1 }}
                        >
                          {deletingId === rol.id ? "…" : "Eliminar"}
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          style={{ padding: "6px 10px", background: C.gris, color: C.grisTexto, border: "none", borderRadius: 7, cursor: "pointer", fontSize: 12 }}
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <button
                          onClick={() => iniciarEdicion(rol)}
                          style={{ padding: "6px 14px", background: "#EFF6FF", color: C.azul, border: `1px solid #BFDBFE`, borderRadius: 7, cursor: "pointer", fontSize: 12, fontWeight: 600 }}
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => { setConfirmDeleteId(rol.id); setEditandoId(null); }}
                          disabled={rol.cantidad_usuarios > 0}
                          title={rol.cantidad_usuarios > 0 ? `Tiene ${rol.cantidad_usuarios} usuario(s) asignado(s)` : "Eliminar rol"}
                          style={{ padding: "6px 12px", background: rol.cantidad_usuarios > 0 ? C.gris : "#FEF2F2", color: rol.cantidad_usuarios > 0 ? "#CBD5E1" : C.rojo, border: `1px solid ${rol.cantidad_usuarios > 0 ? C.grisMedio : "#FECACA"}`, borderRadius: 7, cursor: rol.cantidad_usuarios > 0 ? "not-allowed" : "pointer", fontSize: 12, fontWeight: 600 }}
                        >
                          Eliminar
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Info */}
      <div style={{ marginTop: 14, fontSize: 12, color: C.grisTexto }}>
        {roles.length} rol{roles.length !== 1 ? "es" : ""} registrado{roles.length !== 1 ? "s" : ""}
        {" · "}No se puede eliminar un rol con usuarios asignados.
      </div>
    </div>
  );
}
