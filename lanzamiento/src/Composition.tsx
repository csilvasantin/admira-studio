import React, { useMemo } from "react";
import { AbsoluteFill, Audio, CalculateMetadataFunction, Composition, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { LanzamientoContext, planificar, useLanzamiento } from "./guion";
import { Lanzamiento, LanzamientoSchema, validarLanzamiento } from "./props";
import { Subtitulo } from "./piezas";
import { Anuncio, Cierre, Curvas, Listo, Pantallas, Prompt, Stock, Titulo, Tutorial } from "./escenas";
import datosV2 from "../props/un-prompt-una-tienda.json";

const COMPONENTES: Record<string, React.FC> = {
  titulo: Titulo,
  prompt: Prompt,
  stock: Stock,
  pantallas: Pantallas,
  curvas: Curvas,
  anuncio: Anuncio,
  listo: Listo,
  tutorial: Tutorial,
  cierre: Cierre,
};

// Música de la casa en bucle: más baja cuando hay voz, y se apaga al final.
const Musica: React.FC = () => {
  const l = useLanzamiento();
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const { escenas } = useMemo(() => planificar(l), [l]);
  const hablando = escenas.some((e) => e.voz && frame >= e.desde && frame < e.desde + e.frames - 0.5 * fps);
  const base = hablando ? l.musica.volumenHablando : l.musica.volumen;
  const envolvente = interpolate(
    frame,
    [0, 1.5 * fps, durationInFrames - 1.5 * fps, durationInFrames],
    [0, base, base, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  return <Audio src={staticFile(l.musica.fichero)} loop volume={envolvente} />;
};

const Escenas: React.FC = () => {
  const l = useLanzamiento();
  const { escenas } = useMemo(() => planificar(l), [l]);
  return (
    <>
      {escenas.map((e) => {
        const C = COMPONENTES[e.id];
        return (
          <Sequence key={e.id} name={e.id} from={e.desde} durationInFrames={e.frames}>
            <C />
            {e.voz ? <Subtitulo id={e.voz} /> : null}
          </Sequence>
        );
      })}
    </>
  );
};

// La composición recibe los datos validados y los reparte por contexto.
export const Lanzamiento_: React.FC<Lanzamiento> = (props) => {
  const l = useMemo(() => validarLanzamiento(props), [props]);
  return (
    <LanzamientoContext.Provider value={l}>
      <AbsoluteFill style={{ background: "#02080d" }}>
        <Musica />
        <Escenas />
      </AbsoluteFill>
    </LanzamientoContext.Provider>
  );
};

// Duración y tamaño salen de los datos: la voz real manda.
const calculateMetadata: CalculateMetadataFunction<Lanzamiento> = ({ props }) => {
  const l = validarLanzamiento(props);
  const { total } = planificar(l);
  return { durationInFrames: total, fps: l.fps, width: l.ancho, height: l.alto };
};

// Vertical (9:16): misma plantilla y mismos datos; solo cambia el lienzo y las escenas se recolocan.
const calculateMetadataVertical: CalculateMetadataFunction<Lanzamiento> = ({ props }) => {
  const l = validarLanzamiento(props);
  const { total } = planificar(l);
  return { durationInFrames: total, fps: l.fps, width: 1080, height: 1920 };
};

export const MyComposition = () => {
  return (
    <>
      <Composition
        id="UnPromptUnaTienda"
        component={Lanzamiento_}
        schema={LanzamientoSchema}
        defaultProps={LanzamientoSchema.parse(datosV2)}
        calculateMetadata={calculateMetadata}
        durationInFrames={1}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="UnPromptUnaTiendaVertical"
        component={Lanzamiento_}
        schema={LanzamientoSchema}
        defaultProps={LanzamientoSchema.parse(datosV2)}
        calculateMetadata={calculateMetadataVertical}
        durationInFrames={1}
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
};
