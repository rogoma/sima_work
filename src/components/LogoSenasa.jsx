import React from "react";

export default function LogoSenasa({ size = 80, horizontal = false }) {
  return (
    <svg
      width={horizontal ? 180 : size}
      height={size}
      viewBox={horizontal ? "0 0 180 50" : "0 0 50 50"}
      fill="none"
    >
      <circle cx="25" cy="25" r="22" fill="#E8F2FB" stroke="#1255A1" strokeWidth="1.5" />
      {/* <path d="M12 32 Q18 20 25 18 Q32 16 38 28" stroke="#1255A1" strokeWidth="2" fill="none" />
      <path d="M8 36 Q12 28 18 30 Q14 38 8 36Z" fill="#1255A1" />
      <path d="M42 36 Q38 28 32 30 Q36 38 42 36Z" fill="#1255A1" />
      <path d="M25 12 Q28 18 28 22 Q28 26 25 26 Q22 26 22 22 Q22 18 25 12Z" fill="#1255A1" opacity="0.7" /> */}
      {horizontal && (
        <>
          <text x="56" y="22" fontFamily="'DM Sans',Arial" fontWeight="900" fontSize="18" fill="#1255A1">SENASA</text>
          <rect x="161" y="5" width="7" height="7" fill="#C8242A" />
          <text x="56" y="38" fontFamily="'DM Sans',Arial" fontWeight="500" fontSize="8" fill="#64748B">Servicio Nacional de Saneamiento Ambiental</text>
        </>
      )}
      {!horizontal && (
        <text x="25" y="52" fontFamily="'DM Sans',Arial" fontWeight="900" fontSize="10" fill="#1255A1" textAnchor="middle">SENASA</text>
      )}
    </svg>
  );
}
