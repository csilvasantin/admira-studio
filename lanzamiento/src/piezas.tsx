import React from "react";
import {
  AbsoluteFill,
  Audio,
  Easing,
  Img,
  OffthreadVideo,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORES, FUENTE, MONO, linea } from "./guion";

// Entrada suave reutilizable: opacidad + desplazamiento vertical.
export const useEntrada = (retrasoSeg = 0, duracionSeg = 0.7) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = interpolate(
    frame,
    [retrasoSeg * fps, (retrasoSeg + duracionSeg) * fps],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.16, 1, 0.3, 1) },
  );
  return { opacity: t, translate: `0px ${(1 - t) * 24}px` };
};

// Subtítulo palabra a palabra, sincronizado con la voz de Admirito.
// Naranja cuando habla Neo (la máquina), blanco cuando es la voz en off.
export const Subtitulo: React.FC<{ id: string }> = ({ id }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const l = linea(id);
  const ms = (frame / fps) * 1000;
  const esNeo = l.quien === "neo";
  return (
    <>
      <Audio src={staticFile(l.fichero)} volume={1.3} />
      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 72 }}>
        <div
          style={{
            maxWidth: 1400,
            padding: "14px 26px",
            borderRadius: 14,
            background: esNeo ? "rgba(255,122,61,.92)" : "rgba(2,8,13,.78)",
            color: esNeo ? "#1a0a03" : COLORES.texto,
            fontFamily: FUENTE,
            fontSize: 40,
            lineHeight: 1.25,
            textAlign: "center",
            fontWeight: 600,
            boxShadow: "0 18px 50px rgba(0,0,0,.45)",
            opacity: interpolate(frame, [0, 0.25 * fps], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          }}
        >
          {esNeo ? <span style={{ fontFamily: MONO, fontSize: 22, letterSpacing: ".12em", marginRight: 14, opacity: 0.8 }}>STUDIO</span> : null}
          {l.palabras.map((p, i) => {
            const dicha = ms >= p.startMs;
            return (
              <span key={i} style={{ opacity: dicha ? 1 : 0.38 }}>
                {p.text}
                {i < l.palabras.length - 1 ? " " : ""}
              </span>
            );
          })}
        </div>
      </AbsoluteFill>
    </>
  );
};

// Marco de «pantalla»: bisel oscuro con borde de acento, para meter vídeos del Stock.
export const Pantalla: React.FC<{
  ancho: number;
  alto: number;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ ancho, alto, style, children }) => (
  <div
    style={{
      width: ancho,
      height: alto,
      borderRadius: 18,
      border: `2px solid ${COLORES.borde}`,
      background: "#000",
      overflow: "hidden",
      boxShadow: "0 30px 80px rgba(0,0,0,.55)",
      ...style,
    }}
  >
    {children}
  </div>
);

export const VideoStock: React.FC<{ fichero: string; desdeSeg?: number; style?: React.CSSProperties }> = ({
  fichero,
  desdeSeg = 0,
  style,
}) => {
  const { fps } = useVideoConfig();
  return (
    <OffthreadVideo
      src={staticFile(fichero)}
      trimBefore={Math.round(desdeSeg * fps)}
      muted
      style={{ width: "100%", height: "100%", objectFit: "cover", ...style }}
    />
  );
};

export const PosterStock: React.FC<{ fichero: string; style?: React.CSSProperties }> = ({ fichero, style }) => (
  <Img src={staticFile(fichero)} style={{ width: "100%", height: "100%", objectFit: "cover", ...style }} />
);

// Rótulo pequeño en monoespaciada, estilo de los gemelos.
export const Rotulo: React.FC<{ children: React.ReactNode; color?: string; style?: React.CSSProperties }> = ({
  children,
  color = COLORES.acento,
  style,
}) => (
  <div
    style={{
      fontFamily: MONO,
      fontSize: 22,
      letterSpacing: ".14em",
      textTransform: "uppercase",
      color,
      ...style,
    }}
  >
    {children}
  </div>
);
