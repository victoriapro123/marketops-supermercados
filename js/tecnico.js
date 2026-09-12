"use strict";

// 1. Atrapamos las 3 secciones (las pantallas) que creamos en el HTML
let seccionPanel = document.getElementById("panel");
let seccionSucursales = document.getElementById("sucursales");
let seccionIncidencias = document.getElementById("incidencias");

// 2. Atrapamos los 3 enlaces del menu lateral (los buscamos por su href)
let botonPanel = document.querySelector('a[href="#panel"]');
let botonSucursales = document.querySelector('a[href="#sucursales"]');
let botonIncidencias = document.querySelector('a[href="#incidencias"]');

// 3. Le decimos que hacer al boton "Panel general"
botonPanel.onclick = function(evento) {
    evento.preventDefault(); // Esto evita que la página dé un "salto" hacia arriba
    
    // Mostramos el panel general
    seccionPanel.style.display = "block"; 
    
    // Ocultamos las otras dos
    seccionSucursales.style.display = "none";
    seccionIncidencias.style.display = "none";
};

// 4. Le decimos que hacer al boton "Sucursales"
botonSucursales.onclick = function(evento) {
    evento.preventDefault();
    
    // Mostramos la vista de sucursales
    seccionSucursales.style.display = "block";
    
    // Ocultamos las otras dos
    seccionPanel.style.display = "none";
    seccionIncidencias.style.display = "none";
};

// 5. Le decimos que hacer al boton "Incidencias"
botonIncidencias.onclick = function(evento) {
    evento.preventDefault();
    
    // Mostramos la vista de incidencias
    seccionIncidencias.style.display = "block";
    
    // Ocultamos las otras dos
    seccionPanel.style.display = "none";
    seccionSucursales.style.display = "none";
};