import React from "react";
import { AbsoluteFill, Audio, Composition, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { ESCENAS, FPS, TOTAL_FRAMES } from "./guion";
import { Subtitulo } from "./piezas";
import { Anuncio, Cierre, Curvas, Listo, Pantallas, Prompt, Stock, Titulo, Tutorial } from "./escenas";

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

// Música de las intros («Tic-tac y campanas», original de la casa, 15 s): en bucle,
// más baja cuando habla Admirito, y se apaga al final.
const Musica: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const hablando = ESCENAS.some((e) => e.voz && frame >= e.desde && frame < e.desde + e.frames - 0.5 * fps);
  const base = hablando ? 0.16 : 0.34;
  const envolvente = interpolate(
    frame,
    [0, 1.5 * fps, durationInFrames - 1.5 * fps, durationInFrames],
    [0, base, base, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  return <Audio src={staticFile("musica/campanas.mp4")} loop volume={envolvente} />;
};

export const UnPromptUnaTienda: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: "#02080d" }}>
      <Musica />
      {ESCENAS.map((e) => {
        const C = COMPONENTES[e.id];
        return (
          <Sequence key={e.id} name={e.id} from={e.desde} durationInFrames={e.frames}>
            <C />
            {e.voz ? <Subtitulo id={e.voz} /> : null}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

export const MyComposition = () => {
  return (
    <Composition
      id="UnPromptUnaTienda"
      component={UnPromptUnaTienda}
      durationInFrames={TOTAL_FRAMES}
      fps={FPS}
      width={1920}
      height={1080}
    />
  );
};
