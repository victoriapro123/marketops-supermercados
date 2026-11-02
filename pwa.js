// Registro PWA; requiere localhost o HTTPS.
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
        navigator.serviceWorker.register('./sw.js').catch(function (error) {
            console.warn('Service worker no disponible:', error);
        });
    });
}
