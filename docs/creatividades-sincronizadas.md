# Creatividades multipantalla / Synchronized creatives

Una ficha de Stock reúne una creatividad, sus adaptaciones y sus salidas técnicas. El selector del gemelo permite cambiar de montaje; Play, Pausa y Momento gobiernan el conjunto. «Pantallas y archivos» muestra las resoluciones, idiomas y vídeos nativos y descarga el programa por pantalla.

El manifiesto `admira.sync-creative.v1` declara cliente, revisión y adaptaciones. Cada adaptación define lienzo, duración, fps y una lista de pantallas con recorte, giro, Stock ID, URL e idiomas. El número de pantallas procede del mapa, sin una plantilla fija de seis. Un atlas de previo opcional utiliza un único vídeo; en su ausencia los vídeos nativos comparten reloj, pausas y búsqueda temporal. Una carga fallida conserva los archivos y muestra el error.

La ficha principal es una imagen conjunta en el Stock existente. El registro autenticado `/stock-creatives` enlaza las salidas y aplica permisos positivos por cliente. Los archivos solo se agrupan cuando su ficha principal y los miembros están disponibles para la cuenta. Los registros ajenos conservan sus reglas de agrupación. Los MP4 mantienen sus IDs y URLs públicas. El registro no contiene JSON privados de edición ni asigna dispositivos.

Creador → Publicar MP4 en Stock publica las salidas y, después, una ficha conjunta. No se registra un conjunto incompleto. Si el índice tarda en actualizarse, el registro reintenta; una publicación pendiente puede reanudarse con los archivos ya publicados.

Starbucks «Cada café tiene una historia»: Horizontal, Vertical, PG103 2V–1V–3V, GdG51 H–V–H–H–V–H y GdG51 V–H–V–V–H–V. Las piezas individuales duran 8 s y alternan ES/EN; cada mural dura 24 s y mantiene tres pantallas ES y tres EN. El gemelo usa la ambientación fotográfica de PG103 y medidas nominales. La sincronización de hardware y la calibración anamórfica se verifican en destino.

## English

One Stock card contains a creative, its adaptations and native outputs. Choose the layout in the 3D twin; one Play/Pause/Time transport controls the complete adaptation. Screens and files lists dimensions, languages and native media, and downloads the per-screen programme.

The generic manifest carries an arbitrary screen list, geometry, rotation, Stock IDs and one duration/fps per adaptation. An optional preview atlas uses one decoder; otherwise native videos share the timeline. The authenticated client-scoped registry groups only eligible published members. Existing Stock IDs remain intact. Publishing from Creator registers only complete output sets and allows retrying pending registrations. Device assignment, physical hardware synchronisation and calibrated anamorphic projection remain separate from preview.
