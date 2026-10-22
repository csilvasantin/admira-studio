// Guion de «Un prompt. Una tienda.» (nivel B, 22-oct-2026).
// Los tiempos salen de la duración real de cada línea de voz (public/voz/lineas.json).
import voz from "./voz.json";

export type Palabra = { text: string; startMs: number; endMs: number };
export type Linea = {
  id: string;
  quien: "neo" | "off";
  text: string;
  fichero: string;
  durMs: number;
  palabras: Palabra[];
};

export const LINEAS: Linea[] = voz as Linea[];
export const linea = (id: string): Linea => {
  const l = LINEAS.find((x) => x.id === id);
  if (!l) throw new Error(`línea ${id} no existe`);
  return l;
};

export const FPS = 30;
const seg = (s: number) => Math.round(s * FPS);
// Cada escena dura su voz más un respiro; las mudas, un tiempo fijo.
const RESPIRO = 0.6;
const dur = (id: string, extra = RESPIRO) => seg(linea(id).durMs / 1000 + extra);

type Escena = { id: string; desde: number; frames: number; voz?: string };
const orden: Array<[string, number, string?]> = [
  ["titulo", seg(4.5)],
  ["prompt", seg(6)],
  ["stock", dur("v1"), "v1"],
  ["pantallas", dur("v2"), "v2"],
  ["curvas", dur("v3"), "v3"],
  ["anuncio", dur("v4", 0.9), "v4"],
  ["listo", dur("v5", 0.9), "v5"],
  ["tutorial", dur("v6", 0.9), "v6"],
  ["cierre", dur("v7", 1.6), "v7"],
];
let acum = 0;
export const ESCENAS: Escena[] = orden.map(([id, frames, voz]) => {
  const e = { id, desde: acum, frames, voz };
  acum += frames;
  return e;
});
export const escena = (id: string): Escena => {
  const e = ESCENAS.find((x) => x.id === id);
  if (!e) throw new Error(`escena ${id} no existe`);
  return e;
};
export const TOTAL_FRAMES = acum + seg(1);

export const COLORES = {
  fondo: "#02080d",
  panel: "#0b1620",
  borde: "rgba(120,243,255,.24)",
  acento: "#78f3ff",
  neo: "#ff7a3d",
  texto: "#e9f6ff",
  mudo: "#8aa4b3",
};
export const FUENTE =
  '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", Arial, sans-serif';
export const MONO = '"SF Mono", Menlo, Consolas, monospace';
