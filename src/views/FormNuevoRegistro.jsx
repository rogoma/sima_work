import React, { useState, useRef } from "react";
import { C } from "../styles/colors";
import { crearRegistro, crearRegistrosBatch, corregirRegistro, subirEvidencia, verificarCI } from "../services/api";
import { fmt } from "../services/helpers";
import { CatBadge, Badge } from "../components/Badges";
import { Campo, Input, Select, Textarea } from "../components/FormFields";
import { Modal } from "../components/Overlays";

const uid = () => Math.random().toString(36).slice(2);

const EVID_KEYS = ["evidencia_url", "evidencia_url_2", "evidencia_url_3"];

// Parcela vacía con todos los campos del detalle
const parcelaVacia = (modalidad_id = "") => ({
  key: uid(),
  manzana: "", lote: "",
  fecha_ejec: "",
  modalidad_id,
  evidencia_url: "", evidencia_url_2: "", evidencia_url_3: "",
  uploading: [false, false, false],
  observaciones: "",
});

// ─── Sección de evidencias para una parcela ───────────────────────────────────
function EvidenciasParcela({ parcela, fileRefsMap, onActualizar }) {
  const handleUpload = async (e, idx) => {
    const file = e.target.files[0];
    if (!file) return;
    const up = [...parcela.uploading]; up[idx] = true;
    onActualizar(parcela.key, "uploading", up);
    try {
      const data = await subirEvidencia(file);
      onActualizar(parcela.key, EVID_KEYS[idx], data.url);
    } catch (err) {
      alert(err.error || "Error al subir archivo");
    } finally {
      const up2 = [...parcela.uploading]; up2[idx] = false;
      onActualizar(parcela.key, "uploading", up2);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {EVID_KEYS.map((key, idx) => {
        const url = parcela[key];
        const isUploading = parcela.uploading[idx];
        const prevFilled = idx === 0 || !!parcela[EVID_KEYS[idx - 1]];
        if (!prevFilled) return null;
        const refKey = `${parcela.key}_${idx}`;
        return (
          <div key={key}>
            <input
              ref={el => { if (el) fileRefsMap.current[refKey] = el; }}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              style={{ display: "none" }}
              onChange={(e) => handleUpload(e, idx)}
            />
            <div
              style={{ border: `2px dashed ${url ? C.verde : C.grisBorde}`, borderRadius: 10, padding: "10px 14px", background: url ? C.verdeC : C.gris, cursor: "pointer", display: "flex", alignItems: "center", gap: 10, transition: "all 0.2s" }}
              onClick={() => fileRefsMap.current[refKey]?.click()}
            >
              <span style={{ fontSize: 20 }}>{isUploading ? "⏳" : url ? "✅" : "📷"}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.grisTexto }}>
                  Evidencia {idx + 1}{idx === 0 ? " *" : " (opcional)"}
                </div>
                <div style={{ fontSize: 12, color: url ? "#065F46" : C.grisTexto, fontWeight: 600 }}>
                  {isUploading ? "Subiendo..." : url ? url.split("/").pop() : "Clic para adjuntar · JPG, PNG, WEBP o PDF · Máx. 5 MB"}
                </div>
              </div>
              {url && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onActualizar(parcela.key, key, ""); }}
                  style={{ background: "none", border: "none", cursor: "pointer", color: C.rojo, fontSize: 16, padding: 4 }}
                >✕</button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Modal: Gestión de Parcelas ───────────────────────────────────────────────
// Recibe los datos del beneficiario (header) y graba directamente al confirmar.
function ModalGestionParcelas({
  // Datos del beneficiario (header)
  localidad_id, titular, ci, celular,
  // Otros datos
  parcelasExistentes,
  parcelasIniciales,
  registros,
  localidades,
  misModalidades,
  modNombre, modCat,
  soloUna,
  esEdicion,
  registroEditarId,
  registroEditarEstadoId,
  onGuardar,
  onCerrar,
}) {
  const defaultModalidad = misModalidades.length === 1 ? String(misModalidades[0].id) : "";

  const [parcelas, setParcelas] = useState(
    parcelasIniciales.length > 0
      ? parcelasIniciales.map((p) => ({ ...parcelaVacia(p.modalidad_id || defaultModalidad), ...p, uploading: p.uploading || [false, false, false] }))
      : [parcelaVacia(defaultModalidad)]
  );
  const [errores, setErrores] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const fileRefsMap = useRef({});

  const locNombre = (id) => localidades.find((l) => Number(l.id) === Number(id))?.nombre || String(id);

  const agregar = () =>
    setParcelas((prev) => [...prev, parcelaVacia(defaultModalidad)]);

  const quitar = (key) =>
    setParcelas((prev) => prev.filter((p) => p.key !== key));

  const actualizar = (key, campo, valor) =>
    setParcelas((prev) =>
      prev.map((p) => (p.key === key ? { ...p, [campo]: valor } : p))
    );

  const validar = () => {
    const e = {};

    if (!localidad_id) e._localidad = "Seleccione localidad antes de agregar parcelas.";
    if (!titular.trim()) e._titular  = "Ingrese el nombre del titular.";
    if (!ci.trim())      e._ci       = "Ingrese la cédula.";

    parcelas.forEach((p, i) => {
      if (!p.manzana.trim())                e[`mz_${i}`]   = "Requerido";
      else if (p.manzana.trim().length < 2) e[`mz_${i}`]   = "Mín. 2 dígitos";
      if (!p.lote.trim())                   e[`lt_${i}`]   = "Requerido";
      else if (p.lote.trim().length < 2)    e[`lt_${i}`]   = "Mín. 2 dígitos";
      if (!p.fecha_ejec)                    e[`fe_${i}`]   = "Requerido";
      if (!p.modalidad_id)                  e[`mod_${i}`]  = "Seleccione estrategia";
      if (!p.evidencia_url)                 e[`ev_${i}`]   = "Adjunte al menos una evidencia";

      // Duplicado en lista
      parcelas.forEach((q, j) => {
        if (i < j &&
          p.manzana.trim().toLowerCase() === q.manzana.trim().toLowerCase() &&
          p.lote.trim().toLowerCase()    === q.lote.trim().toLowerCase()) {
          e[`dup_${i}`] = "Parcela duplicada";
          e[`dup_${j}`] = "Parcela duplicada";
        }
      });

      // Duplicado validado en BD
      if (localidad_id && p.manzana && p.lote) {
        const dupVal = registros.find(
          (r) =>
            String(r.localidad_id) === String(localidad_id) &&
            r.manzana?.trim().toLowerCase() === p.manzana.trim().toLowerCase() &&
            r.lote?.trim().toLowerCase()    === p.lote.trim().toLowerCase() &&
            r.estado === "validado"
        );
        if (dupVal) e[`dup_${i}`] = `Mz/Lt ya VALIDADO (${dupVal.id})`;
      }
    });

    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const guardar = async () => {
    if (!validar()) return;
    setSubmitting(true);
    const ciRaw = ci.replace(/\./g, "");
    try {
      if (esEdicion) {
        const p = parcelas[0];
        await corregirRegistro(registroEditarId, {
          localidad_id, tipo: "conectado", modalidad_id: p.modalidad_id, titular, ci: ciRaw, celular,
          manzana: p.manzana, lote: p.lote, fecha_ejec: p.fecha_ejec,
          evidencia_url: p.evidencia_url, evidencia_url_2: p.evidencia_url_2 || null,
          evidencia_url_3: p.evidencia_url_3 || null, observaciones: p.observaciones || null,
          estado_id: registroEditarEstadoId,
        });
      } else if (parcelas.length === 1) {
        const p = parcelas[0];
        await crearRegistro({
          localidad_id, tipo: "conectado", modalidad_id: p.modalidad_id, titular, ci: ciRaw, celular,
          manzana: p.manzana, lote: p.lote, fecha_ejec: p.fecha_ejec,
          evidencia_url: p.evidencia_url, evidencia_url_2: p.evidencia_url_2 || null,
          evidencia_url_3: p.evidencia_url_3 || null, observaciones: p.observaciones || null,
        });
      } else {
        await crearRegistrosBatch(
          { localidad_id, tipo: "conectado", titular, ci: ciRaw, celular },
          parcelas.map((p) => ({
            manzana: p.manzana, lote: p.lote, fecha_ejec: p.fecha_ejec,
            modalidad_id: p.modalidad_id,
            evidencia_url: p.evidencia_url, evidencia_url_2: p.evidencia_url_2 || null,
            evidencia_url_3: p.evidencia_url_3 || null,
            observaciones: p.observaciones || null,
          }))
        );
      }
      onGuardar();
    } catch (err) {
      alert(err.error || "Error al guardar");
    } finally {
      setSubmitting(false);
    }
  };

  const tieneErroresHeader = errores._localidad || errores._titular || errores._ci;

  return (
    <Modal title="📍 Registro de Parcelas" onClose={onCerrar} width={680}>

      {/* Encabezado del beneficiario */}
      <div style={{ background: C.azulSuave, border: `1px solid ${C.azul}30`, borderRadius: 10, padding: "12px 16px", marginBottom: 20, display: "flex", gap: 24, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.azul, textTransform: "uppercase", letterSpacing: "0.05em" }}>Beneficiario</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.texto }}>{titular || <span style={{ color: C.rojo }}>Sin nombre</span>}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.azul, textTransform: "uppercase", letterSpacing: "0.05em" }}>CI</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.texto }}>{ci || <span style={{ color: C.rojo }}>Sin CI</span>}</div>
        </div>
        {localidad_id && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.azul, textTransform: "uppercase", letterSpacing: "0.05em" }}>Localidad</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.texto }}>{locNombre(localidad_id)}</div>
          </div>
        )}
      </div>

      {/* Errores del header */}
      {tieneErroresHeader && (
        <div style={{ padding: "10px 14px", background: C.rojoClaro, border: `1px solid #FCA5A5`, borderRadius: 9, marginBottom: 16, fontSize: 13, color: C.rojo, fontWeight: 600 }}>
          ⚠️ {errores._localidad || errores._titular || errores._ci}
        </div>
      )}

      {/* Parcelas existentes en BD */}
      {parcelasExistentes.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.grisTexto, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
            Registros ya cargados para esta CI
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {parcelasExistentes.map((p) => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "7px 12px", background: C.gris, borderRadius: 8, border: `1px solid ${C.grisMedio}` }}>
                <span style={{ fontFamily: "monospace", fontSize: 11, color: C.azul, fontWeight: 700, minWidth: 50 }}>{p.id}</span>
                <span style={{ fontSize: 12, color: C.texto, flex: 1 }}>Mz {p.manzana} / Lt {p.lote}</span>
                <span style={{ fontSize: 11, color: C.grisTexto }}>{fmt(p.fecha_ejec)}</span>
                <Badge estado={p.estado} />
              </div>
            ))}
          </div>
          <div style={{ marginTop: 8, padding: "7px 12px", background: "#FFFBEB", border: "1px solid #FCD34D", borderRadius: 8, fontSize: 12, color: "#92400E" }}>
            ⚠️ Las parcelas que agregue se sumarán a las ya existentes.
          </div>
        </div>
      )}

      {/* Lista de parcelas a registrar */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {parcelas.map((p, i) => (
          <div key={p.key} style={{ border: `1.5px solid ${C.grisMedio}`, borderRadius: 12, overflow: "hidden" }}>
            {/* Cabecera de la parcela */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", background: C.gris, borderBottom: `1px solid ${C.grisMedio}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 26, height: 26, borderRadius: 7, background: C.azul, color: C.blanco, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800 }}>
                  {i + 1}
                </div>
                <span style={{ fontSize: 14, fontWeight: 700, color: C.texto }}>
                  {p.manzana && p.lote ? `Manzana ${p.manzana} — Lote ${p.lote}` : "Nueva parcela"}
                </span>
              </div>
              {!soloUna && parcelas.length > 1 && (
                <button
                  onClick={() => quitar(p.key)}
                  style={{ background: C.rojoClaro, border: `1px solid #FCA5A5`, borderRadius: 7, cursor: "pointer", color: C.rojo, fontSize: 12, fontWeight: 700, padding: "4px 10px" }}
                >
                  Quitar
                </button>
              )}
            </div>

            {/* Cuerpo de la parcela */}
            <div style={{ padding: "16px" }}>
              {/* Manzana, Lote, Fecha */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: C.grisTexto, display: "block", marginBottom: 5 }}>
                    Manzana <span style={{ color: C.rojo }}>*</span>
                  </label>
                  <Input
                    value={p.manzana}
                    onChange={(e) => actualizar(p.key, "manzana", e.target.value.slice(0, 6))}
                    placeholder="Ej: 12"
                    style={{ borderColor: (errores[`mz_${i}`] || errores[`dup_${i}`]) ? C.rojo : undefined }}
                  />
                  {errores[`mz_${i}`] && <div style={{ fontSize: 11, color: C.rojo, marginTop: 3 }}>{errores[`mz_${i}`]}</div>}
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: C.grisTexto, display: "block", marginBottom: 5 }}>
                    Lote <span style={{ color: C.rojo }}>*</span>
                  </label>
                  <Input
                    value={p.lote}
                    onChange={(e) => actualizar(p.key, "lote", e.target.value.slice(0, 6))}
                    placeholder="Ej: 05"
                    style={{ borderColor: (errores[`lt_${i}`] || errores[`dup_${i}`]) ? C.rojo : undefined }}
                  />
                  {errores[`lt_${i}`] && <div style={{ fontSize: 11, color: C.rojo, marginTop: 3 }}>{errores[`lt_${i}`]}</div>}
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: C.grisTexto, display: "block", marginBottom: 5 }}>
                    Fecha de ejecución <span style={{ color: C.rojo }}>*</span>
                  </label>
                  <Input
                    type="date"
                    value={p.fecha_ejec}
                    max={new Date().toISOString().split("T")[0]}
                    onChange={(e) => actualizar(p.key, "fecha_ejec", e.target.value)}
                    style={{ borderColor: errores[`fe_${i}`] ? C.rojo : undefined }}
                  />
                  {errores[`fe_${i}`] && <div style={{ fontSize: 11, color: C.rojo, marginTop: 3 }}>{errores[`fe_${i}`]}</div>}
                </div>
              </div>

              {/* Error de duplicado */}
              {errores[`dup_${i}`] && (
                <div style={{ fontSize: 12, color: C.rojo, marginBottom: 12, fontWeight: 600 }}>
                  🚫 {errores[`dup_${i}`]}
                </div>
              )}

              {/* Estrategia */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: C.grisTexto, display: "block", marginBottom: 5 }}>
                  Estrategia <span style={{ color: C.rojo }}>*</span>
                </label>
                <Select
                  value={p.modalidad_id}
                  onChange={(e) => actualizar(p.key, "modalidad_id", e.target.value)}
                  style={{ borderColor: errores[`mod_${i}`] ? C.rojo : undefined }}
                >
                  <option value="">Seleccionar...</option>
                  {["JUNTA", "CONTRATISTA", "ICARO", "TRABAJADORA SOCIAL"].map((cat) => {
                    const mods = misModalidades.filter((m) => m.cat === cat);
                    if (!mods.length) return null;
                    return (
                      <optgroup key={cat} label={`── ${cat} ──`}>
                        {mods.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                      </optgroup>
                    );
                  })}
                </Select>
                {errores[`mod_${i}`] && <div style={{ fontSize: 11, color: C.rojo, marginTop: 3 }}>{errores[`mod_${i}`]}</div>}
                {p.modalidad_id && (
                  <div style={{ marginTop: 6, display: "flex", gap: 6, alignItems: "center" }}>
                    <CatBadge cat={modCat(p.modalidad_id)} />
                    <span style={{ fontSize: 11, color: C.grisTexto }}>{modNombre(p.modalidad_id)}</span>
                  </div>
                )}
              </div>

              {/* Evidencias */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: C.grisTexto, display: "block", marginBottom: 8 }}>
                  Evidencia fotográfica <span style={{ color: C.rojo }}>*</span>
                </label>
                {errores[`ev_${i}`] && (
                  <div style={{ fontSize: 11, color: C.rojo, marginBottom: 6, fontWeight: 600 }}>{errores[`ev_${i}`]}</div>
                )}
                <EvidenciasParcela
                  parcela={p}
                  fileRefsMap={fileRefsMap}
                  onActualizar={actualizar}
                />
              </div>

              {/* Observaciones */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: C.grisTexto, display: "block", marginBottom: 5 }}>
                  Observaciones
                </label>
                <Textarea
                  value={p.observaciones}
                  onChange={(e) => actualizar(p.key, "observaciones", e.target.value)}
                  placeholder="Notas adicionales..."
                  style={{ minHeight: 60 }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Botón agregar parcela */}
      {!soloUna && (
        <button
          onClick={agregar}
          style={{ marginTop: 14, padding: "10px 18px", background: C.blanco, border: `1.5px dashed ${C.azul}`, borderRadius: 10, cursor: "pointer", fontSize: 13, color: C.azul, fontWeight: 700, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
        >
          <span style={{ fontSize: 20, lineHeight: 1 }}>+</span> Agregar otra parcela
        </button>
      )}

      {/* Pie del modal */}
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 18, marginTop: 18, borderTop: `1px solid ${C.grisMedio}` }}>
        <button
          onClick={onCerrar}
          disabled={submitting}
          style={{ padding: "10px 20px", background: C.gris, border: `1px solid ${C.grisMedio}`, borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 600, color: C.grisTexto }}
        >
          Cancelar
        </button>
        <button
          onClick={guardar}
          disabled={submitting}
          style={{ padding: "10px 28px", background: submitting ? C.grisMedio : `linear-gradient(135deg,${C.verde},#047857)`, color: submitting ? C.grisTexto : C.blanco, border: "none", borderRadius: 10, cursor: submitting ? "wait" : "pointer", fontSize: 13, fontWeight: 700, boxShadow: submitting ? "none" : "0 4px 14px rgba(5,150,105,0.3)" }}
        >
          {submitting
            ? (parcelas.length > 1 ? `Guardando ${parcelas.length} registros...` : "Guardando...")
            : esEdicion
              ? "Actualizar Registro ✓"
              : parcelas.length > 1
                ? `💾 Guardar ${parcelas.length} Registros`
                : "💾 Guardar Registro"}
        </button>
      </div>
    </Modal>
  );
}

// ─── Formulario principal ─────────────────────────────────────────────────────
export default function FormNuevoRegistro({ usuario, registros, onGuardar, onCancel, registroEditar = null, localidades, modalidades }) {
  const locales = usuario.localidades?.length
    ? localidades.filter((l) => usuario.localidades.map(Number).includes(Number(l.id)))
    : localidades;

  const misModalidades = (() => {
    const rid = usuario.rol_id;
    if (rid === 1) return modalidades.filter((m) => Number(m.id) >= 1 && Number(m.id) <= 13);
    if (rid === 2) return modalidades.filter((m) => Number(m.id) === 2);
    if (rid === 3) return modalidades.filter((m) => Number(m.id) >= 3 && Number(m.id) <= 12);
    if (rid === 4) return modalidades.filter((m) => Number(m.id) === 1);
    if (rid === 7) return modalidades.filter((m) => Number(m.id) === 13);
    return modalidades;
  })();

  const esEdicion = !!registroEditar;

  // ── Estado del header (datos del beneficiario) ─────────────────────────────
  const [form, setForm] = useState({
    localidad_id: registroEditar?.localidad_id || (locales.length === 1 ? locales[0].id : ""),
    titular:      registroEditar?.titular      || "",
    ci:           registroEditar?.ci           || "",
    celular:      registroEditar?.celular      || "",
  });

  // Parcelas ya configuradas (resumen en el form principal)
  const [parcelasConfirmadas, setParcelasConfirmadas] = useState(
    esEdicion
      ? [{
          key: "edit",
          manzana:       registroEditar.manzana       || "",
          lote:          registroEditar.lote           || "",
          fecha_ejec:    registroEditar.fecha_ejec?.split("T")[0] || "",
          modalidad_id:  registroEditar.modalidad_id  ? String(registroEditar.modalidad_id) : "",
          evidencia_url:   registroEditar.evidencia_url   || "",
          evidencia_url_2: registroEditar.evidencia_url_2 || "",
          evidencia_url_3: registroEditar.evidencia_url_3 || "",
          observaciones: registroEditar.observaciones  || "",
          uploading: [false, false, false],
        }]
      : []
  );

  const [parcelasExistentes, setParcelasExistentes] = useState([]);
  const [modalAbierto, setModalAbierto]     = useState(false);
  const [erroresForm, setErroresForm]       = useState({});
  const [ciConsultada, setCiConsultada]     = useState(""); // última CI consultada
  // ciEncontrado: null si no existe, o { titular, celular, cantParcelas } si existe
  const [ciEncontrado, setCiEncontrado]     = useState(null);
  const [buscandoCI, setBuscandoCI]         = useState(false);

  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const locNombre = (id) => localidades.find((l) => Number(l.id) === Number(id))?.nombre || id;
  const modNombre = (id) => modalidades.find((m) => Number(m.id) === Number(id))?.nombre || id;
  const modCat    = (id) => modalidades.find((m) => Number(m.id) === Number(id))?.cat    || "";

  // Valida el header antes de abrir el modal
  const validarHeader = () => {
    const e = {};
    if (!form.localidad_id) e.localidad_id = "Seleccione la localidad.";
    if (!form.titular.trim()) e.titular = "Ingrese el nombre.";
    if (!form.ci.trim()) e.ci = "Ingrese la cédula.";
    setErroresForm(e);
    return Object.keys(e).length === 0;
  };

  // Consulta la CI en BD: pre-llena nombre/celular y guarda info del beneficiario.
  // Se llama en onBlur del campo CI. NO abre el modal.
  const consultarCI = async () => {
    if (esEdicion) return;
    const ciRaw = form.ci.replace(/\./g, "").trim();
    if (ciRaw.length < 5 || ciRaw === ciConsultada) return;
    setBuscandoCI(true);
    try {
      const res = await verificarCI(ciRaw);
      if (res?.existe) {
        // Pre-llenar nombre y celular si el campo está vacío
        if (!form.titular.trim() && res.titular) setF("titular", res.titular);
        if (!form.celular?.trim() && res.celular) setF("celular", res.celular);
        setParcelasExistentes(res.parcelas || []);
        setCiEncontrado({ titular: res.titular, celular: res.celular, cantParcelas: (res.parcelas || []).length });
      } else {
        setParcelasExistentes([]);
        setCiEncontrado(null);
      }
      setCiConsultada(ciRaw);
    } catch { /* silencioso */ }
    finally { setBuscandoCI(false); }
  };

  // Abre el modal: valida header y reutiliza datos ya cacheados de la CI
  const abrirModal = async () => {
    if (!validarHeader()) return;
    const ciRaw = form.ci.replace(/\./g, "").trim();
    // Solo re-consulta si la CI cambió desde la última vez
    if (!esEdicion && ciRaw !== ciConsultada) {
      await consultarCI();
    }
    setModalAbierto(true);
  };

  const ciValida = form.ci.replace(/\./g, "").trim().length >= 5;

  return (
    <div>
      {/* Encabezado */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: C.texto, letterSpacing: "-0.03em" }}>
          {esEdicion ? "✏️ Corregir Registro" : "➕ Nuevo Registro"}
        </h1>
        <button
          onClick={onCancel}
          style={{ padding: "8px 16px", background: C.rojo, border: `1px solid ${C.grisMedio}`, borderRadius: 10, cursor: "pointer", fontSize: 13, color: C.blanco, fontWeight: 600 }}
        >
          Cancelar
        </button>
      </div>

      <div style={{ background: C.blanco, borderRadius: 14, padding: "24px 32px", border: `1px solid ${C.grisMedio}`, boxShadow: "0 1px 6px rgba(18,85,161,0.04)" }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: C.texto, margin: "0 0 20px" }}>
          Datos del Beneficiario
        </h3>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

          {/* Localidad */}
          <div style={{ gridColumn: "1/-1" }}>
            <Campo label="Localidad" required error={erroresForm.localidad_id}>
              <Select
                value={form.localidad_id}
                onChange={(e) => setF("localidad_id", e.target.value)}
                disabled={locales.length === 1}
              >
                <option value="">Seleccionar...</option>
                {locales.map((l) => <option key={l.id} value={l.id}>{l.nombre}</option>)}
              </Select>
            </Campo>
          </div>          

          {/* 1. CI — onBlur busca en BD */}
          <div style={{ gridColumn: "1/-1" }}>
            <Campo label="Céd. de identidad" required error={erroresForm.ci}>
              <div style={{ position: "relative" }}>
                <Input
                  value={form.ci}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
                    const formatted = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
                    setF("ci", formatted);
                    if (!esEdicion) {
                      setParcelasConfirmadas([]);
                      setParcelasExistentes([]);
                      setCiConsultada("");
                      setCiEncontrado(null);
                    }
                  }}
                  onBlur={consultarCI}
                  placeholder="Ej: 3.456.789"
                  style={{ paddingRight: buscandoCI ? 36 : undefined }}
                />
                {buscandoCI && (
                  <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 16 }}>⏳</span>
                )}
              </div>
            </Campo>
          </div>

          {/* 2. Nombre del titular — se deshabilita si la CI ya existe en BD */}
          <div style={{ gridColumn: "1/-1" }}>
            <Campo label="Nombre del titular" required error={erroresForm.titular}>
              <Input
                value={form.titular}
                onChange={(e) => setF("titular", e.target.value.slice(0, 60))}
                placeholder="Ej: Juan Ramírez"
                maxLength={60}
                disabled={!esEdicion && !!ciEncontrado}
                style={!esEdicion && ciEncontrado ? { background: C.gris, color: C.grisTexto, cursor: "not-allowed" } : undefined}
              />
            </Campo>
          </div>

          {/* 3. Celular — después de Titular, NO abre modal */}
          <Campo label="Celular">
            <Input
              value={form.celular}
              onChange={(e) => setF("celular", e.target.value.slice(0, 12))}
              placeholder="Ej: 0981-123.456"
              maxLength={12}
            />
          </Campo>

        </div>

        {/* ── Banner: beneficiario encontrado en BD (sin botón, solo info) ── */}
        {!esEdicion && ciEncontrado && (
          <div className="fade-in" style={{ marginTop: 16, padding: "12px 16px", background: "#EFF6FF", border: `1px solid ${C.azul}40`, borderRadius: 11, display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 22, flexShrink: 0 }}>👤</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.azul }}>Beneficiario encontrado</div>
              <div style={{ fontSize: 12, color: C.grisTexto, marginTop: 2 }}>
                <strong>{ciEncontrado.titular}</strong>
                {ciEncontrado.cantParcelas > 0
                  ? ` · ${ciEncontrado.cantParcelas} parcela${ciEncontrado.cantParcelas !== 1 ? "s" : ""} registrada${ciEncontrado.cantParcelas !== 1 ? "s" : ""}`
                  : " · Sin parcelas previas"}
              </div>
            </div>
          </div>
        )}

        {/* ── Sección parcelas ── */}
        <div style={{ marginTop: 24, padding: "18px 20px", background: C.gris, borderRadius: 12, border: `1px solid ${C.grisMedio}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.texto }}>
              📍 Parcelas / Registros
              {parcelasConfirmadas.length > 0 && (
                <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 600, color: C.verde }}>
                  — {parcelasConfirmadas.length} lista{parcelasConfirmadas.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            <button
              onClick={abrirModal}
              style={{
                padding: "8px 18px",
                background: parcelasConfirmadas.length > 0 ? C.blanco : `linear-gradient(135deg,${C.azul},${C.azulMedio})`,
                color: parcelasConfirmadas.length > 0 ? C.azul : C.blanco,
                border: parcelasConfirmadas.length > 0 ? `1.5px solid ${C.azul}` : "none",
                borderRadius: 9, cursor: "pointer", fontSize: 13, fontWeight: 700,
              }}
            >
              {esEdicion
                ? "✏️ Editar registro"
                : parcelasConfirmadas.length > 0
                  ? "✏️ Editar parcelas"
                  : ciEncontrado
                    ? "➕ Agregar más parcelas"
                    : "➕ Agregar parcelas"}
            </button>
          </div>

          {parcelasConfirmadas.length === 0 ? (
            <div style={{ padding: "14px 16px", background: C.blanco, borderRadius: 9, border: `1.5px dashed ${C.grisMedio}`, color: C.grisTexto, fontSize: 13, textAlign: "center" }}>
              {ciValida
                ? "Haga clic en \"Agregar parcelas\" para cargar los datos del registro"
                : "Ingrese primero los datos del beneficiario"}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {parcelasConfirmadas.map((p, i) => (
                <div key={p.key} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: C.verdeC, border: `1px solid #6EE7B7`, borderRadius: 9 }}>
                  <div style={{ width: 24, height: 24, borderRadius: 6, background: C.verde, color: C.blanco, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, flexShrink: 0 }}>
                    {i + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#065F46" }}>
                      Manzana <strong>{p.manzana}</strong> — Lote <strong>{p.lote}</strong>
                    </div>
                    <div style={{ fontSize: 11, color: "#047857", marginTop: 2 }}>
                      {fmt(p.fecha_ejec)} · {modNombre(p.modalidad_id)}
                      {p.evidencia_url && " · 📷 con evidencia"}
                    </div>
                  </div>
                  <span style={{ fontSize: 16 }}>✅</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Nota de tipo asumido */}
        <div style={{ marginTop: 12, fontSize: 12, color: C.grisTexto, display: "flex", alignItems: "center", gap: 6 }}>
          <span>🔗</span>
          <span>Tipo de registro: <strong>Conectado a la Red</strong> (asumido por defecto)</span>
        </div>
      </div>

      {/* ── Modal de gestión de parcelas ── */}
      {modalAbierto && (
        <ModalGestionParcelas
          localidad_id={form.localidad_id}
          titular={form.titular}
          ci={form.ci}
          celular={form.celular}
          parcelasExistentes={parcelasExistentes}
          parcelasIniciales={parcelasConfirmadas}
          registros={registros}
          localidades={localidades}
          misModalidades={misModalidades}
          modNombre={modNombre}
          modCat={modCat}
          soloUna={esEdicion}
          esEdicion={esEdicion}
          registroEditarId={registroEditar?.id}
          registroEditarEstadoId={registroEditar?.estado_id}
          onGuardar={() => {
            setModalAbierto(false);
            onGuardar(esEdicion);
          }}
          onCerrar={() => setModalAbierto(false)}
        />
      )}
    </div>
  );
}
