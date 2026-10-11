# Starbucks · auditoría de preview · encargo #5762 / FLT-101995

OraculoMBP16 · 11 de octubre de 2026. Base congelada `2f42b7f308bf2da3b1bccc71e1c3cb939af56830`. Encargo original #5724 sigue con plazo 12 de octubre, 20:00 Madrid. Esta rama se entrega exclusivamente en preview y PR en borrador.

## Recorrido comprobado

Demo nativa Starbucks de 27 fases (`?ax_demo=studio&lang=es|en`), desde voz hasta música, imagen, vídeo y adaptación, en Chromium headless a **1440×900 y 390×900**, en **ES y EN**, con entrada de agente autorizada. No se generó material nuevo ni se enviaron peticiones a proveedores de generación. Las cinco muestras audiovisuales son material preparado.

En producción, ES terminó todas las fases. EN se detuvo en seis controles, en ambos anchos: 8, 9, 10, 18, 19 y 20. Tras registrar cada error se utilizó Siguiente únicamente para poder auditar el resto del recorrido. Esto no equivale a una demo EN completada sin intervención.

## Fallos y prioridad

| Prioridad | Hallazgo real | Tratamiento |
| --- | --- | --- |
| P0 | EN: `#m-versiones` es un input; el recorrido requiere select y la opción Loop instrumental ~15s. | Corregido: mismo contrato de valores que ES, etiquetas EN. |
| P0 | EN: faltan `#m-style` y `#m-titulo`; fases 9 y 10 se detienen. | Corregido: controles EN y valores compatibles. |
| P0 | EN: faltan `#clip-stock`, `#clip-prompt` y `#clip-one`; fases 18–20 se detienen. | Corregido: formulario de clip desde imagen y manejador real. |
| P1 | La guía EN introduce guion, título/letra musical y prompts en español. | Corregido: valores y narración EN; los valores internos de selects permanecen compatibles. |
| P1 | El motor remoto reconoce hosts de producción pero no el host de preview. | Corregido para la demo nativa: motor Studio servido por esta rama, rutas relativas y origen conservado. |
| P1 | Identidad Studio Matrix verde en lugar de `#FF33CC`; brillo y capas perjudican lectura. | Corregido: tokens Studio magenta y contraste; los tokens de marca blanca tienen prioridad. |
| P1 | Experto minimizado desaparece; la demo y el dock se solapan y aparece otro Experto dentro del iframe. | Corregido: línea minimizada visible, una sola CLI y ajuste según alturas reales. `/ayuda` en ES y `/help` en EN son los alias del motor común. |
| P1 | Fila de proyecto con dos botones recorta contenido a 390px. | Corregido: una columna en móvil. |
| P1 | Clip preparado español se presenta dentro del recorrido EN. | Etiquetado explícitamente como muestra española; pendiente sustituir los cinco assets por muestras EN aprobadas. |
| P1 | Peticiones al catálogo central `/api/clientes` devuelven 401 (cookie de Studio no válida en admiranext.com). | Pendiente: contrato de sesión entre orígenes; no se elude autenticación. |
| P1 | Varias salidas desde EN llevan a páginas ES: Creador, Clear Channel, cartelería, documentación y herramientas auxiliares. | Pendiente: inventario de traducciones y enlaces por idioma. Los destinos responden 200; el defecto es continuidad de idioma. |
| P2 | EN conserva rótulos secundarios españoles, incluidos GIF/caption Música, NUEVO y cadenas de páginas auxiliares. | Pendiente: barrido de textos y alternativas accesibles. |
| P2 | `/demo 1` continúa dependiendo del motor común y su detección del host; la rama corrige la entrada nativa `ax_demo=studio`. | Pendiente: contrato del lanzador común para previews; no se modifica otro repositorio congelado. |
| P2 | `/demo/studio-preview.html` conserva cafetería genérica y castellano fijo. | Pendiente: unificar o retirar esa segunda entrada; no representa la demo nativa auditada. |
| P1 | El login Google común tiene callback fijo de producción; una preview nueva requiere entrada de agente autorizada para la revisión interactiva. | Pendiente: circuito de login humano en preview sin alterar producción. Las capturas y el PR son accesibles por sus enlaces directos. |
| P2 | Quedan colores verdes escritos directamente en componentes antiguos (cabecera, fondos y bordes). | Pendiente: migración de esos componentes a los tokens Studio; el acento principal y la guía ya son magenta. |
| P2 | Pies antiguos y fechas de textos históricos conviven con el sello de release actual. | Pendiente: consolidación editorial y sello. |
| P1 | Subtítulos de marca Starbucks en Creador tienen contraste insuficiente. | Ya existe el PR draft #29, SHA `5387c5fa042773ceb7af108413297817abbf6175`; se conserva separado para revisión conjunta de Jobs/Walt. |

48 destinos internos distintos comprobados con sesión autorizada: todos devolvieron 200. No se detectaron excepciones JavaScript durante los cuatro recorridos originales. Las imágenes pendientes de carga diferida en Adaptador no se contabilizan como enlaces rotos: todavía no tienen `currentSrc`, lo cual no demuestra un 404. Una imagen externa de Wikimedia quedó pendiente de carga en una instantánea; requiere comprobación final de disponibilidad, no se declara rota sin evidencia.

## Tres arreglos de esta entrega

1. Restablecer el contrato de formularios EN para eliminar las seis interrupciones del recorrido.
2. Servir un motor nativo Studio bilingüe en la propia preview, conservando origen, pausa, cambio de idioma y devolución del control. Procede de una instantánea del motor común; una integración definitiva debe resolver la fuente canónica para evitar divergencias del espejo generado.
3. Revisar lectura y composición Walt: acento Studio `#FF33CC`, tokens de marca preservados, fila de proyecto móvil, Experto accesible y separación entre contenido, guía y dock.

Revisión Walt aplicada como jerarquía y legibilidad: acción principal identificable, voz coherente con idioma, menos brillo, controles visibles y contenido sin recortes. No se afirma aprobación personal de Walt. Contrastes calculados sobre fondo Studio: magenta 5,80:1, texto principal 16,21:1 y secundario 8,74:1. La marca Starbucks conserva sus colores; #29 atiende sus subtítulos.

## Validación y límites

La prueba del recorrido exige cuatro ejecuciones completas, 27 fases, cinco rutas nativas por ejecución, sin saltos y sin excepciones JS. La prueba adicional abre/cierra Experto, cambia idioma manteniendo fase y pausa, devuelve control y valida un formulario vacío EN sin llamadas de generación.

19 pruebas de autenticación/cápsula pasan. La prueba existente de posters de Stock falla también en la base congelada (regex de texto antiguo), y se registra como fallo previo. Comprobación sintáctica JavaScript y `git diff --check` acompañan la entrega.

No se modifica el clon principal ni Pixeria ni el motor compartido de AdmiraNeXT. No se mergea ni se despliega producción. Para permitir pruebas reales se añaden únicamente las dos claves de autenticación que faltaban en el entorno **preview** de Cloudflare Pages; configuración y deployment de producción se comparan sin cambios. El rollback de esas nuevas claves consiste en eliminarlas del entorno preview. La URL de preview se ha probado con entrada de agente autorizada. El login Google mantiene un callback fijo de producción; no se afirma acceso humano a esa preview mediante Google. Las capturas se sirven por enlaces directos.

## Preparación para mañana · #5724

Primero resolver catálogo central y continuidad EN; después preparar muestras EN, unificar entradas de demo, limpiar rótulos/pies y revisar #29 con el diseño Starbucks. Mantener clones congelados y llevar el parte de avances a admira.live/diario y Yokup. El cierre de #5762 cubre la entrega de hoy; no cierra #5724 ni acredita como ejecutadas estas tareas de mañana.

## Paso 2 · #5767 / FLT-102000 · revisión del 11 de octubre

La continuación conserva la rama `oraculo/5762-starbucks-preview` y el PR draft #30. Base de comparación: `41bfa42` y su preview `07b5fa25.admira-studio.pages.dev`.

- Se localizan únicamente los ejemplos de texto reconocidos de Audio, Música, Imágenes, Vídeo y Publicidad. Al volver entre ES y EN, `C menor`/`C minor` y el uso de experiencia siguen el idioma; el texto personalizado permanece intacto. Los valores internos de selects y chips conservan el contrato de proveedores. Las muestras audiovisuales y los títulos originales de Stock se conservan.
- Música: al menos 14 px entre campos consecutivos; etiqueta Letra/Lyrics y Generar con Gemini/Generate with Gemini son hermanos en una fila con 12 px entre ellos. Una portada aún no generada permanece oculta, sin reservar una columna vacía.
- Guía: título y estado comparten fila, descripción limitada a dos líneas, controles en una sola fila. En móvil quedan Pausar/Reanudar, Siguiente y «…»; este último contiene sonido, voz y devolver control. Experto minimizado sigue mostrando la orden en una barra de 48 px. El conjunto ocupa 138,64 px a 1440×900 (15,4 %) y 129,88 px a 390×900 (14,4 %), frente a 231,19 y 236,95 px de la base. El iframe reserva su altura real más 8 px; el pie puede subir por encima del conjunto incluso con Experto abierto.
- Menú móvil: degradado y flecha «Más secciones/More sections», con ocultación al llegar al final y soporte de scroll táctil. Se aplica tanto a la home anfitriona como a los formularios.
- Unificados en `#FF33CC` los chips seleccionados, ☰, iconos y estados de navegación. Los tokens de marca blanca siguen teniendo prioridad; el verde de la lluvia de fondo se conserva.
- Inventario avanzado: enlaces a versiones EN existentes de Signage, Avatar, Plataforma, Concepto, Radar, Campañas, Director, Admira XP, Xtore y Privacy. Localizador compartido cargado en auxiliares EN sin duplicarlo. El catálogo secundario de demos ofrece enlaces explícitos a la guía nativa Starbucks ES/EN y aclara que sus muestras originales son españolas.

Validación reproducible de DOM: `scripts/test-starbucks-preview.cjs`, con Playwright y `AUDIT_BASE`. Comprueba valores, cambio de idioma, conservación de texto editado, gaps y alineación, colores computados, altura conjunta, padding, Experto abierto/cerrado, scroll del pie, menú móvil, fase/pausa y ausencia de solicitudes a proveedores. Las pruebas existentes de locale conservan valores internos y contenido de usuarios.

Siguen pendientes del inventario original el catálogo central con 401, el login Google de preview con callback fijo de producción, las cinco muestras EN aprobadas, las traducciones que no existen en Clear Channel/Documentación, la integración del lanzador compartido `/demo 1` y la limpieza general de pies históricos. Este paso no modifica esos servicios ni declara cerrados esos asuntos. Las capturas antes/después, SHA y URL de preview se entregan en el encargo #5767, su informe Yokup y el PR #30; #5724 sigue abierto con su plazo original.
