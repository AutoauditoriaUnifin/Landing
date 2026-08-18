const CACHE_NAME =
  "unifin-pwa-v1";

const ARCHIVOS_APP = [

  "./",
  "./index.html",
  "./auditoria.html",
  "./offline.html",
  "./manifest.webmanifest",
  "./logoo.png",
  "./icon-180.png",
  "./icon-192.png",
  "./icon-512.png"

];


/* =========================================
   INSTALAR APLICACIÓN
========================================= */

self.addEventListener(
  "install",
  function(event) {

    event.waitUntil(

      caches
        .open(CACHE_NAME)
        .then(function(cache) {

          return Promise.all(

            ARCHIVOS_APP.map(
              function(archivo) {

                return cache
                  .add(archivo)
                  .catch(function(error) {

                    console.warn(
                      "No se pudo guardar:",
                      archivo,
                      error
                    );

                  });

              }
            )

          );

        })
        .then(function() {

          return self.skipWaiting();

        })

    );

  }
);


/* =========================================
   ELIMINAR VERSIONES ANTERIORES
========================================= */

self.addEventListener(
  "activate",
  function(event) {

    event.waitUntil(

      caches
        .keys()
        .then(function(nombres) {

          return Promise.all(

            nombres.map(
              function(nombre) {

                if (
                  nombre !==
                  CACHE_NAME
                ) {

                  return caches.delete(
                    nombre
                  );

                }

              }
            )

          );

        })
        .then(function() {

          return self.clients.claim();

        })

    );

  }
);


/* =========================================
   CONTROLAR SOLICITUDES
========================================= */

self.addEventListener(
  "fetch",
  function(event) {

    const solicitud =
      event.request;

    if (
      solicitud.method !==
      "GET"
    ) {
      return;
    }

    const url =
      new URL(
        solicitud.url
      );

    /*
      No interceptar Apps Script,
      Cloudinary ni servicios externos.
    */

    if (
      url.origin !==
      self.location.origin
    ) {
      return;
    }

    /*
      Para páginas HTML:
      intentar primero Internet.
    */

    if (
      solicitud.mode ===
      "navigate"
    ) {

      event.respondWith(

        fetch(solicitud)
          .catch(function() {

            return caches
              .match(
                solicitud,
                {
                  ignoreSearch:
                    true
                }
              )
              .then(function(guardado) {

                if (guardado) {
                  return guardado;
                }

                return caches.match(
                  "./offline.html"
                );

              });

          })

      );

      return;

    }

    /*
      Para iconos y recursos:
      buscar primero en almacenamiento.
    */

    event.respondWith(

      caches
        .match(solicitud)
        .then(function(guardado) {

          if (guardado) {
            return guardado;
          }

          return fetch(solicitud)
            .then(function(respuesta) {

              if (
                !respuesta ||
                respuesta.status !== 200
              ) {
                return respuesta;
              }

              const copia =
                respuesta.clone();

              caches
                .open(CACHE_NAME)
                .then(function(cache) {

                  cache.put(
                    solicitud,
                    copia
                  );

                });

              return respuesta;

            });

        })

    );

  }
);
