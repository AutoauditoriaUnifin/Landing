/* =========================================
   SERVICE WORKER UNIFIN
========================================= */

const CACHE_PREFIX =
  "unifin-pwa-";

const CACHE_VERSION =
  "unifin-pwa-v7-20260821";


/* =========================================
   ARCHIVOS DISPONIBLES SIN CONEXIÓN
========================================= */

const ARCHIVOS_BASE = [

  "./",
  "./index.html",
  "./auditoria.html",
  "./manifest.webmanifest",
  "./logoo.png",
  "./icon-180.png",
  "./icon-192.png",
  "./icon-512.png",

  "https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js"

];


/* =========================================
   INSTALAR ARCHIVOS PRINCIPALES
========================================= */

self.addEventListener(
  "install",
  function(evento) {

    evento.waitUntil(
      (async function() {

        const cache =
          await caches.open(
            CACHE_VERSION
          );

        await Promise.allSettled(

          ARCHIVOS_BASE.map(
            async function(ruta) {

              try {

                const respuesta =
                  await fetch(
                    ruta,
                    {
                      cache: "reload"
                    }
                  );

                if (
                  respuesta.ok ||
                  respuesta.type === "opaque"
                ) {

                  try {

                    await cache.put(
                      ruta,
                      respuesta.clone()
                    );

                  } catch (errorCache) {

                    console.warn(
                      "No fue posible guardar en caché:",
                      ruta,
                      errorCache
                    );

                  }

                }

              } catch (error) {

                console.warn(
                  "No se pudo descargar:",
                  ruta,
                  error
                );

              }

            }
          )

        );

      })()
    );

  }
);


/* =========================================
   ACTIVAR ACTUALIZACIÓN SOLICITADA
========================================= */

self.addEventListener(
  "message",
  function(evento) {

    if (
      evento.data &&
      evento.data.tipo ===
        "ACTIVAR_ACTUALIZACION"
    ) {

      evento.waitUntil(
        self.skipWaiting()
      );

    }

  }
);


/* =========================================
   LIMPIAR VERSIONES ANTERIORES
========================================= */

self.addEventListener(
  "activate",
  function(evento) {

    evento.waitUntil(
      (async function() {

        const nombresCache =
          await caches.keys();

        await Promise.all(

          nombresCache.map(
            function(nombre) {

              if (
                nombre.startsWith(
                  CACHE_PREFIX
                ) &&
                nombre !==
                  CACHE_VERSION
              ) {

                return caches.delete(
                  nombre
                );

              }

              return Promise.resolve();

            }
          )

        );

        await self.clients.claim();

      })()
    );

  }
);


/* =========================================
   DOCUMENTOS HTML:
   PRIMERO INTERNET Y DESPUÉS CACHÉ
========================================= */

async function documentoDesdeInternet(
  solicitud
) {

  const url =
    new URL(
      solicitud.url
    );

  /*
    Solo manejar documentos de GitHub Pages.
    No guardar páginas externas.
  */

  if (
    url.origin !==
    self.location.origin
  ) {

    return fetch(
      solicitud
    );

  }

  const esFormulario =
    url.pathname.endsWith(
      "/auditoria.html"
    );

  /*
    Se guarda una sola copia del formulario,
    sin AuditID ni Token en el nombre del caché.
  */

  const rutaCanonica =
    esFormulario
      ? "./auditoria.html"
      : "./index.html";

  const cache =
    await caches.open(
      CACHE_VERSION
    );

  const controlador =
    new AbortController();

  /*
    Evita que la pantalla se quede cargando
    indefinidamente cuando Internet falla.
  */

  const limiteTiempo =
    setTimeout(
      function() {

        controlador.abort();

      },
      8000
    );

  try {

    const respuesta =
      await fetch(
        solicitud,
        {
          signal:
            controlador.signal
        }
      );

    if (!respuesta.ok) {

      throw new Error(
        "RESPUESTA_NO_DISPONIBLE"
      );

    }

    try {

      await cache.put(
        rutaCanonica,
        respuesta.clone()
      );

    } catch (errorCache) {

      console.warn(
        "No fue posible actualizar el documento en caché:",
        rutaCanonica,
        errorCache
      );

    }

    return respuesta;

  } catch (error) {

    /*
      Si Internet falla, abrir la copia
      instalada en el teléfono.
    */

    const documentoGuardado =
      await cache.match(
        rutaCanonica
      );

    if (documentoGuardado) {

      return documentoGuardado;

    }

    return new Response(
      "La aplicación no está disponible sin conexión.",
      {
        status: 503,

        headers: {
          "Content-Type":
            "text/plain; charset=UTF-8"
        }
      }
    );

  } finally {

    clearTimeout(
      limiteTiempo
    );

  }

}


/* =========================================
   RECURSOS ESTÁTICOS:
   CACHÉ Y ACTUALIZACIÓN EN SEGUNDO PLANO
========================================= */

async function recursoConCache(
  solicitud,
  evento
) {

  const cache =
    await caches.open(
      CACHE_VERSION
    );

  const recursoGuardado =
    await cache.match(
      solicitud
    );

  const actualizarRecurso =
    (async function() {

      try {

        const respuesta =
          await fetch(
            solicitud
          );

        if (
          respuesta.ok ||
          respuesta.type === "opaque"
        ) {

          try {

            await cache.put(
              solicitud,
              respuesta.clone()
            );

          } catch (errorCache) {

            console.warn(
              "No fue posible actualizar el recurso:",
              solicitud.url,
              errorCache
            );

          }

        }

        return respuesta;

      } catch (error) {

        return null;

      }

    })();

  /*
    Si ya existe una copia, mostrarla
    inmediatamente y actualizarla después.
  */

  if (recursoGuardado) {

    evento.waitUntil(
      actualizarRecurso.then(
        function() {}
      )
    );

    return recursoGuardado;

  }

  const recursoNuevo =
    await actualizarRecurso;

  if (recursoNuevo) {

    return recursoNuevo;

  }

  return new Response(
    "",
    {
      status: 504,
      statusText:
        "Recurso no disponible"
    }
  );

}


/* =========================================
   CONTROL DE PETICIONES
========================================= */

self.addEventListener(
  "fetch",
  function(evento) {

    const solicitud =
      evento.request;

    /*
      El Service Worker no debe intervenir
      en envíos POST.
  */

  if (
    solicitud.method !== "GET"
  ) {

    return;

  }

  const url =
    new URL(
      solicitud.url
    );

  /*
    Nunca guardar en caché:

    - Consultas de Apps Script
    - Respuestas privadas de auditorías
    - Fotografías de Cloudinary
    - Videos de Cloudinary
  */

  if (
    url.hostname.includes(
      "script.google.com"
    ) ||
    url.hostname.includes(
      "script.googleusercontent.com"
    ) ||
    url.hostname.includes(
      "cloudinary.com"
    )
  ) {

    return;

  }

  /*
    Navegaciones de index.html y
    auditoria.html.
  */

  if (
    solicitud.mode === "navigate"
  ) {

    evento.respondWith(
      documentoDesdeInternet(
        solicitud
      )
    );

    return;

  }

  const recursoLocal =
    url.origin ===
    self.location.origin;

  const recursoExternoPermitido = [

    "unpkg.com",
    "fonts.googleapis.com",
    "fonts.gstatic.com"

  ].includes(
    url.hostname
  );

  const tipoPermitido = [

    "style",
    "script",
    "font",
    "image"

  ].includes(
    solicitud.destination
  );

  if (
    tipoPermitido &&
    (
      recursoLocal ||
      recursoExternoPermitido
    )
  ) {

    evento.respondWith(
      recursoConCache(
        solicitud,
        evento
      )
    );

  }

});
