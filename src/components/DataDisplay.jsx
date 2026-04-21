import React from "react";
import { C } from "../styles/colors";
import { pct } from "../services/helpers";

const fmt = n => String(Math.round(Number(n))).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

export function StatCard({ label, value, sub, color = C.azul, icon }) {
  return (
    <div
      className="fade-in"
      style={{ background: C.blanco, borderRadius: 14, padding: "20px 22px", border: `1px solid ${C.grisMedio}`, boxShadow: "0 1px 6px rgba(18,85,161,0.05)", minWidth: 150, flex: 1, transition: "transform 0.2s,box-shadow 0.2s", cursor: "default" }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(18,85,161,0.1)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 1px 6px rgba(18,85,161,0.05)"; }}
    >
      <div style={{ fontSize: 22, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color, lineHeight: 1.1, letterSpacing: "-0.03em" }}>{value}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: C.texto, marginTop: 6 }}>{label}</div>
      {sub && <div style={{ fontSize: 12, color: C.grisTexto, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export function ProgressBar({ value, total, color = C.azul }) {
  const p = pct(value, total);
  return (
    <div style={{ width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color }}>{p}%</span>
        <span style={{ fontSize: 12, color: C.grisTexto }}>{fmt(value)}/{fmt(total)}</span>
      </div>
      <div style={{ height: 8, backgroundColor: C.grisMedio, borderRadius: 4, overflow: "hidden" }}>
        <div className="bar-anim" style={{ height: "100%", width: `${p}%`, backgroundColor: color, borderRadius: 4, transition: "width 0.6s ease-out" }} />
      </div>
    </div>
  );
}

export function Loading({ text = "Cargando..." }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 60, flexDirection: "column", gap: 12 }}>
      <div style={{ width: 36, height: 36, border: `3px solid ${C.grisMedio}`, borderTopColor: C.azul, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <div style={{ fontSize: 13, color: C.grisTexto }}>{text}</div>
    </div>
  );
}
