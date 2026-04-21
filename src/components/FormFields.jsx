import React from "react";
import { C } from "../styles/colors";

const inputStyle = (disabled) => ({
  width: "100%", padding: "10px 14px", border: `1.5px solid ${C.grisBorde}`,
  borderRadius: 10, fontSize: 14, color: C.texto, outline: "none",
  boxSizing: "border-box", backgroundColor: disabled ? "#F8FAFC" : C.blanco,
  transition: "border-color 0.2s,box-shadow 0.2s",
});

export function Campo({ label, required, error, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: C.texto, marginBottom: 6 }}>
        {label}{required && <span style={{ color: C.rojo, marginLeft: 2 }}>*</span>}
      </label>
      {children}
      {error && <div style={{ fontSize: 11, color: C.rojo, marginTop: 4, fontWeight: 500 }}>⚠ {error}</div>}
    </div>
  );
}

export function Input({ ...p }) {
  return (
    <input
      {...p}
      style={{ ...inputStyle(p.disabled), ...p.style }}
      onFocus={(e) => { e.target.style.borderColor = C.azul; e.target.style.boxShadow = `0 0 0 3px ${C.azulClaro}`; }}
      onBlur={(e) => { e.target.style.borderColor = C.grisBorde; e.target.style.boxShadow = "none"; }}
    />
  );
}

export function Select({ children, ...p }) {
  return <select {...p} style={{ ...inputStyle(false), ...p.style }}>{children}</select>;
}

export function Textarea({ ...p }) {
  return (
    <textarea
      {...p}
      style={{ ...inputStyle(false), resize: "vertical", minHeight: 80, ...p.style }}
      onFocus={(e) => { e.target.style.borderColor = C.azul; e.target.style.boxShadow = `0 0 0 3px ${C.azulClaro}`; }}
      onBlur={(e) => { e.target.style.borderColor = C.grisBorde; e.target.style.boxShadow = "none"; }}
    />
  );
}
