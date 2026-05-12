import React, { useState, useEffect } from "react";
import { C } from "./styles/colors";
import { getUsuarioGuardado, logout, fetchLocalidades, fetchRegistros, fetchModalidades, validarRegistro, rechazarRegistro, cambiarPassword } from "./services/api";

import Sidebar from "./components/Sidebar";
import { Toast } from "./components/Overlays";
import { Loading } from "./components/DataDisplay";
import { useMobile } from "./hooks/useMobile";

// Vistas
import LoginScreen from "./views/LoginScreen";
import VistaDashboard from "./views/VistaDashboard";
import VistaLocalidad from "./views/VistaLocalidad";
import VistaRegistros from "./views/VistaRegistros";
import FormNuevoRegistro from "./views/FormNuevoRegistro";
import VistaValidacion from "./views/VistaValidacion";
import VistaReportes from "./views/VistaReportes";
import VistaAdmin from "./views/VistaAdmin";
import VistaRoles from "./views/VistaRoles";
import VistaLineaAvance from "./views/VistaLineaAvance";

export default function App() {
  const [usuario, setUsuario] = useState(() => getUsuarioGuardado());
  const [vista, setVista] = useState(() => {
    const u = getUsuarioGuardado();
    return u && [4, 7].includes(u.rol_id) ? "localidad" : "dashboard";
  });
  const [registros, setRegistros] = useState([]);
  const [localidades, setLocalidades] = useState([]);
  const [modalidades, setModalidades] = useState([]);
  const [localidadSel, setLocalidadSel] = useState(() => {
    const u = getUsuarioGuardado();
    return u && [4, 7].includes(u.rol_id) ? (u.localidades?.[0] ?? null) : null;
  });
  const [regEditar, setRegEditar] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [modalPassword, setModalPassword] = useState(false);
  const [confirmarSalida, setConfirmarSalida] = useState(false);
  const [pwdForm, setPwdForm] = useState({ actual: "", nueva: "", confirmar: "" });
  const [pwdError, setPwdError] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);
  const isMobile = useMobile();

  // ─── Toasts ────────────────────────────────────────────────────────────────
  const addToast = (titulo, mensaje, icon, color = C.azul) => {
    const id = Date.now();
    setToasts((t) => [...t, { id, titulo, mensaje, icon, color }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000);
  };
  const dismissToast = (id) => setToasts((t) => t.filter((x) => x.id !== id));
  const pendientesCount = registros.filter((r) => r.estado === "pendiente").length;

  // ─── Cargar datos ──────────────────────────────────────────────────────────
  const cargarDatos = async () => {
    setLoadingData(true);
    try {
      const [locs, regs, mods] = await Promise.all([
        fetchLocalidades(),
        fetchRegistros(),
        fetchModalidades(),
      ]);
      setLocalidades(locs);
      setRegistros(regs.data || regs);
      setModalidades(mods);
    } catch (e) {
      console.error("Error cargando datos:", e);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (usuario) cargarDatos();
  }, [usuario]);

  // ─── Acciones ──────────────────────────────────────────────────────────────
  const handleValidar = async (regId, comentario) => {
    await validarRegistro(regId, comentario);
    addToast("✅ Registro validado", regId, "✅", C.verde);
    cargarDatos();
  };

  const handleRechazar = async (regId, comentario) => {
    await rechazarRegistro(regId, comentario);
    addToast("❌ Registro rechazado", `${regId} · Motivo enviado`, "❌", C.rojo);
    cargarDatos();
  };

  const handleGuardarRegistro = (esEdicion) => {
    addToast(esEdicion ? "⏳ Reenviado" : "⏳ Cargado", esEdicion ? "Registro corregido." : "Enviado a validación.", "✅", C.azul);
    setRegEditar(null);
    setVista("registros");
    cargarDatos();
  };

  const handleReabrir = (reg) => { setRegEditar(reg); setVista("nuevo"); };

  const handleLogout = () => {
    logout();
    setUsuario(null);
    setVista("dashboard");
    setRegistros([]); setLocalidades([]); setModalidades([]);
    setConfirmarSalida(false);
    setUserMenuOpen(false);
  };

  const abrirModalPassword = () => {
    setPwdForm({ actual: "", nueva: "", confirmar: "" });
    setPwdError("");
    setUserMenuOpen(false);
    setModalPassword(true);
  };

  const handleCambiarPassword = async () => {
    if (pwdForm.nueva !== pwdForm.confirmar) { setPwdError("Las contraseñas nuevas no coinciden."); return; }
    if (pwdForm.nueva.length < 6) { setPwdError("La nueva contraseña debe tener al menos 6 caracteres."); return; }
    setPwdLoading(true); setPwdError("");
    try {
      await cambiarPassword(pwdForm.actual, pwdForm.nueva);
      setModalPassword(false);
      addToast("Contraseña actualizada", "Su contraseña fue cambiada correctamente.", "🔒", C.verde);
    } catch (e) {
      setPwdError(e.error || "Error al cambiar la contraseña.");
    } finally {
      setPwdLoading(false);
    }
  };

  const handleSetVista = (v) => {
    if (v === "dashboard" && [4, 7].includes(usuario?.rol_id)) {
      setLocalidadSel(usuario.localidades?.[0] ?? null);
      setVista("localidad");
    } else {
      setVista(v);
    }
    setRegEditar(null);
    if (isMobile) setSidebarOpen(false);
  };

  // ─── Login ─────────────────────────────────────────────────────────────────
  if (!usuario) return <LoginScreen onLogin={(u) => {
    setUsuario(u);
    if ([4, 7].includes(u.rol_id)) {
      setLocalidadSel(u.localidades?.[0] ?? null);
      setVista("localidad");
    } else {
      setVista("dashboard");
    }
  }} />;

  // ─── Loading ───────────────────────────────────────────────────────────────
  if (loadingData) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loading text="Cargando SIMSAS..." />
      </div>
    );
  }

  // ─── Router de vistas ──────────────────────────────────────────────────────
  const renderVista = () => {
    switch (vista) {
      case "dashboard":
        return <VistaDashboard usuario={usuario} localidades={localidades} registros={registros} setVista={handleSetVista} setLocalidadSeleccionada={setLocalidadSel} />;
      case "linea":
        return <VistaLineaAvance registros={registros} localidades={localidades} />;
      case "localidad":
        return <VistaLocalidad localidadId={localidadSel} registros={registros} usuario={usuario} setVista={handleSetVista} localidades={localidades} modalidades={modalidades} onGuardarEdicion={() => { addToast("⏳ Reenviado", "Registro corregido.", "✅", C.azul); cargarDatos(); }} />;
      case "registros":
        return <VistaRegistros registros={registros} usuario={usuario} onReabrir={handleReabrir} localidades={localidades} modalidades={modalidades} />;
      case "nuevo":
        return <FormNuevoRegistro usuario={usuario} registros={registros} onGuardar={handleGuardarRegistro} onCancel={() => { setRegEditar(null); setVista("registros"); }} registroEditar={regEditar} localidades={localidades} modalidades={modalidades} />;
      case "validacion":
        return [1, 5].includes(usuario.rol_id) ? <VistaValidacion registros={registros} onValidar={handleValidar} onRechazar={handleRechazar} localidades={localidades} modalidades={modalidades} /> : null;
      case "reportes":
        return [1, 5].includes(usuario.rol_id) ? <VistaReportes registros={registros} localidades={localidades} modalidades={modalidades} /> : null;
      case "admin":
        return [1, 5].includes(usuario.rol_id) ? <VistaAdmin localidades={localidades} modalidades={modalidades} /> : null;
      case "roles":
        return [1, 5].includes(usuario.rol_id) ? <VistaRoles /> : null;
      default:
        return <VistaDashboard usuario={usuario} localidades={localidades} registros={registros} setVista={handleSetVista} setLocalidadSeleccionada={setLocalidadSel} />;
    }
  };

  return (
    <div style={{ fontFamily: "'DM Sans',system-ui,sans-serif", backgroundColor: C.gris, minHeight: "100vh" }}>
      <Sidebar
        usuario={usuario}
        vista={vista}
        setVista={handleSetVista}
        pendientes={pendientesCount}
        localidades={localidades}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div style={{ marginLeft: isMobile ? 0 : 230, minHeight: "100vh" }}>
        {/* Top bar */}
        <div style={{ height: 56, backgroundColor: C.blanco, borderBottom: `1px solid ${C.grisMedio}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: isMobile ? "0 16px" : "0 28px", position: "sticky", top: 0, zIndex: 50, boxShadow: "0 1px 4px rgba(18,85,161,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {isMobile && (
              <button
                onClick={() => setSidebarOpen(true)}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: C.azulOscuro, display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 8, transition: "background 0.15s" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = C.azulClaro)}
                onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
              >
                ☰
              </button>
            )}
            <img src="/Logo_Senasa_solo.jpg" alt="Logo Senasa" style={{ height: 60, objectFit: "contain" }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 8 : 12 }}>
            {pendientesCount > 0 && [1, 5].includes(usuario.rol_id) && (
              <button onClick={() => handleSetVista("validacion")} style={{ display: "flex", alignItems: "center", gap: 6, padding: isMobile ? "6px 10px" : "6px 14px", background: "linear-gradient(135deg,#FFFBEB,#FEF3C7)", border: "1px solid #FCD34D", borderRadius: 20, cursor: "pointer", fontSize: 12, fontWeight: 700, color: "#92400E", animation: "pulse 2s infinite" }}>
                ⚠️ {pendientesCount}{!isMobile && ` pendiente${pendientesCount !== 1 ? "s" : ""}`}
              </button>
            )}
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setUserMenuOpen((v) => !v)}
                style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", padding: "4px 6px", borderRadius: 8, transition: "background 0.15s" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = C.azulClaro)}
                onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
              >
                <div style={{ width: 34, height: 34, borderRadius: "50%", background: `linear-gradient(135deg,${C.azul},${C.azulMedio})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: C.blanco }}>{usuario.nombre[0]}</div>
                {!isMobile && <div style={{ fontSize: 12, color: C.grisTexto, fontWeight: 500 }}>{usuario.nombre}</div>}
                <span style={{ fontSize: 10, color: C.grisTexto, opacity: 0.6 }}>▾</span>
              </button>
              {userMenuOpen && (
                <>
                  <div onClick={() => setUserMenuOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 60 }} />
                  <div style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", background: C.blanco, border: `1px solid ${C.grisMedio}`, borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", minWidth: 180, zIndex: 70, overflow: "hidden" }}>
                    <div style={{ padding: "10px 14px", borderBottom: `1px solid ${C.grisMedio}` }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: C.texto }}>{usuario.nombre}</div>
                      <div style={{ fontSize: 11, color: C.grisTexto }}>{usuario.rol}</div>
                    </div>
                    <button
                      onClick={abrirModalPassword}
                      style={{ width: "100%", padding: "10px 14px", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: C.texto, textAlign: "left", display: "flex", alignItems: "center", gap: 8, transition: "background 0.15s" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = C.gris)}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                    >
                      🔒 Cambiar contraseña
                    </button>
                    <div style={{ borderTop: `1px solid ${C.grisMedio}` }} />
                    <button
                      onClick={() => { setUserMenuOpen(false); setConfirmarSalida(true); }}
                      style={{ width: "100%", padding: "10px 14px", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#DC2626", textAlign: "left", display: "flex", alignItems: "center", gap: 8, transition: "background 0.15s" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#FEF2F2")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                    >
                      🚪 Cerrar sesión
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: isMobile ? "16px" : "28px 32px", maxWidth: 1200 }}>
          {renderVista()}
        </div>
      </div>

      <Toast notifs={toasts} onDismiss={dismissToast} />

      {/* Modal confirmar cierre de sesión */}
      {confirmarSalida && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.55)", backdropFilter: "blur(3px)" }}>
          <div style={{ background: C.blanco, borderRadius: 16, padding: "32px 28px", width: 300, boxShadow: "0 20px 60px rgba(0,0,0,0.3)", textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🚪</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#1a1a2e", marginBottom: 8 }}>¿Cerrar sesión?</div>
            <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 24, lineHeight: 1.5 }}>¿Está seguro que desea salir del sistema?</div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setConfirmarSalida(false)}
                style={{ flex: 1, padding: "10px", background: "#F3F4F6", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 600, color: "#374151", cursor: "pointer" }}
              >
                No
              </button>
              <button
                onClick={handleLogout}
                style={{ flex: 1, padding: "10px", background: "linear-gradient(135deg,#dc2626,#b91c1c)", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, color: C.blanco, cursor: "pointer" }}
              >
                Sí, salir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal cambiar contraseña */}
      {modalPassword && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.50)", backdropFilter: "blur(3px)" }}>
          <div style={{ background: C.blanco, borderRadius: 16, padding: "32px 28px", width: 340, boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}>
            <div style={{ fontSize: 22, textAlign: "center", marginBottom: 6 }}>🔒</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.texto, textAlign: "center", marginBottom: 20 }}>Cambiar contraseña</div>

            {[
              { label: "Contraseña actual", key: "actual" },
              { label: "Nueva contraseña", key: "nueva" },
              { label: "Confirmar nueva contraseña", key: "confirmar" },
            ].map(({ label, key }) => (
              <div key={key} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.grisTexto, display: "block", marginBottom: 5 }}>{label}</label>
                <input
                  type="password"
                  value={pwdForm[key]}
                  onChange={(e) => setPwdForm((f) => ({ ...f, [key]: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && handleCambiarPassword()}
                  style={{ width: "100%", padding: "9px 12px", border: `1px solid ${C.grisMedio}`, borderRadius: 8, fontSize: 13, color: C.texto, outline: "none", boxSizing: "border-box" }}
                />
              </div>
            ))}

            {pwdError && (
              <div style={{ background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#DC2626", marginBottom: 14 }}>
                {pwdError}
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <button
                onClick={() => setModalPassword(false)}
                disabled={pwdLoading}
                style={{ flex: 1, padding: "10px", background: "#F3F4F6", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 600, color: "#374151", cursor: "pointer" }}
              >
                Cancelar
              </button>
              <button
                onClick={handleCambiarPassword}
                disabled={pwdLoading}
                style={{ flex: 1, padding: "10px", background: `linear-gradient(135deg,${C.azul},${C.azulMedio})`, border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, color: C.blanco, cursor: pwdLoading ? "not-allowed" : "pointer", opacity: pwdLoading ? 0.7 : 1 }}
              >
                {pwdLoading ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
