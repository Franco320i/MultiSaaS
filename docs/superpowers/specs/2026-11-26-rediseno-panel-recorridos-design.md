# Rediseño 11d: recorridos del panel · diseño corto

Aprobado por el usuario el 2026-11-26 ("con las 4"). Referencia: `docs/design/referencia-myshp.md`, sección 9: para un lugar se usa una página y para una tarea una hoja; Atrás cierra la hoja; después de guardar uno se queda donde estaba, con un aviso breve.

## Por qué

En el panel se hacen tareas cortas y repetidas: cambiar precios, marcar pedidos o imprimir el QR. Hoy cada una saca al usuario de donde estaba. La idea es hacerlas en menos toques y sin perder el lugar en la lista.

## Qué se hace

1. **Editar un producto sin salir de la lista.**
   - Tocar una fila de Productos abre una hoja: sube desde abajo en el celular y aparece centrada en la compu.
   - Campos: Nombre, Precio, Antes, Categoría, "Se ve en tu catálogo" y "Hay stock".
   - **Guardar cambios** guarda solo esos seis campos y cierra la hoja. Se ve el aviso "Se guardó" y la lista mantiene su filtro y su búsqueda.
   - Atrás, Esc o tocar afuera cierra la hoja sin guardar.
   - El link "Fotos, opciones y más" lleva a la pantalla completa, que sigue como hoy.
2. **Pedidos desde la fila.** Los botones "Confirmar pedido" y "Marcar como entregado" ya están en cada fila. Se suma el aviso "Pedido #N confirmado" o "Pedido #N entregado", porque la fila cambia de grupo y puede desorientar. Si falla, se ve el error como hoy.
3. **Mi local como índice.**
   - `/[tenant]/ajustes` muestra "Para completar" (como hoy) y una lista de secciones. Cada sección dice qué tiene y marca "Falta" cuando corresponde.
   - Secciones: Marca, Contacto y entrega, Horarios, Link y QR, y Accesos de la plataforma.
   - Cada sección se abre en `?seccion=marca|contacto|horarios|link|accesos`, con "‹ Mi local" arriba, la cabecera común y su formulario. Guardar deja al usuario en la sección y muestra el aviso, como ya pasa.
   - "Link y QR" muestra el panel de publicación. "Compartir · QR" del Inicio y "Catálogo publicado" de "Para completar" llevan ahí.
   - Una sección desconocida muestra el índice.
4. **Descargar el QR.** Botón "Descargar QR" en el panel de publicación: baja un PNG de 1024 px (`qr-{slug}.png`) para imprimir. Se genera en el servidor.

## Fuera

- No cambian la base, los permisos ni las políticas. Mi local sigue siendo solo del dueño.
- No se agrega "Avisar al cliente": la charla sigue en el WhatsApp que abrió el cliente.
- Fotos y opciones no van en la hoja: necesitan más lugar.
- El asistente `configurar` queda igual.

## Decisiones mías

- **La hoja deja la marca en el historial del navegador, no en la dirección,** igual que la ficha del catálogo (`history.pushState`). Por eso Atrás la cierra sin pedirle nada al servidor. Lo que se pierde es que no se puede compartir un link con la hoja abierta.
- **Mutación propia `updateProductBasics`.** Escribe solo los seis campos y así no borra la descripción, las etiquetas ni las características.
