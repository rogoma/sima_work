import React, { useState } from "react";
import { C } from "../styles/colors";

import { useMobile } from "../hooks/useMobile";

export default function Sidebar({ usuario, vista, setVista, pendientes, onLogout, localidades, isOpen, onClose }) {
  const isMobile = useMobile();
  const [adminExpanded, setAdminExpanded] = useState(
    () => vista === "admin" || vista === "roles"
  );
  const [confirmarSalida, setConfirmarSalida] = useState(false);

  const esCoordinador = usuario.rol === "coordinador";

  const items = [
    { id: "dashboard", icon: "📊", label: "Dashboard" },
    { id: "registros", icon: "📋", label: "Registros" },
    { id: "nuevo", icon: "➕", label: "Nuevo Registro" },
    ...(esCoordinador ? [{ id: "validacion", icon: "✅", label: "Validación", badge: pendientes }] : []),
    ...(esCoordinador ? [{ id: "reportes", icon: "📈", label: "Reportes" }] : []),
  ];

  const adminSubitems = [    
    { id: "admin",  icon: "✅", label: "Metas/Estrategias" },
    { id: "admin",  icon: "⚙️", label: "Usuarios" },
    { id: "roles",  icon: "🔑", label: "Roles" },
  ];

  const isAdminActive = vista === "admin" || vista === "roles";

  const locNombre = (id) => localidades.find((l) => Number(l.id) === Number(id))?.nombre || id;

  const navItemStyle = (active) => ({
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "12px 22px",
    background: active ? "rgba(255,255,255,0.14)" : "none",
    border: "none",
    cursor: "pointer",
    color: active ? C.blanco : "rgba(255,255,255,0.65)",
    fontSize: 13,
    fontWeight: active ? 700 : 400,
    textAlign: "left",
    borderLeft: active ? `3px solid ${C.blanco}` : "3px solid transparent",
    transition: "all 0.15s",
    letterSpacing: "-0.01em",
  });

  const subItemStyle = (active) => ({
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: 9,
    padding: "10px 22px 10px 38px",
    background: active ? "rgba(255,255,255,0.14)" : "none",
    border: "none",
    cursor: "pointer",
    color: active ? C.blanco : "rgba(255,255,255,0.6)",
    fontSize: 12,
    fontWeight: active ? 700 : 400,
    textAlign: "left",
    borderLeft: active ? `3px solid rgba(255,255,255,0.7)` : "3px solid transparent",
    transition: "all 0.15s",
  });

  return (
    <>
      {isMobile && isOpen && (
        <div
          onClick={onClose}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 99, backdropFilter: "blur(2px)" }}
        />
      )}
      <div style={{
        width: 230,
        background: `linear-gradient(180deg,#4A0072 0%,#7B2FBE 100%)`,
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        position: "fixed",
        left: 0,
        top: 0,
        zIndex: 100,
        boxShadow: "3px 0 24px rgba(0,0,0,0.15)",
        transform: isMobile && !isOpen ? "translateX(-100%)" : "translateX(0)",
        transition: "transform 0.25s ease",
      }}>
        <div style={{ padding: "22px 18px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src="Logo_Senasa.jpg" alt="Logo Senasa" style={{ height: 50, objectFit: "contain" }} />
            <div>
              <div style={{ fontSize: 17, fontWeight: 900, color: C.blanco, letterSpacing: "-0.02em" }}>SIMA</div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.55)", lineHeight: 1.3 }}>Monitor Social · Alcantarillado</div>
            </div>
          </div>
        </div>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.blanco, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{usuario.nombre}</div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", lineHeight: 1.4 }}>{usuario.rol}</div>
          {usuario.localidades && (
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", marginTop: 3 }}>
              📍 {usuario.localidades.map((id) => locNombre(id)).join(", ")}
            </div>
          )}
        </div>
        <nav style={{ flex: 1, padding: "10px 0", overflow: "auto" }}>
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => setVista(item.id)}
              style={navItemStyle(vista === item.id)}
              onMouseEnter={(e) => { if (vista !== item.id) e.currentTarget.style.background = "rgba(255,255,255,0.07)"; }}
              onMouseLeave={(e) => { if (vista !== item.id) e.currentTarget.style.background = "none"; }}
            >
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge > 0 && (
                <span style={{ background: C.rojo, color: C.blanco, borderRadius: 10, padding: "1px 7px", fontSize: 10, fontWeight: 800, animation: "pulse 2s infinite" }}>
                  {item.badge}
                </span>
              )}
            </button>
          ))}

          {/* Sección Administración (solo coordinador) */}
          {esCoordinador && (
            <>
              {/* Header del grupo */}
              <button
                onClick={() => setAdminExpanded((v) => !v)}
                style={{
                  ...navItemStyle(isAdminActive && !adminExpanded),
                  background: isAdminActive ? "rgba(255,255,255,0.10)" : "none",
                  borderLeft: isAdminActive ? `3px solid rgba(255,255,255,0.5)` : "3px solid transparent",
                }}
                onMouseEnter={(e) => { if (!isAdminActive) e.currentTarget.style.background = "rgba(255,255,255,0.07)"; }}
                onMouseLeave={(e) => { if (!isAdminActive) e.currentTarget.style.background = isAdminActive ? "rgba(255,255,255,0.10)" : "none"; }}
              >
                <span style={{ fontSize: 16 }}>⚙️</span>
                <span style={{ flex: 1 }}>Administración</span>
                <span style={{ fontSize: 10, opacity: 0.7, transition: "transform 0.2s", display: "inline-block", transform: adminExpanded ? "rotate(90deg)" : "rotate(0deg)" }}>
                  ▶
                </span>
              </button>

              {/* Subitems */}
              {adminExpanded && (
                <div style={{ overflow: "hidden" }}>
                  {adminSubitems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setVista(item.id)}
                      style={subItemStyle(vista === item.id)}
                      onMouseEnter={(e) => { if (vista !== item.id) e.currentTarget.style.background = "rgba(255,255,255,0.07)"; }}
                      onMouseLeave={(e) => { if (vista !== item.id) e.currentTarget.style.background = "none"; }}
                    >
                      <span style={{ fontSize: 14 }}>{item.icon}</span>
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </nav>
        <div style={{ padding: "14px 18px", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
          <button
            onClick={() => setConfirmarSalida(true)}
            style={{ width: "100%", padding: "10px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10, color: "rgba(255,255,255,0.75)", fontSize: 12, cursor: "pointer", fontWeight: 600, transition: "background 0.15s" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.15)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
          >
            Cerrar sesión
          </button>
        </div>

        {/* ── Confirmación de cierre de sesión ── */}
        {confirmarSalida && (
          <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.55)", backdropFilter: "blur(3px)" }}>
            <div style={{ background: C.blanco, borderRadius: 16, padding: "32px 28px", width: 300, boxShadow: "0 20px 60px rgba(0,0,0,0.3)", textAlign: "center" }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🚪</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#1a1a2e", marginBottom: 8 }}>¿Cerrar sesión?</div>
              <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 24, lineHeight: 1.5 }}>¿Está seguro que desea salir del sistema?</div>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => setConfirmarSalida(false)}
                  style={{ flex: 1, padding: "10px", background: "#f3f4f6", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 600, color: "#374151", cursor: "pointer" }}
                >
                  No
                </button>
                <button
                  onClick={onLogout}
                  style={{ flex: 1, padding: "10px", background: "linear-gradient(135deg,#dc2626,#b91c1c)", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, color: C.blanco, cursor: "pointer" }}
                >
                  Sí, salir
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
