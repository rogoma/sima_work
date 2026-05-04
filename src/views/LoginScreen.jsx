import React, { useState } from "react";
import { C } from "../styles/colors";
import { login } from "../services/api";
import { Campo, Input } from "../components/FormFields";


export default function LoginScreen({ onLogin }) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!user || !pass) { setError("Complete ambos campos."); return; }
    setLoading(true); setError("");
    try {
      const usuario = await login(user, pass);
      onLogin(usuario);
    } catch (e) {
      setError(e.error || "Error de conexión con el servidor.");
    } finally { setLoading(false); }
  };

  const logoSrc = `${import.meta.env.BASE_URL}Logo_Senasa.jpg`;

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: `linear-gradient(135deg,${C.azulOscuro} 0%,${C.azul} 40%,${C.azulMedio} 100%)`, padding: 20, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: "-20%", right: "-10%", width: "60vw", height: "60vw", borderRadius: "50%", background: "rgba(255,255,255,0.03)" }} />
      <div style={{ position: "absolute", bottom: "-30%", left: "-15%", width: "70vw", height: "70vw", borderRadius: "50%", background: "rgba(255,255,255,0.02)" }} />
      <div className="fade-in" style={{ background: "rgba(255,255,255,0.97)", borderRadius: 20, padding: "48px 40px", maxWidth: 420, width: "100%", boxShadow: "0 32px 80px rgba(0,0,0,0.3)", backdropFilter: "blur(20px)", position: "relative", zIndex: 1 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <img src={logoSrc} alt="Logo Senasa" style={{ height: 120, objectFit: "contain" }} />
          <h1 style={{ fontSize: 22, fontWeight: 900, color: C.azul, marginTop: 16, letterSpacing: "-0.03em" }}>SIMA</h1>
          <p style={{ fontSize: 13, color: C.grisTexto, marginTop: 4, lineHeight: 1.5 }}>Sistema de Monitoreo Social<br />de Alcantarillado Sanitario</p>
        </div>
        <Campo label="Usuario">
          <Input value={user} onChange={(e) => { setUser(e.target.value); setError(""); }} placeholder="Ej: coord1" />
        </Campo>
        <Campo label="Contraseña">
          <Input type="password" value={pass} onChange={(e) => { setPass(e.target.value); setError(""); }} onKeyDown={(e) => e.key === "Enter" && handleLogin()} placeholder="Contraseña" />
        </Campo>
        {error && <div style={{ background: C.rojoClaro, color: C.rojo, padding: "10px 14px", borderRadius: 10, fontSize: 13, fontWeight: 600, marginBottom: 16 }}>⚠ {error}</div>}
        <button
          onClick={handleLogin} disabled={loading}
          style={{ width: "100%", padding: "13px", background: `linear-gradient(135deg,${C.azul},${C.azulMedio})`, color: C.blanco, border: "none", borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: loading ? "wait" : "pointer", boxShadow: "0 4px 16px rgba(18,85,161,0.3)", transition: "transform 0.15s,box-shadow 0.15s", letterSpacing: "-0.01em", opacity: loading ? 0.7 : 1 }}
          onMouseEnter={(e) => { if (!loading) { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(18,85,161,0.4)"; } }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(18,85,161,0.3)"; }}
        >
          {loading ? "Ingresando..." : "Iniciar sesión"}
        </button>
        {/* <div style={{ marginTop: 20, padding: "12px 16px", background: C.azulSuave, borderRadius: 10, border: `1px solid ${C.grisMedio}` }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.azul, marginBottom: 4 }}>Usuarios de prueba</div>
          {[["coord1","coord123"],["j_yaguaron","junta123"],["j_pirayu","junta456"],["contrat1","cont123"],["equipo1","equipo123"]].map(([u,p])=>(
            <div key={u} style={{ fontSize: 11, color: C.grisTexto, lineHeight: 1.6 }}>{u} / {p}</div>
          ))}
        </div> */}
      </div>
    </div>
  );
}
