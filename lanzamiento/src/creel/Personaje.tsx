// Pieza por personaje del Hotel Creel (PortAventura NeXT): el mismo lenguaje que la pared de la maqueta en admira.store
// (fondo rojo Hawkins, esporas, luces A–Z que deletrean el nombre, STRANGER THINGS · HAWKINS · HOTEL CREEL) y, en medio,
// la minifigura del personaje, su ficha y su línea con la voz de Admirito. Cuatro escenas: intro · ficha · línea · cierre.
// Todo se anima solo con el fotograma actual (nada de transiciones CSS). Banda segura: la LED del hotel es 8:3 y recorta
// el 16:9 por arriba y por abajo, así que lo importante va entre y=180 y y=900.
import React, { useMemo } from "react";
import { AbsoluteFill, Audio, Easing, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Personaje, planPersonaje, validarPersonaje } from "./props";

const SERIF = 'Georgia, "Times New Roman", serif';
const MONO = '"SF Mono", Menlo, Consolas, ui-monospace, monospace';
const ROJO = "#ff3326", BRASA = "#ff2a1f", SALMON = "#ffb3a8", CREMA = "#ffd9c7", AZUL = "#3fd2ff";
const LUCES = ["#ff4a3d", "#ffd23f", "#3fd2ff", "#5dff8a", "#ff6ad5"];
const LETRAS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const suave = Easing.bezier(0.16, 1, 0.3, 1);

const Ctx = React.createContext<Personaje | null>(null);
const usePersonaje = () => {
  const p = React.useContext(Ctx);
  if (!p) throw new Error("sin personaje");
  return p;
};
const useSeg = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return { frame, fps, s: frame / fps };
};
// Pseudoaleatorio estable por índice: cada fotograma debe salir igual en cada render.
const azar = (i: number, k = 0) => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
const letrasDe = (n: string) => n.toUpperCase().normalize("NFD").replace(/[^A-Z]/g, "");
const tonoDe = (p: Personaje) => (p.efecto === "portal" ? "vecna" : p.efecto === "cierre" ? "azul" : "rojo");

// Fondo: degradado rojo Hawkins (azul con Once, granate con Vecna), relámpago cada 7 s y esporas que suben.
const Fondo: React.FC<{ tono?: "rojo" | "azul" | "vecna" }> = ({ tono = "rojo" }) => {
  const { s } = useSeg();
  const c = tono === "azul" ? ["#7ad8ff", "#1d4f8a", "#06122e"] : tono === "vecna" ? ["#cf2549", "#6b1041", "#150b27"] : ["#ff3b2f", "#8c0b14", "#2a0308"];
  const rayo = s % 7 < 0.12;
  return (
    <AbsoluteFill style={{ background: `radial-gradient(circle 1440px at 50% 115%, ${c[0]} 0%, ${c[1]} 35%, ${c[2]} 100%)` }}>
      {rayo ? <AbsoluteFill style={{ background: "rgba(255,240,240,.35)" }} /> : null}
      <svg width="100%" height="100%" viewBox="0 0 1920 1080" style={{ position: "absolute", inset: 0 }}>
        {Array.from({ length: 46 }, (_, i) => {
          const v = 0.02 + azar(i, 1) * 0.05, y = ((((azar(i, 2) - s * v) % 1) + 1) % 1);
          return <circle key={i} cx={azar(i) * 1920 + Math.sin(s + azar(i, 2) * 9) * 12} cy={y * 1080} r={2 + azar(i, 3) * 4} fill="rgba(243,230,255,.75)" />;
        })}
      </svg>
    </AbsoluteFill>
  );
};

// Luces A–Z (las de Joyce): con nombre, se encienden fijas sus letras (las `cuantas` primeras, en orden); sin nombre, parpadean.
const Luces: React.FC<{ nombre?: string; cuantas?: number; y?: number }> = ({ nombre = "", cuantas = 99, y = 215 }) => {
  const { s } = useSeg();
  const letras = letrasDe(nombre), activas = new Set(letras.slice(0, cuantas));
  return (
    <svg width="100%" height="100%" viewBox="0 0 1920 1080" style={{ position: "absolute", inset: 0 }}>
      {LETRAS.map((l, i) => {
        const x = 1920 * 0.05 + i * ((1920 * 0.9) / 25), col = LUCES[i % 5];
        const on = letras ? activas.has(l) : ((s + i * 0.37) % 3) / 3 < 0.7;
        return (
          <g key={l} opacity={on ? 1 : letras ? 0.12 : 0.18} style={{ filter: on ? `drop-shadow(0 0 ${letras ? 22 : 14}px ${col})` : undefined }}>
            <circle cx={x} cy={y} r={16} fill={col} />
            <text x={x} y={y + 6} textAnchor="middle" fontFamily={SERIF} fontWeight={700} fontSize={17} fill="#1a0a0a">{l}</text>
          </g>
        );
      })}
    </svg>
  );
};

// STRANGER THINGS en trazo rojo y HAWKINS · HOTEL CREEL debajo, como en la pared.
const Titulo: React.FC<{ y?: number; escala?: number; opacidad?: number; azul?: boolean }> = ({ y = 330, escala = 1, opacidad = 1, azul = false }) => {
  const p = usePersonaje();
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: y, textAlign: "center", opacity: opacidad, transform: `scale(${escala})`, transformOrigin: "50% 0" }}>
      <div style={{ fontFamily: SERIF, fontWeight: 900, fontSize: 128, lineHeight: 1, color: "transparent", WebkitTextStroke: `4px ${azul ? "#9be3ff" : ROJO}`, filter: `drop-shadow(0 0 22px ${azul ? AZUL : BRASA})`, letterSpacing: ".02em" }}>
        {p.marca.titulo}
      </div>
      <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 28, color: SALMON, letterSpacing: ".42em", marginTop: 22 }}>{p.marca.sub}</div>
    </div>
  );
};

// Minifigura del personaje (la misma ilustración que la ficha de la maqueta), con su pelo, su piel y su chaqueta.
const Minifigura: React.FC<{ alto: number; x: number; y: number; opacidad?: number }> = ({ alto, x, y, opacidad = 1 }) => {
  const p = usePersonaje();
  const w = (alto * 24) / 34;
  return (
    <svg viewBox="0 0 24 34" width={w} height={alto} style={{ position: "absolute", left: x - w / 2, top: y, opacity: opacidad, filter: "drop-shadow(0 18px 30px rgba(0,0,0,.55))" }}>
      <rect x="7" y="2" width="10" height="4" rx="2" fill={p.pelo} />
      <rect x="7" y="5" width="10" height="9" rx="2" fill={p.piel} />
      <rect x="6" y="4" width="2" height="6" fill={p.pelo} />
      <circle cx="10" cy="9.5" r="1" fill="#1b1410" />
      <circle cx="14" cy="9.5" r="1" fill="#1b1410" />
      <path d="M10 12q2 1.4 4 0" stroke="#1b1410" strokeWidth=".8" fill="none" />
      <path d="M5 15h14l2 9H3z" fill={p.chaqueta} />
      <rect x="2" y="16" width="3" height="8" rx="1.5" fill={p.chaqueta} />
      <rect x="19" y="16" width="3" height="8" rx="1.5" fill={p.chaqueta} />
      <rect x="6" y="24" width="5.5" height="9" fill="#2b2b38" />
      <rect x="12.5" y="24" width="5.5" height="9" fill="#2b2b38" />
    </svg>
  );
};

// Casa (silueta del hotel) para los efectos que la necesitan.
const Casa: React.FC<{ x: number; y: number; w?: number; fill?: string; ventanas?: number }> = ({ x, y, w = 360, fill = "#1a0509", ventanas = -1 }) => {
  const h = w * 0.62;
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d={`M0 ${h} V${h * 0.42} L${w * 0.5} 0 L${w} ${h * 0.42} V${h} Z`} fill={fill} stroke={ROJO} strokeWidth={3} />
      <rect x={w * 0.44} y={-h * 0.22} width={w * 0.12} height={h * 0.4} fill={fill} stroke={ROJO} strokeWidth={3} />
      {[0, 1, 2, 3, 4, 5].map((k) => {
        const on = ventanas === k;
        return <rect key={k} x={w * (0.14 + (k % 3) * 0.28)} y={h * (0.5 + Math.floor(k / 3) * 0.24)} width={w * 0.14} height={h * 0.16} fill={on ? "#ffd27a" : "#3a0a12"} style={{ filter: on ? "drop-shadow(0 0 16px #ffd27a)" : undefined }} />;
      })}
    </g>
  );
};

// El efecto de cada personaje: una viñeta de 1240 × 330 animada por el fotograma.
const Efecto: React.FC = () => {
  const p = usePersonaje();
  const { s, frame } = useSeg();
  const W = 1240, H = 330;
  const el = (() => {
    switch (p.efecto) {
      case "lago":
        return (
          <>
            <rect x={0} y={150} width={W} height={180} fill="#06122e" opacity={0.9} />
            {[0, 1, 2, 3].map((k) => { const f = ((s / 2.4 + k / 4) % 1); return <ellipse key={k} cx={620} cy={235} rx={60 + f * 520} ry={10 + f * 70} fill="none" stroke={AZUL} strokeWidth={3} opacity={1 - f} />; })}
            <g transform="translate(440 330) scale(1 -1)" opacity={0.55 + 0.3 * Math.sin(s * 2)}><Casa x={0} y={0} fill="#0b1a3a" /></g>
          </>
        );
      case "sendero":
        return (
          <>
            <path d="M40 300 C 300 260, 600 280, 1000 180" stroke="#3a0a12" strokeWidth={28} fill="none" strokeLinecap="round" />
            {[0, 1, 2, 3, 4, 5, 6].map((k) => { const t = k / 6, x = 40 + t * 960, y = 300 - 20 * Math.sin(t * 3) - t * 110, on = s > 0.3 + k * 0.28; return <circle key={k} cx={x} cy={y - 10} r={12} fill={on ? "#ffd23f" : "#3a0a12"} style={{ filter: on ? "drop-shadow(0 0 18px #ffd23f)" : undefined }} />; })}
            <rect x={1000} y={60} width={200} height={150} fill={s > 2.3 ? "#ffb347" : "#2a0308"} stroke={ROJO} strokeWidth={3} opacity={0.9} style={{ filter: s > 2.3 ? "drop-shadow(0 0 30px #ffb347)" : undefined }} />
          </>
        );
      case "linterna": {
        const ang = Math.sin(s * 1.3) * 7;
        return (
          <>
            <rect x={940} y={70} width={110} height={220} fill="#3a0a12" stroke={ROJO} strokeWidth={3} />
            <rect x={975} y={120} width={40} height={170} fill={Math.abs(ang) < 3 ? "#ffd27a" : "#120408"} style={{ filter: Math.abs(ang) < 3 ? "drop-shadow(0 0 24px #ffd27a)" : undefined }} />
            <g transform={`rotate(${ang} 120 200)`}>
              <polygon points="120,200 1240,40 1240,330" fill="url(#cono)" opacity={0.9} />
            </g>
            <circle cx={120} cy={200} r={22} fill="#e9f6ff" style={{ filter: "drop-shadow(0 0 20px #fff)" }} />
            <defs><linearGradient id="cono" x1="0" x2="1"><stop offset="0" stopColor="rgba(255,240,200,.75)" /><stop offset="1" stopColor="rgba(255,240,200,0)" /></linearGradient></defs>
          </>
        );
      }
      case "radio":
        return (
          <>
            <rect x={60} y={40} width={1120} height={250} rx={18} fill="#2c2329" stroke="#f3b27d" strokeWidth={4} />
            {Array.from({ length: 22 }, (_, i) => { const h = 30 + 150 * Math.abs(Math.sin(s * 5 + i * 0.7)) * (0.4 + azar(i) * 0.6); return <rect key={i} x={110 + i * 46} y={240 - h} width={28} height={h} rx={4} fill={i % 3 ? "#ff9872" : "#ffd23f"} />; })}
            <text x={1140} y={90} textAnchor="end" fontFamily={MONO} fontWeight={800} fontSize={44} fill="#ffd9c7">WSQK</text>
            <text x={1140} y={130} textAnchor="end" fontFamily={MONO} fontWeight={700} fontSize={22} fill="#ffb3a8" letterSpacing={4}>1.ª PISTA</text>
          </>
        );
      case "ventanas":
        return (
          <>
            <Casa x={340} y={70} w={420} ventanas={Math.floor(s * 2) % 6} />
            <rect x={960} y={20} width={60} height={300} fill="#1a0509" stroke={ROJO} strokeWidth={3} />
            <circle cx={990} cy={30} r={12} fill={s % 1 < 0.5 ? "#ff4a3d" : "#3a0a12"} style={{ filter: s % 1 < 0.5 ? "drop-shadow(0 0 16px #ff4a3d)" : undefined }} />
            <path d={`M760 150 L 950 60`} stroke="#ffd27a" strokeWidth={3} strokeDasharray="14 12" opacity={0.7} />
          </>
        );
      case "flash": {
        const flash = s > 1 && s < 1.16, despues = interpolate(s, [1.16, 1.9], [0, 1], clamp);
        return (
          <>
            <Casa x={420} y={90} w={400} />
            <g opacity={despues}>
              <ellipse cx={620} cy={300} rx={70} ry={12} fill="rgba(0,0,0,.6)" />
              <rect x={590} y={180} width={60} height={120} rx={10} fill="#0a0206" />
              <circle cx={620} cy={160} r={32} fill="#0a0206" />
            </g>
            {flash ? <rect x={0} y={0} width={W} height={H} fill="rgba(255,255,255,.92)" /> : null}
            <rect x={60} y={200} width={120} height={80} rx={10} fill="#2c2329" stroke="#f3b27d" strokeWidth={3} />
            <circle cx={120} cy={240} r={22} fill={flash ? "#fff" : "#120408"} stroke="#f3b27d" strokeWidth={3} />
          </>
        );
      }
      case "faros": {
        const r = interpolate(s, [0, 1], [10, 90], { ...clamp, easing: suave });
        return (
          <>
            <polygon points="320,200 1240,20 1240,330" fill="rgba(255,236,180,.22)" />
            <polygon points="760,200 1240,60 1240,330" fill="rgba(255,236,180,.22)" />
            {[320, 760].map((x) => <circle key={x} cx={x} cy={200} r={r} fill="#fff6d6" style={{ filter: "drop-shadow(0 0 40px #ffecb4)" }} />)}
            <rect x={200} y={120} width={700} height={170} rx={30} fill="#0a0206" opacity={0.8} />
            {[320, 760].map((x) => <circle key={x} cx={x} cy={200} r={r} fill="#fff6d6" />)}
          </>
        );
      }
      case "frecuencia": {
        const amp = interpolate(s, [0, 1.2], [8, 110], clamp);
        const d = Array.from({ length: 120 }, (_, i) => { const x = 40 + i * 9.6; return `${i ? "L" : "M"}${x} ${175 + Math.sin(i * 0.22 + s * 6) * amp * Math.sin(i / 120 * Math.PI)}`; }).join(" ");
        return (
          <>
            <path d={d} stroke={AZUL} strokeWidth={5} fill="none" style={{ filter: `drop-shadow(0 0 14px ${AZUL})` }} />
            <path d="M40 175 H1200" stroke="rgba(255,255,255,.2)" strokeWidth={2} />
            <text x={1200} y={60} textAnchor="end" fontFamily={MONO} fontWeight={700} fontSize={22} fill="#ffb3a8" letterSpacing={4}>2.ª PISTA</text>
          </>
        );
      }
      case "porche": {
        const g = 0.6 + 0.4 * Math.sin(s * 3);
        return (
          <>
            <path d="M300 110 L620 20 L940 110 Z" fill="#1a0509" stroke={ROJO} strokeWidth={3} />
            {[340, 520, 720, 900].map((x) => <rect key={x} x={x - 14} y={110} width={28} height={190} fill="#3a0a12" stroke={ROJO} strokeWidth={2} />)}
            <rect x={300} y={300} width={640} height={16} fill="#3a0a12" />
            {[430, 620, 810].map((x, i) => <circle key={x} cx={x} cy={150 + (i % 2) * 10} r={16} fill="#ffb347" opacity={0.7 + 0.3 * g} style={{ filter: `drop-shadow(0 0 ${20 + 20 * g}px #ffb347)` }} />)}
            <ellipse cx={620} cy={300} rx={340} ry={40} fill="#ffb347" opacity={0.18 * g} />
          </>
        );
      }
      case "grieta": {
        const avance = interpolate(s, [0.2, 2.2], [0, 1], { ...clamp, easing: suave });
        return (
          <>
            <rect x={0} y={200} width={W} height={130} fill={`rgb(${Math.round(interpolate(avance, [0, 1], [30, 70]))},${Math.round(interpolate(avance, [0, 1], [90, 20]))},${Math.round(interpolate(avance, [0, 1], [50, 80]))})`} opacity={0.8} />
            <path d="M40 300 L220 250 L300 275 L470 190 L560 215 L700 150 L780 185 L930 110 L1020 140 L1200 60" stroke={ROJO} strokeWidth={6} fill="none" pathLength={1} strokeDasharray={`${avance} 1`} style={{ filter: `drop-shadow(0 0 16px ${BRASA})` }} />
          </>
        );
      }
      case "pulso": {
        const beat = (s * 2) % 1;
        return (
          <>
            {[0, 1, 2].map((k) => { const f = (beat + k / 3) % 1; return <circle key={k} cx={620} cy={170} r={30 + f * 150} fill="none" stroke="#ff6ad5" strokeWidth={4} opacity={1 - f} />; })}
            <circle cx={620} cy={170} r={34 + (1 - beat) * 14} fill="#ff6ad5" style={{ filter: "drop-shadow(0 0 30px #ff6ad5)" }} />
            {Array.from({ length: 16 }, (_, i) => { const h = 20 + 90 * Math.abs(Math.sin(s * 6.3 + i)); return <rect key={i} x={60 + i * 22} y={300 - h} width={14} height={h} rx={3} fill="#ff6ad5" opacity={0.8} />; })}
            <text x={1200} y={60} textAnchor="end" fontFamily={MONO} fontWeight={700} fontSize={22} fill="#ffb3a8" letterSpacing={4}>3.ª PISTA</text>
          </>
        );
      }
      case "portal":
        return (
          <>
            <circle cx={620} cy={170} r={150} fill="none" stroke="#cf2549" strokeWidth={14} strokeDasharray="60 28" transform={`rotate(${frame * 1.7} 620 170)`} style={{ filter: "drop-shadow(0 0 30px #cf2549)" }} />
            <circle cx={620} cy={170} r={110} fill="#150b27" opacity={0.9} />
            <circle cx={620} cy={170} r={70} fill="#efd4a8" stroke="#60404b" strokeWidth={5} />
            <path d="M620 110 V120 M620 220 V230 M560 170 H570 M670 170 H680" stroke="#5e343a" strokeWidth={4} />
            <path d="M620 170 L620 118 M620 170 L648 160" stroke="#8f463b" strokeWidth={6} strokeLinecap="round" />
            <text x={1200} y={60} textAnchor="end" fontFamily={MONO} fontWeight={700} fontSize={22} fill="#ffb3a8" letterSpacing={4}>23:59</text>
          </>
        );
      case "cierre": {
        const r = interpolate(s, [0, 1.6], [150, 0], { ...clamp, easing: suave }), luz = interpolate(s, [1.4, 2.4], [0, 1], clamp);
        return (
          <>
            {r > 1 ? <circle cx={620} cy={170} r={r} fill="none" stroke="#cf2549" strokeWidth={10} strokeDasharray="60 28" transform={`rotate(${frame * 1.7} 620 170)`} opacity={r / 150} /> : null}
            {[0, 1, 2, 3, 4, 5, 6].map((k) => <circle key={k} cx={200 + k * 140} cy={290} r={14} fill="#ffd27a" opacity={0.15 + 0.85 * luz} style={{ filter: luz > 0.5 ? "drop-shadow(0 0 22px #ffd27a)" : undefined }} />)}
            <circle cx={620} cy={170} r={28} fill={AZUL} opacity={1 - r / 150} style={{ filter: `drop-shadow(0 0 30px ${AZUL})` }} />
          </>
        );
      }
    }
  })();
  return <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H}>{el}</svg>;
};

// Subtítulo palabra a palabra, sincronizado con la voz de Admirito.
const Subtitulo: React.FC<{ ms: number }> = ({ ms }) => {
  const p = usePersonaje();
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 790, display: "flex", justifyContent: "center" }}>
      <div style={{ maxWidth: 1560, padding: "12px 28px", borderRadius: 14, background: "rgba(20,3,6,.72)", border: `2px solid ${ROJO}`, fontFamily: MONO, fontWeight: 700, fontSize: 38, lineHeight: 1.25, textAlign: "center", color: "#fff", boxShadow: `0 0 30px ${BRASA}55` }}>
        {p.linea.palabras.map((w, i) => (
          <span key={i} style={{ opacity: ms >= w.startMs ? 1 : 0.35, color: ms >= w.startMs && ms < w.endMs + 120 ? CREMA : undefined }}>
            {w.text}{i < p.linea.palabras.length - 1 ? " " : ""}
          </span>
        ))}
      </div>
    </div>
  );
};

// Escena 1 · intro: el título aparece y las luces deletrean el nombre.
const Intro: React.FC = () => {
  const p = usePersonaje();
  const { frame, fps } = useSeg();
  const letras = letrasDe(p.nombre);
  const cuantas = Math.floor(interpolate(frame, [0.6 * fps, 0.6 * fps + letras.length * 0.16 * fps], [0, letras.length], clamp));
  const op = interpolate(frame, [0.2 * fps, 1 * fps], [0, 1], clamp);
  return (
    <>
      <Fondo />
      <Luces nombre={cuantas > 0 ? p.nombre : ""} cuantas={cuantas} />
      <Titulo y={330} opacidad={op} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 560, textAlign: "center", fontFamily: MONO, fontWeight: 800, fontSize: 92, color: "#fff", letterSpacing: ".3em", textShadow: `0 0 20px ${BRASA}` }}>
        {letras.slice(0, cuantas)}<span style={{ opacity: frame % fps < fps / 2 ? 1 : 0 }}>_</span>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 700, textAlign: "center", fontFamily: MONO, fontWeight: 700, fontSize: 30, color: CREMA, letterSpacing: ".2em", opacity: cuantas >= letras.length ? 1 : 0 }}>
        {p.nombre.toUpperCase()} SE ACERCA…
      </div>
    </>
  );
};

// Escena 2 · ficha: minifigura, nombre, zona y celda del tablero.
const Ficha: React.FC = () => {
  const p = usePersonaje();
  const { frame, fps } = useSeg();
  const t = interpolate(frame, [0, 0.7 * fps], [0, 1], { ...clamp, easing: suave });
  return (
    <>
      <Fondo tono={tonoDe(p)} />
      <Luces nombre={p.nombre} />
      <Titulo y={262} escala={0.62} opacidad={0.9} azul={p.efecto === "cierre"} />
      <Minifigura alto={380} x={620 - (1 - t) * 160} y={440} opacidad={t} />
      <div style={{ position: "absolute", left: 860, top: 470, opacity: t, transform: `translateY(${(1 - t) * 30}px)` }}>
        <div style={{ fontFamily: MONO, fontSize: 26, color: CREMA, letterSpacing: ".3em" }}>PERSONAJE {p.id} / {p.total}</div>
        <div style={{ fontFamily: SERIF, fontWeight: 900, fontSize: p.nombre.length > 8 ? 108 : 150, whiteSpace: "nowrap", color: "#fff", lineHeight: 1, textShadow: `0 0 28px ${BRASA}`, marginTop: 8 }}>{p.nombre.toUpperCase()}</div>
        <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 36, color: SALMON, marginTop: 18 }}>
          {p.zona.toUpperCase()} <span style={{ color: CREMA, opacity: 0.7 }}>· {p.celda}</span>
        </div>
      </div>
    </>
  );
};

// Escena 3 · línea: la voz de Admirito, el subtítulo y el efecto del personaje.
const Linea: React.FC = () => {
  const p = usePersonaje();
  const { frame, fps } = useSeg();
  const t = interpolate(frame, [0, 0.5 * fps], [0, 1], { ...clamp, easing: suave });
  return (
    <>
      <Fondo tono={tonoDe(p)} />
      <Luces nombre={p.nombre} />
      <Titulo y={262} escala={0.62} opacidad={0.9} azul={p.efecto === "cierre"} />
      <Audio src={staticFile(p.linea.fichero)} volume={p.voz.volumen} />
      <Minifigura alto={300} x={300} y={440} opacidad={t} />
      <div style={{ position: "absolute", left: 140, top: 752, width: 320, textAlign: "center", fontFamily: MONO, fontWeight: 800, fontSize: 30, color: "#fff", opacity: t, textShadow: `0 0 14px ${BRASA}` }}>{p.nombre.toUpperCase()}</div>
      <div style={{ position: "absolute", left: 520, top: 430, width: 1240, height: 330, opacity: t }}><Efecto /></div>
      <Subtitulo ms={(frame / fps) * 1000} />
    </>
  );
};

// Escena 4 · cierre: título, nombre · zona y la marca.
const Cierre: React.FC = () => {
  const p = usePersonaje();
  const { frame, fps } = useSeg();
  const t = interpolate(frame, [0, 0.6 * fps], [0, 1], { ...clamp, easing: suave });
  return (
    <>
      <Fondo tono={tonoDe(p)} />
      <Luces nombre={p.nombre} />
      <Titulo y={300} opacidad={t} azul={p.efecto === "cierre"} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 560, textAlign: "center", fontFamily: MONO, fontWeight: 700, fontSize: 30, color: CREMA, letterSpacing: ".2em", opacity: t }}>
        {p.nombre.toUpperCase()} · {p.zona.toUpperCase()}
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 640, textAlign: "center", fontFamily: MONO, fontSize: 26, color: "rgba(255,255,255,.7)", letterSpacing: ".3em", opacity: t }}>
        {p.marca.pie.toUpperCase()}
      </div>
    </>
  );
};

// Cama musical en bucle: baja cuando habla Admirito y se apaga al final.
const Musica: React.FC = () => {
  const p = usePersonaje();
  const { frame, fps } = useSeg();
  const { durationInFrames } = useVideoConfig();
  const plan = useMemo(() => planPersonaje(p), [p]);
  const hablando = frame >= plan.desde.linea && frame < plan.desde.linea + (p.linea.durMs / 1000) * fps + 0.3 * fps;
  const base = hablando ? p.musica.volumenHablando : p.musica.volumen;
  const vol = interpolate(frame, [0, 1.2 * fps, durationInFrames - 1.5 * fps, durationInFrames], [0, base, base, 0], clamp);
  return <Audio src={staticFile(p.musica.fichero)} loop volume={vol} />;
};

export const PiezaPersonaje: React.FC<Personaje> = (props) => {
  const p = useMemo(() => validarPersonaje(props), [props]);
  const plan = useMemo(() => planPersonaje(p), [p]);
  return (
    <Ctx.Provider value={p}>
      <AbsoluteFill style={{ background: "#2a0308", color: "#fff" }}>
        <Musica />
        <Sequence from={plan.desde.intro} durationInFrames={plan.intro} name="intro"><Intro /></Sequence>
        <Sequence from={plan.desde.ficha} durationInFrames={plan.ficha} name="ficha"><Ficha /></Sequence>
        <Sequence from={plan.desde.linea} durationInFrames={plan.linea} name="linea"><Linea /></Sequence>
        <Sequence from={plan.desde.cierre} durationInFrames={plan.cierre} name="cierre"><Cierre /></Sequence>
      </AbsoluteFill>
    </Ctx.Provider>
  );
};
