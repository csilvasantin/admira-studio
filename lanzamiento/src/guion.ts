// El plan de escenas sale de los datos del lanzamiento (props.json): cada escena con voz dura
// lo que dura su línea más un respiro; las mudas, sus segundos. Nada se teclea a mano.
import React, { useContext } from "react";
import { useVideoConfig } from "remotion";
import type { Lanzamiento, Linea } from "./props";

export type EscenaPlan = { id: string; desde: number; frames: number; voz?: string };

export const planificar = (l: Lanzamiento): { escenas: EscenaPlan[]; total: number } => {
  const seg = (s: number) => Math.round(s * l.fps);
  const linea = (id: string): Linea => {
    const x = l.lineas.find((y) => y.id === id);
    if (!x) throw new Error(`línea ${id} no existe`);
    return x;
  };
  let acum = 0;
  const escenas = l.escenas.map((e) => {
    const frames = e.voz ? seg(linea(e.voz).durMs / 1000 + e.respiro) : seg(e.segundos ?? 0);
    const plan = { id: e.id, desde: acum, frames, voz: e.voz };
    acum += frames;
    return plan;
  });
  return { escenas, total: acum + seg(1) };
};

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

// Los datos validados del lanzamiento llegan a las escenas por contexto.
export const LanzamientoContext = React.createContext<Lanzamiento | null>(null);
export const useLanzamiento = (): Lanzamiento => {
  const l = useContext(LanzamientoContext);
  if (!l) throw new Error("falta el LanzamientoContext");
  return l;
};
export const useLinea = (id: string): Linea => {
  const l = useLanzamiento();
  const x = l.lineas.find((y) => y.id === id);
  if (!x) throw new Error(`línea ${id} no existe`);
  return x;
};

// Vertical (9:16, las pantallas del local) frente a horizontal (16:9). Los valores 16:9 no cambian nunca.
export const useVertical = (): boolean => {
  const { width, height } = useVideoConfig();
  return height > width;
};
