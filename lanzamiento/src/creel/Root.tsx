import React from "react";
import { CalculateMetadataFunction, Composition } from "remotion";
import { Personaje, PersonajeSchema, planPersonaje, validarPersonaje } from "./props";
import { PiezaPersonaje } from "./Personaje";

// Datos de muestra para el Studio (Will, con una línea sin voz real): la cadena de verdad usa props/creel/*.json.
const muestra = PersonajeSchema.parse({
  id: 1, nombre: "Will", slug: "will", celda: "D14", zona: "Jardín", chaqueta: "#dc9b38", pelo: "#392617", efecto: "lago",
  linea: { text: "El lago refleja una sombra que no está en el jardín.", fichero: "voz/creel/es/will.mp3", durMs: 2800,
    palabras: "El lago refleja una sombra que no está en el jardín.".split(" ").map((text, i) => ({ text, startMs: i * 280, endMs: i * 280 + 260 })) },
});

const calculateMetadata: CalculateMetadataFunction<Personaje> = ({ props }) => {
  const p = validarPersonaje(props);
  return { durationInFrames: planPersonaje(p).total, fps: p.fps, width: 1920, height: 1080 };
};

export const CreelComposiciones: React.FC = () => (
  <Composition
    id="CreelPersonaje"
    component={PiezaPersonaje}
    schema={PersonajeSchema}
    defaultProps={muestra}
    calculateMetadata={calculateMetadata}
    durationInFrames={1}
    fps={30}
    width={1920}
    height={1080}
  />
);
