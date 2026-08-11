/* =========================================
   SERVICE WORKER UNIFIN
========================================= */

const CACHE_UNIFIN =
  "unifin-static-v1";

const ARCHIVOS_UNIFIN = [

  "./",
  "./index.html",
  "./auditoria.html",
  "./logoo.png",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"

];


/* =========================================
   INSTALAR CACHÉ
========================================= */

self.addEventListener(
  "install",
  function(evento) {

    evento.waitUntil(

      caches
        .open(
          CACHE_UNIFIN
        )
        .then(function(cache) {

          return cache.addAll(
            ARCHIVOS_UNIFIN
          );

        })

    );

    self.skipWaiting();

  }
);


/* =========================================
   ELIMINAR CACHÉS ANTERIORES
========================================= */

self.addEventListener(
  "activate",
  function(evento) {

    evento.waitUntil(

      caches
        .keys()
        .then(function(claves) {

          return Promise.all(

            claves
              .filter(function(clave) {

                return (
                  clave !==
                  CACHE_UNIFIN
                );

              })
              .map(function(clave) {

                return caches.delete(
                  clave
                );

              })

          );

        })

    );

    self.clients.claim();

  }
);


/* =========================================
   CONTROLAR SOLICITUDES
========================================= */

self.addEventListener(
  "fetch",
  function(evento) {

    const solicitud =
      evento.request;

    const url =
      new URL(
        solicitud.url
      );

    /*
      No intervenir en solicitudes POST,
      Apps Script, Cloudinary ni servicios
      externos.
    */

    if (
      solicitud.method !== "GET" ||
      url.origin !==
        self.location.origin
    ) {

      return;

    }

    /*
      Las páginas pueden contener AuditID y
      Token. Nunca se guardan sus parámetros
      individuales en caché.
    */

    if (
      solicitud.mode ===
      "navigate"
    ) {

      evento.respondWith(

        fetch(solicitud)
          .catch(function() {

            if (
              url.pathname.endsWith(
                "/auditoria.html"
              )
            ) {

              return caches.match(
                "./auditoria.html"
              );

            }

            return caches.match(
              "./index.html"
            );

          })

      );

      return;

    }

    /*
      No guardar archivos locales que tengan
      parámetros en la dirección.
    */

    if (url.search) {
      return;
    }

    evento.respondWith(

      caches
        .match(solicitud)
        .then(function(enCache) {

          return (
            enCache ||
            fetch(solicitud)
          );

        })

    );

  }
);
