import React, { useState, useEffect } from "react";
import { C } from "./styles/colors";
import { getUsuarioGuardado, logout, fetchLocalidades, fetchRegistros, fetchModalidades, validarRegistro, rechazarRegistro } from "./services/api";

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

export default function App() {
  const [usuario, setUsuario] = useState(() => getUsuarioGuardado());
  const [vista, setVista] = useState("dashboard");
  const [registros, setRegistros] = useState([]);
  const [localidades, setLocalidades] = useState([]);
  const [modalidades, setModalidades] = useState([]);
  const [localidadSel, setLocalidadSel] = useState(null);
  const [regEditar, setRegEditar] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
  };

  const handleSetVista = (v) => {
    setVista(v);
    setRegEditar(null);
    if (isMobile) setSidebarOpen(false);
  };

  // ─── Login ─────────────────────────────────────────────────────────────────
  if (!usuario) return <LoginScreen onLogin={(u) => { setUsuario(u); setVista("dashboard"); }} />;

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
      case "localidad":
        return <VistaLocalidad localidadId={localidadSel} registros={registros} usuario={usuario} setVista={handleSetVista} localidades={localidades} />;
      case "registros":
        return <VistaRegistros registros={registros} usuario={usuario} onReabrir={handleReabrir} localidades={localidades} modalidades={modalidades} />;
      case "nuevo":
        return <FormNuevoRegistro usuario={usuario} registros={registros} onGuardar={handleGuardarRegistro} onCancel={() => { setRegEditar(null); setVista("registros"); }} registroEditar={regEditar} localidades={localidades} modalidades={modalidades} />;
      case "validacion":
        return usuario.rol === "coordinador" ? <VistaValidacion registros={registros} onValidar={handleValidar} onRechazar={handleRechazar} localidades={localidades} modalidades={modalidades} /> : null;
      case "reportes":
        return usuario.rol === "coordinador" ? <VistaReportes registros={registros} localidades={localidades} modalidades={modalidades} /> : null;
      case "admin":
        return usuario.rol === "coordinador" ? <VistaAdmin localidades={localidades} modalidades={modalidades} /> : null;
      case "roles":
        return usuario.rol === "coordinador" ? <VistaRoles /> : null;
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
        onLogout={handleLogout}
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
            {pendientesCount > 0 && usuario.rol === "coordinador" && (
              <button onClick={() => handleSetVista("validacion")} style={{ display: "flex", alignItems: "center", gap: 6, padding: isMobile ? "6px 10px" : "6px 14px", background: "linear-gradient(135deg,#FFFBEB,#FEF3C7)", border: "1px solid #FCD34D", borderRadius: 20, cursor: "pointer", fontSize: 12, fontWeight: 700, color: "#92400E", animation: "pulse 2s infinite" }}>
                ⚠️ {pendientesCount}{!isMobile && ` pendiente${pendientesCount !== 1 ? "s" : ""}`}
              </button>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 34, height: 34, borderRadius: "50%", background: `linear-gradient(135deg,${C.azul},${C.azulMedio})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: C.blanco }}>{usuario.nombre[0]}</div>
              {!isMobile && <div style={{ fontSize: 12, color: C.grisTexto, fontWeight: 500 }}>{usuario.nombre}</div>}
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: isMobile ? "16px" : "28px 32px", maxWidth: 1200 }}>
          {renderVista()}
        </div>
      </div>

      <Toast notifs={toasts} onDismiss={dismissToast} />
    </div>
  );
}
