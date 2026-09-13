"use strict";

let seccionPanel = document.getElementById("panel");
let seccionSucursales = document.getElementById("sucursales");
let seccionIncidencias = document.getElementById("incidencias");

let botonPanel = document.querySelector('a[href="#panel"]');
let botonSucursales = document.querySelector('a[href="#sucursales"]');
let botonIncidencias = document.querySelector('a[href="#incidencias"]');

botonPanel.onclick = function(evento) {
    evento.preventDefault(); // Esto evita que la página dé un "salto" hacia arriba
    
    seccionPanel.style.display = "block"; 
    seccionSucursales.style.display = "none";
    seccionIncidencias.style.display = "none";
};

botonSucursales.onclick = function(evento) {
    evento.preventDefault();
    
    seccionSucursales.style.display = "block";
    seccionPanel.style.display = "none";
    seccionIncidencias.style.display = "none";
};

botonIncidencias.onclick = function(evento) {
    evento.preventDefault();
    
    seccionIncidencias.style.display = "block";
    seccionPanel.style.display = "none";
    seccionSucursales.style.display = "none";
};

function confirmarActualizacion() {
    let confirmacion = confirm("¿Estás seguro de que deseas actualizar el estado de este equipo?");
    
    if (confirmacion === true) {
        alert("¡Estado actualizado con éxito! (Simulación)");
    }
}