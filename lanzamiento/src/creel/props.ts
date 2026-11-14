// Datos de una pieza por personaje del Hotel Creel (PortAventura NeXT). Todo lo que se ve u oye sale de aquí:
// quién es, dónde está en el tablero, su línea con la voz de Admirito y sus tiempos, su efecto y la música.
import { z } from "zod";

// Las mismas definiciones que ../props (PalabraSchema y PROHIBIDAS), repetidas aquí para que Node pueda importar este
// fichero sin empaquetar (scripts/creel.mjs); props.test.mjs comprueba que no se separan.
export const PalabraSchema = z.object({
  text: z.string().min(1),
  startMs: z.number().int().nonnegative(),
  endMs: z.number().int().nonnegative(),
});
export const PROHIBIDAS = /\b(claude|codex|remotion|anthropic|openai|gpt)\b/i;

const color = z.string().regex(/^#[0-9a-f]{6}$/i);

export const EFECTOS = ["lago", "sendero", "linterna", "radio", "ventanas", "flash", "faros", "frecuencia", "porche", "grieta", "pulso", "portal", "cierre"] as const;

export const PersonajeSchema = z.object({
  id: z.number().int().min(1).max(13),
  nombre: z.string().min(1).max(40),
  slug: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
  celda: z.string().min(2).max(4),
  zona: z.string().min(1).max(40),
  chaqueta: color,
  pelo: color,
  piel: color.default("#edb880"),
  efecto: z.enum(EFECTOS),
  idioma: z.enum(["es", "en"]).default("es"),
  total: z.number().int().min(1).default(13),
  linea: z.object({
    text: z.string().min(1).max(160),
    fichero: z.string().min(1), // ruta dentro de public/
    durMs: z.number().int().positive(),
    palabras: z.array(PalabraSchema).min(1),
  }),
  voz: z.object({ volumen: z.number().min(0).max(1).default(1) }).prefault({}),
  musica: z.object({
    fichero: z.string().min(1).default("musica/creel-bed.mp3"),
    volumen: z.number().min(0).max(1).default(0.55),
    volumenHablando: z.number().min(0).max(1).default(0.3),
  }).prefault({}),
  marca: z.object({
    titulo: z.string().default("STRANGER THINGS"),
    sub: z.string().default("HAWKINS · HOTEL CREEL"),
    pie: z.string().default("PortAventura NeXT · admira.store"),
  }).prefault({}),
  fps: z.number().int().positive().default(30),
});
export type Personaje = z.infer<typeof PersonajeSchema>;

// Valida los datos y para si aparece una palabra prohibida en pantalla o en voz.
export const validarPersonaje = (datos: unknown): Personaje => {
  const p = PersonajeSchema.parse(datos);
  const visibles = [p.nombre, p.zona, p.linea.text, p.marca.titulo, p.marca.sub, p.marca.pie];
  const malo = visibles.find((t) => PROHIBIDAS.test(t));
  if (malo) throw new Error(`palabra prohibida en pantalla o en voz: «${malo}»`);
  return p;
};

// Plan de escenas en fotogramas: la duración de la línea sale de la voz real.
export const planPersonaje = (p: Personaje) => {
  const seg = (s: number) => Math.round(s * p.fps);
  const intro = seg(2.6), ficha = seg(2.8), linea = Math.round((p.linea.durMs / 1000) * p.fps) + seg(1.6), cierre = seg(2.6);
  return {
    intro, ficha, linea, cierre,
    desde: { intro: 0, ficha: intro, linea: intro + ficha, cierre: intro + ficha + linea },
    total: intro + ficha + linea + cierre,
    poster: intro + Math.round(ficha * 0.7), // fotograma de la ficha para el póster
  };
};
