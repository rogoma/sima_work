import React, { useState, useEffect } from "react";
import { C } from "../styles/colors";
import { fetchProfesionales, fetchProfesiones, crearProfesional, editarProfesional } from "../services/api";
import { Loading } from "../components/DataDisplay";
import { Campo, Input, Select } from "../components/FormFields";

const ESTADOS = [
  { id: 1, nombre: "Activo",   bg: "#D1FAE5", color: "#065F46" },
  { id: 2, nombre: "Inactivo", bg: "#FEE2E2", color: "#DC2626" },
];

const fmtCI = (ci) => ci ? String(ci).replace(/\B(?=(\d{3})+(?!\d))/g, ".") : "—";

const esCoordinador = (usuario) => [1, 5].includes(usuario?.rol_id);

export default function VistaProfesionales({ usuario, localidades = [] }) {
  const [profesionales, setProfesionales] = useState([]);
  const [profesiones, setProfesiones]     = useState([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState("");
  const [busqueda, setBusqueda]           = useState("");

  // Nuevo profesional
  const [showNew, setShowNew]     = useState(false);
  const [nuevoPro, setNuevoPro]   = useState({ localidad_id: "", profesion_id: "", ci: "", nombre: "", celular: "", direccion: "" });
  const [errNew, setErrNew]       = useState({});
  const [creating, setCreating]   = useState(false);
  const setNP = (k, v) => setNuevoPro((n) => ({ ...n, [k]: v }));

  // Edición
  const [editando, setEditando]   = useState(null);   // { id, localidad_id, profesion_id, ci, nombre, celular, direccion, estado_id }
  const [saving, setSaving]       = useState(false);
  const [errEdit, setErrEdit]     = useState({});

  const setE = (k, v) => setEditando((e) => ({ ...e, [k]: v }));

  const cargar = () => {
    setLoading(true);
    fetchProfesionales()
      .then(setProfesionales)
      .catch(() => setError("No se pudo cargar la lista de profesionales."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    cargar();
    fetchProfesiones().then(setProfesiones).catch(() => {});
  }, []);

  const validarNuevo = () => {
    const e = {};
    if (!nuevoPro.localidad_id)    e.localidad_id = "Requerido";
    if (!nuevoPro.profesion_id)    e.profesion_id = "Requerido";
    if (!nuevoPro.ci.trim())       e.ci = "Requerido";
    if (!nuevoPro.nombre.trim())   e.nombre = "Requerido";
    if (!nuevoPro.celular.trim())  e.celular = "Requerido";
    setErrNew(e);
    return Object.keys(e).length === 0;
  };

  const crear = async () => {
    if (!validarNuevo()) return;
    setCreating(true);
    try {
      const ciRaw = nuevoPro.ci.replace(/\./g, "").trim();
      const created = await crearProfesional({
        localidad_id: nuevoPro.localidad_id,
        profesion_id: nuevoPro.profesion_id,
        ci:           ciRaw,
        nombre:       nuevoPro.nombre,
        celular:      nuevoPro.celular,
        direccion:    nuevoPro.direccion,
        estado_id:    1,
      });
      setProfesionales((prev) => [...prev, {
        ...created,
        localidad_nombre: localidades.find((l) => Number(l.id) === Number(created.localidad_id))?.nombre || "",
        profesion_nombre: profesiones.find((pr) => Number(pr.id) === Number(created.profesion_id))?.nombre || "",
      }]);
      setShowNew(false);
      setNuevoPro({ localidad_id: "", profesion_id: "", ci: "", nombre: "", celular: "", direccion: "" });
      setErrNew({});
    } catch (e) {
      if (e.status === 409) {
        setErrNew((err) => ({ ...err, ci: e.error }));
      } else {
        alert(e.error || "Error al crear el profesional.");
      }
    } finally {
      setCreating(false);
    }
  };

  const generarPDFProfesionales = async () => {
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

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

    doc.setFontSize(13);
    doc.setTextColor(18, 85, 161);
    doc.setFont("helvetica", "bold");
    doc.text("SIMA — Listado de Profesionales", 58, 17);

    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "normal");
    doc.text(`Generado: ${new Date().toLocaleString("es-PY")}   ·   Total: ${filtrados.length} profesionales`, 58, 24);

    doc.setDrawColor(18, 85, 161);
    doc.setLineWidth(0.4);
    doc.line(14, 32, 283, 32);

    const filas = filtrados.map((p) => [
      p.localidad_nombre || "—",
      p.profesion_nombre || "—",
      fmtCI(p.ci),
      p.nombre,
      p.celular || "—",
      p.direccion || "—",
      ESTADOS.find((e) => e.id === (p.estado_id ?? 1))?.nombre || "Activo",
    ]);

    autoTable(doc, {
      startY: 35,
      head: [["Localidad", "Profesión", "CI", "Nombre", "Celular", "Dirección", "Estado"]],
      body: filas,
      headStyles: { fillColor: [18, 85, 161], fontSize: 9, fontStyle: "bold", textColor: 255 },
      bodyStyles: { fontSize: 9, textColor: 30 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      styles: { cellPadding: 3, overflow: "linebreak" },
    });

    doc.save("listado_profesionales.pdf");
  };

  const abrirEdicion = (p) => {
    setErrEdit({});
    setEditando({
      id:           p.id,
      localidad_id: String(p.localidad_id ?? ""),
      profesion_id: String(p.profesion_id ?? ""),
      ci:           fmtCI(p.ci),
      nombre:       p.nombre || "",
      celular:      p.celular || "",
      direccion:    p.direccion || "",
      estado_id:    p.estado_id ?? 1,
    });
  };

  const validarEdit = () => {
    const e = {};
    if (!editando.localidad_id)    e.localidad_id = "Requerido";
    if (!editando.profesion_id)    e.profesion_id = "Requerido";
    if (!editando.ci.trim())       e.ci = "Requerido";
    if (!editando.nombre.trim())   e.nombre = "Requerido";
    if (!editando.celular.trim())  e.celular = "Requerido";
    setErrEdit(e);
    return Object.keys(e).length === 0;
  };

  const guardar = async () => {
    if (!validarEdit()) return;
    setSaving(true);
    try {
      const ciRaw = editando.ci.replace(/\./g, "").trim();
      const updated = await editarProfesional(editando.id, {
        localidad_id: editando.localidad_id,
        profesion_id: editando.profesion_id,
        ci:           ciRaw,
        nombre:       editando.nombre,
        celular:      editando.celular,
        direccion:    editando.direccion,
        estado_id:    editando.estado_id,
      });
      setProfesionales((prev) =>
        prev.map((p) =>
          p.id === editando.id
            ? {
                ...p, ...updated,
                localidad_nombre: localidades.find((l) => Number(l.id) === Number(updated.localidad_id))?.nombre || p.localidad_nombre,
                profesion_nombre: profesiones.find((pr) => Number(pr.id) === Number(updated.profesion_id))?.nombre || p.profesion_nombre,
              }
            : p
        )
      );
      setEditando(null);
    } catch (e) {
      if (e.status === 409) {
        setErrEdit((err) => ({ ...err, ci: e.error }));
      } else {
        alert(e.error || "Error al guardar.");
      }
    } finally {
      setSaving(false);
    }
  };

  const misLocalidades = esCoordinador(usuario)
    ? null
    : (usuario?.localidades ?? []).map(Number);

  const filtrados = profesionales.filter((p) => {
    if (misLocalidades !== null && !misLocalidades.includes(Number(p.localidad_id))) return false;
    if (!busqueda.trim()) return true;
    const q = busqueda.toLowerCase();
    return (
      p.nombre?.toLowerCase().includes(q) ||
      p.ci?.includes(busqueda.replace(/\./g, "")) ||
      p.profesion_nombre?.toLowerCase().includes(q) ||
      p.localidad_nombre?.toLowerCase().includes(q) ||
      p.celular?.includes(q) ||
      p.direccion?.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      {/* Encabezado */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: C.texto, letterSpacing: "-0.03em" }}>
          👷 Profesionales
        </h1>
        <p style={{ color: C.grisTexto, marginTop: 4, fontSize: 13 }}>
          Listado de profesionales registrados en el sistema
        </p>
      </div>

      {/* Barra de acciones */}
      {!loading && !error && (
        <div className="admin-header-row" style={{ marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Profesionales ({profesionales.length})</h3>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={generarPDFProfesionales}
              style={{ padding: "9px 18px", background: C.rojo, color: C.blanco, border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
            >
              🖨️ Listado de Profesionales
            </button>
            {!editando && !showNew && (
              <button
                onClick={() => setShowNew(true)}
                style={{ padding: "9px 18px", background: C.azul, color: C.blanco, border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
              >
                + Nuevo Profesional
              </button>
            )}
          </div>
        </div>
      )}

      {/* Formulario nuevo profesional */}
      {showNew && (
        <div className="fade-in" style={{ background: C.azulSuave, borderRadius: 14, padding: 20, marginBottom: 20, border: `1px solid ${C.grisMedio}` }}>
          <h4 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700 }}>Nuevo profesional</h4>
          <div className="admin-form-grid">
            <Campo label="Localidad" required error={errNew.localidad_id}>
              <Select value={nuevoPro.localidad_id} onChange={(e) => setNP("localidad_id", e.target.value)}>
                <option value="">Seleccionar…</option>
                {localidades.map((l) => <option key={l.id} value={l.id}>{l.nombre}</option>)}
              </Select>
            </Campo>

            <Campo label="Profesión" required error={errNew.profesion_id}>
              <Select value={nuevoPro.profesion_id} onChange={(e) => setNP("profesion_id", e.target.value)}>
                <option value="">Seleccionar…</option>
                {profesiones.map((pr) => <option key={pr.id} value={pr.id}>{pr.nombre}</option>)}
              </Select>
            </Campo>

            <Campo label="Céd. de identidad" required error={errNew.ci}>
              <Input
                value={nuevoPro.ci}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
                  setNP("ci", digits.replace(/\B(?=(\d{3})+(?!\d))/g, "."));
                }}
                placeholder="Ej: 3.456.789"
              />
            </Campo>

            <Campo label="Nombre del Profesional" required error={errNew.nombre}>
              <Input
                value={nuevoPro.nombre}
                onChange={(e) => setNP("nombre", e.target.value.slice(0, 200))}
                placeholder="Nombre completo"
              />
            </Campo>

            <Campo label="Celular" required error={errNew.celular}>
              <Input
                value={nuevoPro.celular}
                onChange={(e) => setNP("celular", e.target.value.slice(0, 30))}
                placeholder="Ej: 0981-123.456"
              />
            </Campo>

            <Campo label="Dirección">
              <Input
                value={nuevoPro.direccion}
                onChange={(e) => setNP("direccion", e.target.value.slice(0, 100))}
                placeholder="Dirección"
                maxLength={100}
              />
            </Campo>
          </div>

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
            <button
              onClick={() => { setShowNew(false); setErrNew({}); setNuevoPro({ localidad_id: "", profesion_id: "", ci: "", nombre: "", celular: "", direccion: "" }); }}
              disabled={creating}
              style={{ padding: "8px 18px", background: C.gris, border: `1px solid ${C.grisMedio}`, borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 600, color: C.grisTexto }}
            >
              Cancelar
            </button>
            <button
              onClick={crear}
              disabled={creating}
              style={{ padding: "8px 22px", background: creating ? C.grisMedio : C.azul, color: creating ? C.grisTexto : C.blanco, border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: creating ? "not-allowed" : "pointer" }}
            >
              {creating ? "Creando…" : "Crear"}
            </button>
          </div>
        </div>
      )}

      {/* Panel de edición */}
      {editando && (
        <div className="fade-in" style={{ background: "#FFF9E6", borderRadius: 14, padding: 20, marginBottom: 20, border: "1px solid #F0D070" }}>
          <h4 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700 }}>
            Editar profesional — <span style={{ color: C.azul }}>CI {fmtCI(editando.ci)}</span>
          </h4>
          <div className="admin-form-grid">
            <Campo label="Localidad" required error={errEdit.localidad_id}>
              <Select value={editando.localidad_id} onChange={(e) => setE("localidad_id", e.target.value)}>
                <option value="">Seleccionar…</option>
                {localidades.map((l) => <option key={l.id} value={l.id}>{l.nombre}</option>)}
              </Select>
            </Campo>

            <Campo label="Profesión" required error={errEdit.profesion_id}>
              <Select value={editando.profesion_id} onChange={(e) => setE("profesion_id", e.target.value)}>
                <option value="">Seleccionar…</option>
                {profesiones.map((pr) => <option key={pr.id} value={pr.id}>{pr.nombre}</option>)}
              </Select>
            </Campo>

            <Campo label="Céd. de identidad" required error={errEdit.ci}>
              <Input
                value={editando.ci}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
                  setE("ci", digits.replace(/\B(?=(\d{3})+(?!\d))/g, "."));
                }}
                placeholder="Ej: 3.456.789"
              />
            </Campo>

            <Campo label="Nombre del Profesional" required error={errEdit.nombre}>
              <Input
                value={editando.nombre}
                onChange={(e) => setE("nombre", e.target.value.slice(0, 200))}
                placeholder="Nombre completo"
              />
            </Campo>

            <Campo label="Celular" required error={errEdit.celular}>
              <Input
                value={editando.celular}
                onChange={(e) => setE("celular", e.target.value.slice(0, 30))}
                placeholder="Ej: 0981-123.456"
              />
            </Campo>

            <Campo label="Dirección">
              <Input
                value={editando.direccion}
                onChange={(e) => setE("direccion", e.target.value.slice(0, 100))}
                placeholder="Dirección"
                maxLength={100}
              />
            </Campo>

            <Campo label="Estado" required>
              <Select value={editando.estado_id} onChange={(e) => setE("estado_id", Number(e.target.value))}>
                {ESTADOS.map((est) => <option key={est.id} value={est.id}>{est.nombre}</option>)}
              </Select>
            </Campo>
          </div>

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
            <button
              onClick={() => setEditando(null)}
              disabled={saving}
              style={{ padding: "8px 18px", background: C.gris, border: `1px solid ${C.grisMedio}`, borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 600, color: C.grisTexto }}
            >
              Cancelar
            </button>
            <button
              onClick={guardar}
              disabled={saving}
              style={{ padding: "8px 22px", background: saving ? C.grisMedio : "#D97706", color: saving ? C.grisTexto : C.blanco, border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer" }}
            >
              {saving ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </div>
      )}

      {/* Barra de búsqueda */}
      <div className="admin-header-row" style={{ marginBottom: 16 }}>
        <div style={{ flex: 1, maxWidth: 380, position: "relative" }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 15, color: C.grisTexto, pointerEvents: "none" }}>
            🔍
          </span>
          <Input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, CI, profesión, localidad…"
            style={{ paddingLeft: 36 }}
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {busqueda && (
            <button
              onClick={() => setBusqueda("")}
              style={{ padding: "9px 14px", background: C.gris, border: `1px solid ${C.grisMedio}`, borderRadius: 10, cursor: "pointer", fontSize: 12, color: C.grisTexto, fontWeight: 600 }}
            >
              Limpiar
            </button>
          )}
          <span style={{ fontSize: 13, color: C.grisTexto, fontWeight: 600, whiteSpace: "nowrap" }}>
            {loading ? "" : `${filtrados.length} de ${profesionales.length} registro${profesionales.length !== 1 ? "s" : ""}`}
          </span>
        </div>
      </div>

      {/* Tabla */}
      <div style={{ background: C.blanco, borderRadius: 14, border: `1px solid ${C.grisMedio}`, overflowX: "auto" }}>
        {loading ? (
          <div style={{ padding: 48, display: "flex", justifyContent: "center" }}>
            <Loading text="Cargando profesionales…" />
          </div>
        ) : error ? (
          <div style={{ padding: 32, textAlign: "center", color: C.rojo, fontSize: 14 }}>{error}</div>
        ) : filtrados.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center", color: C.grisTexto, fontSize: 14 }}>
            {busqueda ? "No se encontraron profesionales con ese criterio." : "No hay profesionales registrados."}
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: C.gris }}>
                {["#", "Localidad", "Profesión", "CI", "Nombre", "Celular", "Dirección", "Estado", ""].map((h) => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, color: C.grisTexto, fontSize: 12, borderBottom: `1px solid ${C.grisMedio}`, whiteSpace: "nowrap" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.map((p, i) => {
                const est = ESTADOS.find((e) => e.id === (p.estado_id ?? 1)) || ESTADOS[0];
                return (
                  <tr key={p.id} style={{ backgroundColor: i % 2 === 0 ? C.blanco : C.gris, borderBottom: `1px solid ${C.grisMedio}` }}>
                    <td style={{ padding: "11px 14px", color: C.grisTexto, fontSize: 11, fontFamily: "monospace" }}>{p.id}</td>
                    <td style={{ padding: "11px 14px", fontWeight: 600, whiteSpace: "nowrap" }}>{p.localidad_nombre || "—"}</td>
                    <td style={{ padding: "11px 14px" }}>
                      <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: C.azulSuave, color: C.azul, whiteSpace: "nowrap" }}>
                        {p.profesion_nombre || "—"}
                      </span>
                    </td>
                    <td style={{ padding: "11px 14px", fontFamily: "monospace", fontSize: 12, color: C.grisTexto, whiteSpace: "nowrap" }}>{fmtCI(p.ci)}</td>
                    <td style={{ padding: "11px 14px", fontWeight: 700 }}>{p.nombre}</td>
                    <td style={{ padding: "11px 14px", color: C.grisTexto }}>{p.celular || "—"}</td>
                    <td style={{ padding: "11px 14px", color: C.grisTexto, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.direccion || "—"}</td>
                    <td style={{ padding: "11px 14px" }}>
                      <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: est.bg, color: est.color }}>
                        {est.nombre}
                      </span>
                    </td>
                    <td style={{ padding: "11px 14px" }}>
                      <button
                        onClick={() => abrirEdicion(p)}
                        style={{ padding: "5px 12px", background: "#FEF3C7", color: "#92400E", border: "none", borderRadius: 8, fontSize: 11, cursor: "pointer", fontWeight: 600 }}
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
