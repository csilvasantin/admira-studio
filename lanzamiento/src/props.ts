// Esquema de los datos de un lanzamiento (props.json). Todo lo que se ve u oye sale de aquí:
// título, marca, local, prompt, piezas del Stock, líneas de voz con tiempos, música, tutorial y cierre.
import { z } from "zod";

export const PalabraSchema = z.object({
  text: z.string().min(1),
  startMs: z.number().int().nonnegative(),
  endMs: z.number().int().nonnegative(),
});

export const LineaSchema = z.object({
  id: z.string().min(1),
  quien: z.enum(["neo", "off"]), // neo = la máquina (naranja) · off = voz en off (blanco)
  text: z.string().min(1).max(220),
  fichero: z.string().min(1), // ruta dentro de public/
  durMs: z.number().int().positive(),
  palabras: z.array(PalabraSchema).min(1),
});

export const PiezaSchema = z.object({
  id: z.string().min(1), // id del Stock
  fichero: z.string().min(1), // public/stock/<id>.mp4
  poster: z.string().min(1), // public/stock/<id>.poster.jpg
  titulo: z.string().default(""),
  orientacion: z.enum(["horizontal", "vertical", "panoramica"]),
});

export const EscenaSchema = z.object({
  id: z.enum(["titulo", "prompt", "stock", "pantallas", "curvas", "anuncio", "listo", "tutorial", "cierre"]),
  voz: z.string().optional(), // id de línea; sin voz, la escena dura `segundos`
  segundos: z.number().positive().optional(),
  respiro: z.number().nonnegative().default(0.6),
});

export const LanzamientoSchema = z.object({
  nombre: z.string().min(1).max(120),
  marca: z.object({
    crea: z.string().default("admira.studio"),
    emite: z.string().default("admira.store"),
    fecha: z.string().default(""),
    voz: z.string().default("Admirito"),
  }),
  local: z.object({
    cliente: z.string().min(1),
    nombre: z.string().min(1),
    pantallas: z.string().default(""),
  }),
  titulo: z.object({ linea1: z.string().min(1), linea2: z.string().min(1) }),
  prompt: z.object({
    cabecera: z.string(),
    texto: z.string().min(1).max(200),
    pie: z.string(),
  }),
  piezas: z.object({
    horizontal: PiezaSchema,
    vertical: PiezaSchema,
    conjunto: PiezaSchema,
    posters: z.array(z.string().min(1)).min(1).max(8),
  }),
  rotulos: z.object({
    stock: z.string(),
    pantallas: z.string(),
    pantallaHorizontal: z.string().default(""),
    pantallaVertical: z.string().default(""),
    curvas: z.string(),
    anuncio: z.string(),
    listo: z.string(),
    tutorial: z.string(),
    cierre: z.string(),
  }),
  tutorial: z.array(z.string().min(1)).min(2).max(6),
  cierre: z.object({ linea1: z.string().min(1), linea2: z.string().min(1) }),
  musica: z.object({
    fichero: z.string().min(1),
    volumen: z.number().min(0).max(1).default(0.34),
    volumenHablando: z.number().min(0).max(1).default(0.16),
  }),
  voz: z.object({ volumen: z.number().min(0).max(3).default(1.3) }),
  lineas: z.array(LineaSchema).min(1),
  escenas: z.array(EscenaSchema).min(1),
  fps: z.number().int().positive().default(30),
  ancho: z.number().int().positive().default(1920),
  alto: z.number().int().positive().default(1080),
});

// Guion: lo mismo sin tiempos de voz (los pone `voz`). `fichero` queda previsto.
export const LineaGuionSchema = LineaSchema.omit({ durMs: true, palabras: true });
export const GuionSchema = LanzamientoSchema.extend({
  idioma: z.enum(["es", "en"]).default("es"),
  lineas: z.array(LineaGuionSchema).min(1),
});
export type Guion = z.infer<typeof GuionSchema>;

export type Lanzamiento = z.infer<typeof LanzamientoSchema>;
export type Linea = z.infer<typeof LineaSchema>;
export type Pieza = z.infer<typeof PiezaSchema>;
export type Escena = z.infer<typeof EscenaSchema>;

export const PROHIBIDAS = /\b(claude|codex|remotion|anthropic|openai|gpt)\b/i;

// Valida el JSON y comprueba las reglas de la casa que el esquema no expresa:
// cada escena con voz apunta a una línea existente, y nada prohibido en pantalla ni en voz.
type Comun = Pick<Lanzamiento, "nombre" | "titulo" | "prompt" | "rotulos" | "tutorial" | "cierre" | "marca" | "escenas"> & { lineas: Array<{ id: string; text: string }> };
const comprobarReglas = (l: Comun) => {
  const ids = new Set(l.lineas.map((x) => x.id));
  for (const e of l.escenas) {
    if (e.voz && !ids.has(e.voz)) throw new Error(`escena ${e.id}: la línea de voz ${e.voz} no existe`);
    if (!e.voz && !e.segundos) throw new Error(`escena ${e.id}: sin voz hace falta "segundos"`);
  }
  const visibles = [
    l.nombre, l.titulo.linea1, l.titulo.linea2, l.prompt.cabecera, l.prompt.texto, l.prompt.pie,
    ...Object.values(l.rotulos), ...l.tutorial, l.cierre.linea1, l.cierre.linea2, l.marca.crea, l.marca.emite,
    ...l.lineas.map((x) => x.text),
  ];
  const malo = visibles.find((t) => PROHIBIDAS.test(t));
  if (malo) throw new Error(`palabra prohibida en pantalla o en voz: «${malo}»`);
};

export const validarLanzamiento = (datos: unknown): Lanzamiento => {
  const l = LanzamientoSchema.parse(datos);
  comprobarReglas(l);
  return l;
};

export const validarGuion = (datos: unknown): Guion => {
  const g = GuionSchema.parse(datos);
  comprobarReglas(g);
  return g;
};
