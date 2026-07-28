import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/** Favicon: cubo estilo grass block de Minecraft (reemplaza el triángulo de Vercel). */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0a",
        }}
      >
        <svg width="28" height="28" viewBox="0 0 28 28">
          {/* Cara frontal — tierra */}
          <rect x="4" y="8" width="16" height="16" fill="#8B5A2B" />
          {/* Franja de césped arriba de la cara frontal */}
          <rect x="4" y="8" width="16" height="5" fill="#5D9C3D" />
          {/* Cara superior (isométrica simple) */}
          <polygon points="4,8 12,3 28,3 20,8" fill="#6BB33C" />
          {/* Cara derecha */}
          <polygon points="20,8 28,3 28,19 20,24" fill="#6E4720" />
          {/* Pixeles de césped */}
          <rect x="6" y="9" width="2" height="2" fill="#3D7A28" />
          <rect x="10" y="10" width="2" height="2" fill="#3D7A28" />
          <rect x="14" y="9" width="2" height="2" fill="#4A8F30" />
          <rect x="8" y="11" width="2" height="1" fill="#4A8F30" />
          {/* Pixeles de tierra */}
          <rect x="7" y="15" width="2" height="2" fill="#6E4720" />
          <rect x="12" y="17" width="2" height="2" fill="#A06A3A" />
          <rect x="15" y="20" width="2" height="2" fill="#6E4720" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
