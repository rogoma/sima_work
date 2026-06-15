import React, { useState, useEffect } from "react";
import { C } from "../styles/colors";
import { fetchProfesiones, crearProfesional, verificarCIProfesional } from "../services/api";
import { Campo, Input, Select } from "../components/FormFields";

export default function FormNuevoProfesional({ usuario, localidades }) {
  const locales = usuario.localidades?.length
    ? localidades.filter((l) => usuario.localidades.map(Number).includes(Number(l.id)))
    : localidades;

  const [profesiones, setProfesiones] = useState([]);
  const [form, setForm] = useState({
    localidad_id: locales.length === 1 ? String(locales[0].id) : "",
    profesion_id: "",
    ci: "",
    nombre: "",
    celular: "",
    direccion: "",
  });
  const [errores, setErrores] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [exito, setExito] = useState(false);
  const [ciDuplicada, setCiDuplicada] = useState(false);
  const [buscandoCI, setBuscandoCI] = useState(false);
  const [ciConsultada, setCiConsultada] = useState("");

  // setF definido antes del useEffect para claridad
  const setF = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrores((e) => ({ ...e, [k]: undefined }));
  };

  useEffect(() => {
    fetchProfesiones()
      .then((data) => {
        setProfesiones(data);
        if (data.length) {
          setForm((f) => ({ ...f, profesion_id: String(data[0].id) }));
        }
      })
      .catch(() => {});
  }, []);

  const consultarCI = async () => {
    const ciRaw = form.ci.replace(/\./g, "").trim();
    if (ciRaw.length < 5 || ciRaw === ciConsultada) return;
    setBuscandoCI(true);
    try {
      const res = await verificarCIProfesional(ciRaw);
      setCiDuplicada(res?.existe || false);
      setCiConsultada(ciRaw);
    } catch { /* silencioso */ }
    finally { setBuscandoCI(false); }
  };

  const validar = () => {
    const e = {};
    if (!form.localidad_id) e.localidad_id = "Seleccione la localidad.";
    if (!form.profesion_id) e.profesion_id = "Seleccione la profesión.";
    if (!form.ci.trim())    e.ci = "Ingrese la cédula.";
    else if (ciDuplicada)   e.ci = "Ya existe un profesional con esta cédula.";
    if (!form.nombre.trim()) e.nombre = "Ingrese el nombre del profesional.";
    if (!form.celular.trim()) e.celular = "Ingrese el celular.";
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const resetForm = (profs) => {
    setForm({
      localidad_id: locales.length === 1 ? String(locales[0].id) : "",
      profesion_id: profs.length ? String(profs[0].id) : "",
      ci: "",
      nombre: "",
      celular: "",
      direccion: "",
    });
    setCiDuplicada(false);
    setCiConsultada("");
    setErrores({});
  };

  const grabar = async () => {
    if (!validar()) return;
    setSubmitting(true);
    try {
      const ciRaw = form.ci.replace(/\./g, "").trim();
      await crearProfesional({ ...form, ci: ciRaw });
      setExito(true);
      resetForm(profesiones);
      setTimeout(() => setExito(false), 4000);
    } catch (e) {
      if (e.status === 409) {
        setErrores((err) => ({ ...err, ci: e.error }));
        setCiDuplicada(true);
      } else {
        alert(e.error || "Error al grabar.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: C.texto, letterSpacing: "-0.03em" }}>
          👷 Nuevo Profesional
        </h1>
        <p style={{ color: C.grisTexto, marginTop: 4, fontSize: 13 }}>
          Registrar un nuevo profesional en el sistema
        </p>
      </div>

      {exito && (
        <div
          className="fade-in"
          style={{ marginBottom: 20, padding: "14px 18px", background: "#D1FAE5", border: "1px solid #6EE7B7", borderRadius: 12, display: "flex", alignItems: "center", gap: 10, fontSize: 14, fontWeight: 600, color: "#065F46" }}
        >
          ✅ Profesional registrado correctamente.
        </div>
      )}

      <div style={{ background: C.blanco, borderRadius: 14, padding: "24px 32px", border: `1px solid ${C.grisMedio}`, boxShadow: "0 1px 6px rgba(18,85,161,0.04)" }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: C.texto, margin: "0 0 20px" }}>
          Datos del Profesional
        </h3>

        <div className="admin-form-grid">
          {/* Localidad */}
          <Campo label="Localidad" required error={errores.localidad_id}>
            <Select
              value={form.localidad_id}
              onChange={(e) => setF("localidad_id", e.target.value)}
              disabled={locales.length === 1}
            >
              <option value="">Seleccionar...</option>
              {locales.map((l) => (
                <option key={l.id} value={l.id}>{l.nombre}</option>
              ))}
            </Select>
          </Campo>

          {/* Profesión */}
          <Campo label="Profesión" required error={errores.profesion_id}>
            <Select
              value={form.profesion_id}
              onChange={(e) => setF("profesion_id", e.target.value)}
            >
              <option value="">Seleccionar...</option>
              {profesiones.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </Select>
          </Campo>

          {/* Cédula */}
          <Campo label="Céd. de identidad" required error={errores.ci}>
            <div style={{ position: "relative" }}>
              <Input
                value={form.ci}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
                  const formatted = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
                  setF("ci", formatted);
                  setCiDuplicada(false);
                  setCiConsultada("");
                }}
                onBlur={consultarCI}
                placeholder="Ej: 3.456.789"
                style={{ paddingRight: buscandoCI ? 36 : undefined }}
              />
              {buscandoCI && (
                <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 16 }}>
                  ⏳
                </span>
              )}
            </div>
            {ciDuplicada && !errores.ci && (
              <div style={{ fontSize: 11, color: C.rojo, marginTop: 4, fontWeight: 500 }}>
                ⚠ Ya existe un profesional registrado con esta cédula.
              </div>
            )}
          </Campo>

          {/* Nombre */}
          <Campo label="Nombre del Profesional" required error={errores.nombre}>
            <Input
              value={form.nombre}
              onChange={(e) => setF("nombre", e.target.value.slice(0, 200))}
              placeholder="Ej: Juan Ramírez"
            />
          </Campo>

          {/* Celular */}
          <Campo label="Celular" required error={errores.celular}>
            <Input
              value={form.celular}
              onChange={(e) => setF("celular", e.target.value.slice(0, 30))}
              placeholder="Ej: 0981-123.456"
            />
          </Campo>

          {/* Dirección */}
          <Campo label="Dirección">
            <Input
              value={form.direccion}
              onChange={(e) => setF("direccion", e.target.value.slice(0, 100))}
              placeholder="Dirección del profesional"
              maxLength={100}
            />
          </Campo>
        </div>

        <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={grabar}
            disabled={submitting || ciDuplicada}
            style={{
              padding: "11px 32px",
              background: submitting || ciDuplicada
                ? C.grisMedio
                : `linear-gradient(135deg,${C.azul},${C.azulMedio})`,
              color: submitting || ciDuplicada ? C.grisTexto : C.blanco,
              border: "none",
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 700,
              cursor: submitting || ciDuplicada ? "not-allowed" : "pointer",
              boxShadow: submitting || ciDuplicada ? "none" : "0 4px 14px rgba(18,85,161,0.25)",
              transition: "all 0.2s",
            }}
          >
            {submitting ? "Grabando…" : "💾 Grabar"}
          </button>
        </div>
      </div>
    </div>
  );
}
