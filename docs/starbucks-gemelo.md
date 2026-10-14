# Starbucks · gemelo basado en fotografía / photo based twin

Creador y Adaptador seleccionan automáticamente la escena Starbucks para los formatos del cliente. La referencia visual es la foto aportada de Paseo de Gracia 103: pared taupe, techo con focos, franja LED cálida, barra, cafetera, vasos, pastelería y terminal de caja. Es un modelo 3D que permite girar, acercar, ver de frente o desde un observador; no es una imagen plana del local.

- `starbucks-pg103`: seis verticales **2V–1V–3V**, con separación visual de los tres grupos basada en la fotografía.
- `starbucks-gdg51`: **H–V–H–H–V–H**, 9840×1920 px.
- `starbucks-gdg51-vhvvhv`: **V–H–V–V–H–V**, 8160×1920 px; opción adicional, sin sustituir el montaje anterior.

Los tres montajes aparecen en **Formatos de cliente → Starbucks**. En una campaña existente pulsa **Añadir formatos a esta campaña**: añade los destinos nuevos y conserva las imágenes, textos, mapas editados y exclusiones. Horizontal, vertical y los tres montajes suman cinco destinos y 20 archivos nativos si se incluyen todos. Cada montaje tiene su propio programa; son alternativas que se seleccionan antes de entregar.

Cada tarjeta muestra la adaptación y el modelo a los 2 s. Pulsar el previo abre el gemelo animado con el mismo reloj de campaña; pausa, reinicio y búsqueda conservan los pasos de 1/25 s. **Foto de referencia** permite comparar con la imagen original. El modelo usa acabados y proporciones visuales aproximados: no hay levantamiento medido. Los dos esquemas de Gran de Gracia usan la ambientación de PG103, porque no se ha aportado una fotografía de ese local. La geometría nativa de exportación, sus giros y sus recortes permanecen separados de la colocación visual 3D.

**Opciones** abre a la izquierda; **Avanzado**, a la derecha; **Experto**, debajo. Los bordes interiores permiten redimensionar; las flechas siguen el movimiento físico del borde. La corrección conserva el tamaño reducido de los iconos y la atribución en dos líneas.

## English

Creator and Adapter automatically choose a dedicated Starbucks scene for the client's formats. It is based on the supplied PG103 photo: taupe wall, ceiling spotlights, warm LED strip, coffee counter, espresso equipment, cups, pastries and POS. The model supports orbit, zoom, front and observer views.

The catalogue contains PG103 **2V–1V–3V**, GdG51 **H–V–H–H–V–H** (9840×1920), and the additional GdG51 **V–H–V–V–H–V** (8160×1920). Add formats to an existing campaign without resetting its artwork, copy or edited maps. With landscape and portrait, all five destinations produce 20 native files. Each wall has its own programme; choose the required alternatives before delivery.

Thumbnails use the 2 s review frame. Clicking opens the animated twin with pause, restart and native 25 fps seeking. The Reference photo disclosure shows the source. Finishes and visual proportions are approximate, not surveyed. Both GdG51 layouts use the PG103 setting; a separate GdG51 photo has not been supplied. Native export geometry and crops remain unchanged.

Options opens on the **left**, Advanced on the **right**, Expert below. Interior resize handles and arrow keys follow their physical side. Compact icons and the two-line attribution remain in place.

## Resources

- Catalogue: `/adaptaciones/proyectos/pixeria-alsea.json`, schema version 1, catalogue revision 2.
- Photo: `/assets/xpaces/starbucks/pg103-reference.png`.
- Geometry: `adaptaciones/starbucks-twin-core.mjs`; scene: `adaptaciones/starbucks-twin.mjs`.
- Client selection: `adaptaciones/gemelo-factory.mjs`; other clients keep their existing retail scene.
- MCP discovery: `/mcp/adapter-manifest.json` → `digital_twin.clientScenes.starbucks` and `installation_campaign.starbucks_client`.

No hardware emission, Stock publication or anamorphic calibration is performed by opening a preview.
