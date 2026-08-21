/* =========================================
   SERVICE WORKER UNIFIN
========================================= */

const CACHE_PREFIX =
  "unifin-pwa-";

const CACHE_VERSION =
  "unifin-pwa-v6-20260820";


const ARCHIVOS_BASE = [

  "./",
  "./index.html",
  "./auditoria.html",
  "./manifest.webmanifest",
  "./logoo.png",
  "./icon-180.png",
  "./icon-192.png",
  "./icon-512.png"

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
                      cache:"reload"
                    }
                  );

                if (respuesta.ok) {

                  await cache.put(
                    ruta,
                    respuesta
                  );

                }

              } catch (error) {

                console.warn(
                  "No se almacenó:",
                  ruta
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
   ACTIVAR ACTUALIZACIÓN
========================================= */

self.addEventListener(
  "message",
  function(evento) {

    if (
      evento.data &&
      evento.data.tipo ===
        "ACTIVAR_ACTUALIZACION"
    ) {

      self.skipWaiting();

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

        const nombres =
          await caches.keys();

        await Promise.all(

          nombres.map(
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
   DOCUMENTOS: PRIMERO INTERNET
========================================= */

async function documentoDesdeInternet(
  solicitud
) {

  const url =
    new URL(
      solicitud.url
    );

  const esFormulario =
    url.pathname.endsWith(
      "/auditoria.html"
    );

  const rutaCanonica =
    esFormulario
      ? "./auditoria.html"
      : "./index.html";

  const cache =
    await caches.open(
      CACHE_VERSION
    );

  try {

    const respuesta =
      await fetch(
        solicitud
      );

    if (respuesta.ok) {

      await cache.put(
        rutaCanonica,
        respuesta.clone()
      );

    }

    return respuesta;

  } catch (error) {

    const guardada =
      await cache.match(
        rutaCanonica
      );

    if (guardada) {
      return guardada;
    }

    return new Response(
      "La aplicación no está disponible sin conexión.",
      {
        status:503,
        headers:{
          "Content-Type":
            "text/plain; charset=UTF-8"
        }
      }
    );

  }

}


/* =========================================
   RECURSOS ESTÁTICOS
========================================= */

async function recursoConCache(
  solicitud
) {

  const cache =
    await caches.open(
      CACHE_VERSION
    );

  const guardada =
    await cache.match(
      solicitud
    );

  const actualizacion =
    fetch(
      solicitud
    )
    .then(
      async function(respuesta) {

        if (
          respuesta.ok ||
          respuesta.type === "opaque"
        ) {

          await cache.put(
            solicitud,
            respuesta.clone()
          );

        }

        return respuesta;

      }
    )
    .catch(function() {

      return null;

    });

  if (guardada) {

    actualizacion.catch(
      function() {}
    );

    return guardada;

  }

  const nueva =
    await actualizacion;

  if (nueva) {
    return nueva;
  }

  return new Response(
    "",
    {
      status:504
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
      Nunca guardar consultas del activo,
      Cloudinary o información de auditorías.
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
          solicitud
        )
      );

    }

  }
);
