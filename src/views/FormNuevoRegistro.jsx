import React, { useState, useRef, useEffect } from "react";
import { C } from "../styles/colors";
import { crearRegistro, corregirRegistro, subirEvidencia } from "../services/api";
import { fmt } from "../services/helpers";
import { CatBadge } from "../components/Badges";
import { Campo, Input, Select, Textarea } from "../components/FormFields";

export default function FormNuevoRegistro({ usuario, registros, onGuardar, onCancel, registroEditar = null, localidades, modalidades }) {
  const locales = usuario.localidades?.length ? localidades.filter((l) => usuario.localidades.map(Number).includes(Number(l.id))) : localidades;
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

  const [paso, setPaso] = useState(1);
  const [form, setForm] = useState({
    localidad_id: registroEditar?.localidad_id || (locales.length === 1 ? locales[0].id : ""),
    titular: registroEditar?.titular || "", ci: registroEditar?.ci || "",
    celular: registroEditar?.celular || "", manzana: registroEditar?.manzana || "",
    lote: registroEditar?.lote || "", tipo: registroEditar?.tipo || "conectado",
    modalidad_id: registroEditar?.modalidad_id || (misModalidades.length === 1 ? String(misModalidades[0].id) : ""), fecha_ejec: registroEditar?.fecha_ejec?.split("T")[0] || "",
    observaciones: registroEditar?.observaciones || "",
    evidencia_url: registroEditar?.evidencia_url || "",
    evidencia_url_2: registroEditar?.evidencia_url_2 || "",
    evidencia_url_3: registroEditar?.evidencia_url_3 || "",
  });
  const [errores, setErrores] = useState({});
  const [alertaDup, setAlertaDup] = useState(null);
  const [bloqueoDup, setBloqueoDup] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState([false, false, false]);
  const fileRef1 = useRef(null);
  const fileRef2 = useRef(null);
  const fileRef3 = useRef(null);
  const fileInputRefs = [fileRef1, fileRef2, fileRef3];

  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!form.manzana.trim() || !form.lote.trim() || !form.localidad_id) {
      setAlertaDup(null);
      setBloqueoDup(false);
      return;
    }
    const dup = registros.find((r) =>
      String(r.localidad_id) === String(form.localidad_id) &&
      r.manzana?.trim().toLowerCase() === form.manzana.trim().toLowerCase() &&
      r.lote?.trim().toLowerCase() === form.lote.trim().toLowerCase() &&
      (!esEdicion || r.id !== registroEditar.id)
    );
    if (dup) {
      setAlertaDup({ tipo: "bloqueo", msg: `Manzana ${form.manzana} / Lote ${form.lote} ya está registrado en ${locNombre(form.localidad_id)} (Titular: ${dup.titular}).` });
      setBloqueoDup(true);
    } else {
      setAlertaDup(null);
      setBloqueoDup(false);
    }
  }, [form.manzana, form.lote, form.localidad_id]);
  const locNombre = (id) => localidades.find((l) => Number(l.id) === Number(id))?.nombre || id;
  const modNombre = (id) => modalidades.find((m) => Number(m.id) === Number(id))?.nombre || id;
  const modCat = (id) => modalidades.find((m) => Number(m.id) === Number(id))?.cat || "";

  const EVID_KEYS = ["evidencia_url", "evidencia_url_2", "evidencia_url_3"];

  const handleFileUpload = async (e, idx) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(prev => prev.map((v, i) => i === idx ? true : v));
    try {
      const data = await subirEvidencia(file);
      setF(EVID_KEYS[idx], data.url);
    } catch (err) { alert(err.error || "Error al subir archivo"); }
    finally { setUploading(prev => prev.map((v, i) => i === idx ? false : v)); }
  };

  const validarPaso = (p) => {
    const e = {};
    if (p === 1) {
      if (!form.localidad_id) e.localidad_id = "Seleccione la localidad.";
      if (!form.titular.trim()) e.titular = "Ingrese el nombre.";
      if (!form.ci.trim()) e.ci = "Ingrese la cédula.";
      if (!form.manzana.trim()) e.manzana = "Ingrese manzana.";
      else if (form.manzana.trim().length < 2) e.manzana = "Mínimo 2 dígitos.";
      if (!form.lote.trim()) e.lote = "Ingrese lote.";
      else if (form.lote.trim().length < 2) e.lote = "Mínimo 2 dígitos.";
    }
    if (p === 2) { if (!form.modalidad_id) e.modalidad_id = "Seleccione modalidad."; if (!form.fecha_ejec) e.fecha_ejec = "Ingrese fecha."; }
    if (p === 3) { if (!form.evidencia_url) e.evidencia_url = "Adjunte evidencia."; }
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const siguiente = () => { if (validarPaso(paso) && !bloqueoDup) setPaso((p) => Math.min(4, p + 1)); };
  const anterior = () => { setPaso((p) => Math.max(1, p - 1)); setErrores({}); };

  const confirmar = async () => {
    setSubmitting(true);
    try {
      const payload = { ...form, estado_id: 5, ci: form.ci.replace(/\./g, "") };
      if (esEdicion) await corregirRegistro(registroEditar.id, payload);
      else await crearRegistro(payload);
      onGuardar(esEdicion);
    } catch (e) { alert(e.error || "Error al guardar registro"); }
    finally { setSubmitting(false); }
  };

  const pasos = ["Beneficiario", "Tipo y Estrategia", "Evidencia", "Confirmación"];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>        
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: C.texto, letterSpacing: "-0.03em" }}>{esEdicion ? "✏️ Corregir Registro" : "➕ Nuevo Registro"}</h1>
        <button onClick={onCancel} style={{ padding: "8px 16px", background: C.rojo, border: `1px solid ${C.grisMedio}`, borderRadius: 10, cursor: "pointer", fontSize: 13, color: C.blanco, fontWeight: 600 }}>Cancelar</button>
      </div>

      {/* Stepper */}
      <div style={{ display: "flex", gap: 0, marginBottom: 28, background: C.blanco, borderRadius: 14, border: `1px solid ${C.grisMedio}`, overflow: "hidden" }}>
        {pasos.map((p, i) => {
          const n = i + 1; const activo = n === paso; const completo = n < paso;
          return (
            <div key={n} style={{ flex: 1, padding: "14px 16px", background: activo ? `linear-gradient(135deg,${C.azul},${C.azulMedio})` : completo ? C.verdeC : C.gris, borderRight: i < 3 ? `1px solid ${C.grisMedio}` : "none", display: "flex", alignItems: "center", gap: 8, cursor: completo ? "pointer" : "default", transition: "all 0.3s" }} onClick={() => completo && setPaso(n)}>
              <div style={{ width: 26, height: 26, borderRadius: "50%", background: activo ? C.blanco : completo ? C.verde : "#CBD5E1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: activo ? C.azul : completo ? C.blanco : C.grisTexto }}>{completo ? "✓" : n}</div>
              <div style={{ fontSize: 12, fontWeight: activo ? 700 : 600, color: activo ? C.blanco : completo ? "#065F46" : C.grisTexto }}>{p}</div>
            </div>
          );
        })}
      </div>

      {alertaDup && (
        <div className="fade-in" style={{ padding: "12px 16px", borderRadius: 12, marginBottom: 20, border: "1px solid", backgroundColor: alertaDup.tipo === "bloqueo" ? C.rojoClaro : alertaDup.tipo === "advertencia" ? C.amarilloC : "#EFF6FF", borderColor: alertaDup.tipo === "bloqueo" ? "#FCA5A5" : alertaDup.tipo === "advertencia" ? "#FCD34D" : "#BFDBFE", display: "flex", gap: 10 }}>
          <span style={{ fontSize: 18 }}>{alertaDup.tipo === "bloqueo" ? "🚫" : alertaDup.tipo === "advertencia" ? "⚠️" : "ℹ️"}</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: alertaDup.tipo === "bloqueo" ? C.rojo : alertaDup.tipo === "advertencia" ? "#92400E" : "#1D4ED8" }}>{alertaDup.tipo === "bloqueo" ? "DUPLICADO BLOQUEADO" : alertaDup.tipo === "advertencia" ? "Advertencia de duplicado" : "Información"}</div>
            <div style={{ fontSize: 12, marginTop: 2 }}>{alertaDup.msg}</div>
          </div>
        </div>
      )}

      <div style={{ background: C.blanco, borderRadius: 14, padding: "14px 32px", border: `1px solid ${C.grisMedio}`, boxShadow: "0 1px 6px rgba(18,85,161,0.04)" }}>
        {paso === 1 && (
          <div className="fade-in">
            <h3 style={{ fontSize: 16, fontWeight: 700, color: C.texto, margin: "0 0 20px" }}>Paso 1 — Datos del Beneficiario</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={{ gridColumn: "1/-1" }}><Campo label="Localidad" required error={errores.localidad_id}><Select value={form.localidad_id} onChange={(e) => setF("localidad_id", e.target.value)} disabled={locales.length === 1}><option value="">Seleccionar...</option>{locales.map((l) => <option key={l.id} value={l.id}>{l.nombre}</option>)}</Select></Campo></div>
              <div style={{ gridColumn: "1/-1" }}><Campo label="Nombre del titular" required error={errores.titular}><Input value={form.titular} onChange={(e) => setF("titular", e.target.value.slice(0, 60))} placeholder="Ej: Juan Ramírez" maxLength={60} /></Campo></div>
              <Campo label="Céd. de identidad" required error={errores.ci}><Input value={form.ci} onChange={(e) => { const digits = e.target.value.replace(/\D/g, "").slice(0, 10); const formatted = digits.replace(/\B(?=(\d{3})+(?!\d))/g, "."); setF("ci", formatted); }} placeholder="Ej: 3.456.789" /></Campo>
              <Campo label="Celular"><Input value={form.celular} onChange={(e) => setF("celular", e.target.value.slice(0, 12))} placeholder="Ej: 0981-123456" maxLength={11} /></Campo>
              <Campo label="Manzana" required error={errores.manzana}><Input value={form.manzana} onChange={(e) => setF("manzana", e.target.value.slice(0, 4))} onBlur={() => { if (form.manzana.trim().length === 1) setErrores((prev) => ({ ...prev, manzana: "Mínimo 2 dígitos." })); else setErrores((prev) => ({ ...prev, manzana: undefined })); }} placeholder="Ej: 12" maxLength={4} /></Campo>
              <Campo label="Lote" required error={errores.lote}><Input value={form.lote} onChange={(e) => setF("lote", e.target.value.slice(0, 4))} onBlur={() => { if (form.lote.trim().length === 1) setErrores((prev) => ({ ...prev, lote: "Mínimo 2 dígitos." })); else setErrores((prev) => ({ ...prev, lote: undefined })); }} placeholder="Ej: 05" maxLength={4} /></Campo>
            </div>
          </div>
        )}
        {paso === 2 && (
          <div className="fade-in">
            <h3 style={{ fontSize: 16, fontWeight: 700, color: C.texto, margin: "0 0 20px" }}>Paso 2 — Tipo de Registro y Estrategia</h3>
            <Campo label="Tipo de registro" required>
              <div style={{ display: "flex", gap: 12 }}>
                {[{ v: "conectado", l: "🔗 Conectado a la Red", d: "Empalme al colector público completo", s: "✓ Cuenta para el indicador", sc: C.verde } 
                ].map((opt) => (<div key={opt.v} onClick={() => setF("tipo", opt.v)} style={{ width: "calc(25% - 6px)", padding: "16px", border: `2px solid ${form.tipo === opt.v ? C.azul : C.grisBorde}`, borderRadius: 12, cursor: "pointer", background: form.tipo === opt.v ? C.azulSuave : C.blanco, transition: "all 0.2s" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: form.tipo === opt.v ? C.azul : C.texto }}>{opt.l}</div>
                    <div style={{ fontSize: 12, color: C.grisTexto, marginTop: 4 }}>{opt.d}</div>
                    <div style={{ marginTop: 6, fontSize: 11, fontWeight: 700, color: opt.sc }}>{opt.s}</div>
                  </div>
                ))}
                {/* {[{ v: "conectado", l: "🔗 Conectado a la Red", d: "Empalme al colector público completo", s: "✓ Cuenta para el indicador", sc: C.verde }, { v: "adecuacion", l: "🏠 Adecuación Intrapredial", d: "Instalación interna sin empalme", s: "No cuenta como conectado aún", sc: C.grisTexto }].map((opt) => (
                  <div key={opt.v} onClick={() => setF("tipo", opt.v)} style={{ flex: 1, padding: "16px", border: `2px solid ${form.tipo === opt.v ? C.azul : C.grisBorde}`, borderRadius: 12, cursor: "pointer", background: form.tipo === opt.v ? C.azulSuave : C.blanco, transition: "all 0.2s" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: form.tipo === opt.v ? C.azul : C.texto }}>{opt.l}</div>
                    <div style={{ fontSize: 12, color: C.grisTexto, marginTop: 4 }}>{opt.d}</div>
                    <div style={{ marginTop: 6, fontSize: 11, fontWeight: 700, color: opt.sc }}>{opt.s}</div>
                  </div>
                ))} */}
              </div>
            </Campo>
            <Campo label="Fecha de ejecución" required error={errores.fecha_ejec}><Input type="date" value={form.fecha_ejec} max={new Date().toISOString().split("T")[0]} onChange={(e) => setF("fecha_ejec", e.target.value)} style={{ maxWidth: 240 }} /></Campo>
            <Campo label="Estrategia" required error={errores.modalidad_id}>
              <Select value={form.modalidad_id} onChange={(e) => setF("modalidad_id", e.target.value)}>
                <option value="">Seleccionar...</option>
                {usuario.rol === "Trabajadora Social"
                  ? misModalidades.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)
                  : ["JUNTA", "CONTRATISTA", "ICARO", "TRABAJADORA SOCIAL"].map((cat) => { const mods = misModalidades.filter((m) => m.cat === cat); if (!mods.length) return null; return <optgroup key={cat} label={`── ${cat} ──`}>{mods.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}</optgroup>; })}
              </Select>
              {form.modalidad_id && <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center" }}><CatBadge cat={modCat(form.modalidad_id)} /><span style={{ fontSize: 12, color: C.grisTexto }}>{modNombre(form.modalidad_id)}</span></div>}
            </Campo>
          </div>
        )}
        {paso === 3 && (
          <div className="fade-in">
            <h3 style={{ fontSize: 16, fontWeight: 700, color: C.texto, margin: "0 0 20px" }}>Paso 3 — Evidencia y Observaciones</h3>
            <Campo label="Evidencia fotográfica o documental" required error={errores.evidencia_url}>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {EVID_KEYS.map((key, idx) => {
                  const url = form[key];
                  const isUploading = uploading[idx];
                  const prevFilled = idx === 0 || !!form[EVID_KEYS[idx - 1]];
                  if (!prevFilled) return null;
                  return (
                    <div key={key}>
                      <input ref={fileInputRefs[idx]} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" style={{ display: "none" }} onChange={(e) => handleFileUpload(e, idx)} />
                      <div style={{ border: `2px dashed ${url ? C.verde : C.grisBorde}`, borderRadius: 12, padding: "16px 24px", textAlign: "center", background: url ? C.verdeC : C.gris, cursor: "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", gap: 14 }}
                        onClick={() => fileInputRefs[idx].current?.click()}>
                        <div style={{ fontSize: 24 }}>{isUploading ? "⏳" : url ? "✅" : "📷"}</div>
                        <div style={{ textAlign: "left", flex: 1 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: C.grisTexto, marginBottom: 2 }}>
                            Evidencia {idx + 1}{idx === 0 ? " *" : " (opcional)"}
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: url ? "#065F46" : C.grisTexto }}>
                            {isUploading ? "Subiendo..." : url ? url.split("/").pop() : "Haga clic para adjuntar"}
                          </div>
                          <div style={{ fontSize: 11, color: C.grisTexto, marginTop: 2 }}>JPG, PNG, WEBP o PDF · Máx. 10 MB</div>
                        </div>
                        {url && <button type="button" onClick={(e) => { e.stopPropagation(); setF(key, ""); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: C.rojo, padding: 4 }}>✕</button>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Campo>
            <Campo label="Observaciones"><Textarea value={form.observaciones} onChange={(e) => setF("observaciones", e.target.value)} placeholder="Notas adicionales..." /></Campo>
          </div>
        )}
        {paso === 4 && (
          <div className="fade-in">
            <h3 style={{ fontSize: 16, fontWeight: 700, color: C.texto, margin: "0 0 20px" }}>Paso 4 — Confirmar y Enviar</h3>
            <div style={{ background: C.gris, borderRadius: 12, padding: 20, marginBottom: 20 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 13 }}>
                {[["Localidad", locNombre(form.localidad_id)], ["Titular", form.titular], ["CI", form.ci], ["Mz / Lote", `${form.manzana} / ${form.lote}`], ["Tipo", form.tipo === "conectado" ? "🔗 Conectado" : "🏠 Adecuación"], ["Modalidad", modNombre(form.modalidad_id)], ["Fecha Ejec.", fmt(form.fecha_ejec)], ["Evidencia 1", form.evidencia_url?.split("/").pop() || "-"], ...(form.evidencia_url_2 ? [["Evidencia 2", form.evidencia_url_2.split("/").pop()]] : []), ...(form.evidencia_url_3 ? [["Evidencia 3", form.evidencia_url_3.split("/").pop()]] : [])].map(([k, v]) => (
                  <div key={k}><div style={{ fontSize: 11, fontWeight: 700, color: C.grisTexto, textTransform: "uppercase", letterSpacing: "0.05em" }}>{k}</div><div style={{ fontWeight: 600, color: C.texto, marginTop: 2 }}>{v}</div></div>
                ))}
              </div>
            </div>
            {esEdicion && (
              <div style={{ background: C.verdeC, border: "1px solid #6EE7B7", borderRadius: 12, padding: "12px 16px", marginBottom: 20, display: "flex", gap: 10 }}>
                <span>✏️</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#065F46" }}>Corrección de registro rechazado</div>
                  <div style={{ fontSize: 12, color: "#047857", marginTop: 2 }}>El historial se conservará. Será reenviado a validación.</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 28, paddingTop: 0, borderTop: `1px solid ${C.grisMedio}` }}>
          <button onClick={paso === 1 ? onCancel : anterior} style={{ padding: "10px 22px", background: C.azul, border: `1px solid ${C.grisMedio}`, borderRadius: 10, cursor: "pointer", fontSize: 14, color: C.blanco, fontWeight: 600 }}>{paso === 1 ? "Cancelar" : "← Anterior"}</button>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 12, color: C.grisTexto }}>Paso {paso} de 4</span>
            {paso < 4 ? (
              <button onClick={siguiente} disabled={bloqueoDup} style={{ padding: "10px 26px", background: bloqueoDup ? C.grisMedio : `linear-gradient(135deg,${C.azul},${C.azulMedio})`, color: bloqueoDup ? C.grisTexto : C.blanco, border: "none", borderRadius: 10, cursor: bloqueoDup ? "not-allowed" : "pointer", fontSize: 14, fontWeight: 700 }}>Siguiente</button>
            ) : (
              <button onClick={confirmar} disabled={submitting} style={{ padding: "10px 30px", background: `linear-gradient(135deg,${C.verde},#047857)`, color: C.blanco, border: "none", borderRadius: 10, cursor: submitting ? "wait" : "pointer", fontSize: 14, fontWeight: 700, boxShadow: "0 4px 16px rgba(5,150,105,0.3)", opacity: submitting ? 0.7 : 1 }}>{submitting ? "Enviando..." : esEdicion ? "Reenviar a Validación ✓" : "Enviar a Validación ✓"}</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
