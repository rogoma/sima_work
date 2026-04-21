import React from "react";
import { C } from "../styles/colors";

export function Modal({ title, onClose, children, width = 560 }) {
  return (
    <div
      style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="fade-in" style={{ background: C.blanco, borderRadius: 16, width: "100%", maxWidth: width, maxHeight: "90vh", overflow: "auto", boxShadow: "0 24px 80px rgba(0,0,0,0.2)" }}>
        <div style={{ padding: "18px 24px", borderBottom: `1px solid ${C.grisMedio}`, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, background: C.blanco, zIndex: 1, borderRadius: "16px 16px 0 0" }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.texto }}>{title}</h3>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: C.grisTexto, lineHeight: 1, width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.15s" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = C.gris)}
            onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
          >
            ×
          </button>
        </div>
        <div style={{ padding: 24 }}>{children}</div>
      </div>
    </div>
  );
}

export function Toast({ notifs, onDismiss }) {
  if (!notifs.length) return null;
  return (
    <div style={{ position: "fixed", top: 16, right: 16, zIndex: 2000, display: "flex", flexDirection: "column", gap: 8, maxWidth: 360 }}>
      {notifs.map((n) => (
        <div key={n.id} className="slide-in" style={{ background: C.blanco, border: `1px solid ${C.grisBorde}`, borderLeft: `4px solid ${n.color || C.azul}`, borderRadius: 12, padding: "14px 16px", boxShadow: "0 8px 30px rgba(0,0,0,0.12)", display: "flex", gap: 12, alignItems: "flex-start" }}>
          <span style={{ fontSize: 18 }}>{n.icon || "🔔"}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.texto }}>{n.titulo}</div>
            <div style={{ fontSize: 12, color: C.grisTexto, marginTop: 2 }}>{n.mensaje}</div>
          </div>
          <button onClick={() => onDismiss(n.id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.grisTexto, fontSize: 16, lineHeight: 1, opacity: 0.6 }}>×</button>
        </div>
      ))}
    </div>
  );
}
