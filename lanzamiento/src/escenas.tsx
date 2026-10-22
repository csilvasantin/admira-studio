import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORES, FUENTE, MONO, useLanzamiento } from "./guion";
import { Pantalla, PosterStock, Rotulo, VideoStock, useEntrada } from "./piezas";

const Fondo: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(1200px 700px at 70% 20%, #0d2230 0%, ${COLORES.fondo} 60%)`,
      color: COLORES.texto,
      fontFamily: FUENTE,
    }}
  >
    {children}
  </AbsoluteFill>
);

// 1 · Título
export const Titulo: React.FC = () => {
  const { marca, titulo } = useLanzamiento();
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const e1 = useEntrada(0.2, 0.9);
  const e2 = useEntrada(1.1, 0.9);
  const salida = interpolate(frame, [durationInFrames - 0.5 * fps, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <Fondo>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: salida }}>
        <Rotulo style={{ ...e1, marginBottom: 28 }}>{`${marca.crea} · ${marca.emite} · ${marca.fecha}`}</Rotulo>
        <div style={{ ...e1, fontSize: 132, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1 }}>
          {titulo.linea1}
        </div>
        <div style={{ ...e2, fontSize: 132, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1, color: COLORES.acento }}>
          {titulo.linea2}
        </div>
      </AbsoluteFill>
    </Fondo>
  );
};

// 2 · El prompt, escrito en admira.studio
export const Prompt: React.FC = () => {
  const { prompt } = useLanzamiento();
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const e = useEntrada(0, 0.6);
  const letras = Math.floor(
    interpolate(frame, [0.4 * fps, 3.6 * fps], [0, prompt.texto.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
  );
  const enviado = frame > 4.2 * fps;
  const cursorVisible = Math.floor(frame / (fps / 2.5)) % 2 === 0;
  const salida = interpolate(frame, [durationInFrames - 0.4 * fps, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <Fondo>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: salida }}>
        <div
          style={{
            ...e,
            width: 1240,
            borderRadius: 22,
            background: "#f7f4ee",
            color: "#1c1c1c",
            padding: "34px 40px",
            boxShadow: "0 40px 100px rgba(0,0,0,.5)",
          }}
        >
          <div style={{ fontFamily: FUENTE, fontSize: 26, color: "#8a8378", marginBottom: 22 }}>
            {prompt.cabecera}
          </div>
          <div style={{ fontSize: 40, lineHeight: 1.3, minHeight: 110 }}>
            {prompt.texto.slice(0, letras)}
            <span style={{ opacity: enviado ? 0 : cursorVisible ? 1 : 0 }}>▍</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 18 }}>
            <span style={{ fontFamily: MONO, fontSize: 20, color: "#8a8378" }}>{prompt.pie}</span>
            <span
              style={{
                fontFamily: MONO,
                fontSize: 20,
                padding: "8px 16px",
                borderRadius: 10,
                background: enviado ? COLORES.neo : "#d9d2c5",
                color: enviado ? "#1a0a03" : "#6b6459",
              }}
            >
              {enviado ? "enviado" : "enviar"}
            </span>
          </div>
        </div>
      </AbsoluteFill>
    </Fondo>
  );
};

// 3 · Las piezas del Stock se organizan en rejilla
export const Stock: React.FC = () => {
  const { piezas, rotulos } = useLanzamiento();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const tam = [
    { w: 560, h: 315 },
    { w: 260, h: 462 },
    { w: 560, h: 315 },
    { w: 820, h: 230 },
    { w: 560, h: 180 },
    { w: 560, h: 315 },
    { w: 260, h: 462 },
    { w: 560, h: 315 },
  ];
  return (
    <Fondo>
      <AbsoluteFill style={{ padding: "70px 90px 150px" }}>
        <Rotulo style={{ marginBottom: 26 }}>{rotulos.stock}</Rotulo>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 26, alignContent: "flex-start" }}>
          {piezas.posters.map((p, i) => {
            const t = interpolate(frame, [i * 0.35 * fps, (i * 0.35 + 0.6) * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            });
            return (
              <div key={p} style={{ opacity: t, scale: String(0.9 + 0.1 * t), translate: `0px ${(1 - t) * 30}px` }}>
                <Pantalla ancho={tam[i].w} alto={tam[i].h}>
                  <PosterStock fichero={p} />
                </Pantalla>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </Fondo>
  );
};

// 4 · Las pantallas se encienden con los visuales
export const Pantallas: React.FC = () => {
  const { piezas, rotulos } = useLanzamiento();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enc = (i: number) =>
    interpolate(frame, [i * 0.4 * fps, (i * 0.4 + 0.5) * fps], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <Fondo>
      <AbsoluteFill style={{ padding: "70px 90px 150px" }}>
        <Rotulo style={{ marginBottom: 26 }}>{rotulos.pantallas}</Rotulo>
        <div style={{ display: "flex", gap: 40, alignItems: "flex-end" }}>
          <div style={{ opacity: enc(0) }}>
            <Pantalla ancho={1130} alto={636}>
              <VideoStock fichero={piezas.horizontal.fichero} desdeSeg={2} />
            </Pantalla>
            <Rotulo style={{ marginTop: 12, fontSize: 18, color: COLORES.mudo }}>{rotulos.pantallaHorizontal}</Rotulo>
          </div>
          <div style={{ opacity: enc(1) }}>
            <Pantalla ancho={358} alto={636}>
              <VideoStock fichero={piezas.vertical.fichero} desdeSeg={2} />
            </Pantalla>
            <Rotulo style={{ marginTop: 12, fontSize: 18, color: COLORES.mudo }}>{rotulos.pantallaVertical}</Rotulo>
          </div>
        </div>
      </AbsoluteFill>
    </Fondo>
  );
};

// 5 · Curvas de animación y ritmo
export const Curvas: React.FC = () => {
  const { rotulos } = useLanzamiento();
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const avance = interpolate(frame, [0, durationInFrames], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const W = 1500;
  const H = 520;
  const puntos = Array.from({ length: 61 }, (_, i) => {
    const x = i / 60;
    const y = Easing.bezier(0.16, 1, 0.3, 1)(x);
    return `${(x * W).toFixed(1)},${(H - y * H).toFixed(1)}`;
  });
  const largo = 2100;
  const marcas = [0.12, 0.3, 0.55, 0.8];
  return (
    <Fondo>
      <AbsoluteFill style={{ padding: "70px 90px 150px" }}>
        <Rotulo style={{ marginBottom: 20 }}>{rotulos.curvas}</Rotulo>
        <div style={{ background: COLORES.panel, border: `1px solid ${COLORES.borde}`, borderRadius: 18, padding: 30 }}>
          <svg width={W} height={H} style={{ display: "block", overflow: "visible" }}>
            {[0.25, 0.5, 0.75].map((g) => (
              <line key={g} x1={0} x2={W} y1={H * g} y2={H * g} stroke="rgba(255,255,255,.08)" />
            ))}
            <polyline
              points={puntos.join(" ")}
              fill="none"
              stroke={COLORES.acento}
              strokeWidth={6}
              strokeDasharray={largo}
              strokeDashoffset={largo * (1 - avance)}
            />
            {marcas.map((m, i) => {
              const x = m * W;
              const y = H - Easing.bezier(0.16, 1, 0.3, 1)(m) * H;
              const on = avance > m;
              return (
                <g key={i} opacity={on ? 1 : 0.25}>
                  <rect x={x - 11} y={y - 11} width={22} height={22} fill={on ? COLORES.neo : "#1c2b36"} transform={`rotate(45 ${x} ${y})`} />
                </g>
              );
            })}
          </svg>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16, fontFamily: MONO, color: COLORES.mudo, fontSize: 20 }}>
            <span>0 s</span>
            <span>easing bezier(0.16, 1, 0.3, 1)</span>
            <span>{(frame / fps).toFixed(2)} s</span>
          </div>
        </div>
      </AbsoluteFill>
    </Fondo>
  );
};

// 6 · El anuncio a pantalla completa
export const Anuncio: React.FC = () => {
  const { piezas, rotulos } = useLanzamiento();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entra = interpolate(frame, [0, 0.6 * fps], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <AbsoluteFill style={{ opacity: entra }}>
        <VideoStock fichero={piezas.horizontal.fichero} desdeSeg={6} />
      </AbsoluteFill>
      <AbsoluteFill style={{ padding: "60px 70px" }}>
        <Rotulo style={{ opacity: entra }}>{rotulos.anuncio}</Rotulo>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// 7 · Lanzamiento listo: las piezas juntas
export const Listo: React.FC = () => {
  const { piezas, rotulos } = useLanzamiento();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entra = interpolate(frame, [0, 0.6 * fps], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <Fondo>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", paddingBottom: 90, opacity: entra }}>
        <Rotulo style={{ marginBottom: 22 }}>{rotulos.listo}</Rotulo>
        <Pantalla ancho={1760} alto={494}>
          <VideoStock fichero={piezas.conjunto.fichero} desdeSeg={3} style={{ objectFit: "contain", background: "#000" }} />
        </Pantalla>
      </AbsoluteFill>
    </Fondo>
  );
};

// 8 · Tutorial en pasos
export const Tutorial: React.FC = () => {
  const { tutorial, rotulos } = useLanzamiento();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ultimo = tutorial.length - 1;
  return (
    <Fondo>
      <AbsoluteFill style={{ padding: "90px 120px 150px" }}>
        <Rotulo style={{ marginBottom: 36 }}>{rotulos.tutorial}</Rotulo>
        {tutorial.map((p, i) => {
          const t = interpolate(frame, [(0.3 + i * 1.5) * fps, (0.9 + i * 1.5) * fps], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          });
          return (
            <div key={p} style={{ display: "flex", alignItems: "center", gap: 30, marginBottom: 34, opacity: t, translate: `${(1 - t) * -40}px 0px` }}>
              <div
                style={{
                  width: 78,
                  height: 78,
                  borderRadius: 20,
                  background: i === ultimo ? COLORES.neo : COLORES.panel,
                  border: `2px solid ${i === ultimo ? COLORES.neo : COLORES.borde}`,
                  display: "grid",
                  placeItems: "center",
                  fontFamily: MONO,
                  fontSize: 36,
                  color: i === ultimo ? "#1a0a03" : COLORES.acento,
                }}
              >
                {i + 1}
              </div>
              <div style={{ fontSize: 56, fontWeight: 700 }}>{p}</div>
            </div>
          );
        })}
      </AbsoluteFill>
    </Fondo>
  );
};

// 9 · Cierre
export const Cierre: React.FC = () => {
  const { cierre, rotulos } = useLanzamiento();
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const e1 = useEntrada(0.1, 0.8);
  const e2 = useEntrada(0.8, 0.8);
  const salida = interpolate(frame, [durationInFrames - 1.2 * fps, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <Fondo>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", paddingBottom: 90, opacity: salida }}>
        <div style={{ ...e1, fontSize: 96, fontWeight: 800, letterSpacing: "-0.02em", textAlign: "center", lineHeight: 1.05 }}>
          {cierre.linea1}
          <br />
          <span style={{ color: COLORES.acento }}>{cierre.linea2}</span>
        </div>
        <Rotulo style={{ ...e2, marginTop: 44 }}>{rotulos.cierre}</Rotulo>
      </AbsoluteFill>
    </Fondo>
  );
};
