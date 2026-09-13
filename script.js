var filtro = document.getElementById("filtro");

if (filtro) {
    filtro.addEventListener("change", function () {
        var filas = document.querySelectorAll("#equipos tr");

        filas.forEach(function (fila) {
            var estado = fila.children[2].textContent.toLowerCase();

            if (filtro.value == "todos" || filtro.value == estado) {
                fila.style.display = "";
            } else {
                fila.style.display = "none";
            }
        });
    });
}

var formulario = document.getElementById("formularioFalla");

if (formulario) {
    formulario.addEventListener("submit", function (evento) {
        evento.preventDefault();

        var respuesta = confirm("¿Desea enviar este reporte?");

        if (respuesta) {
            document.getElementById("mensaje").textContent =
                "La falla fue registrada.";

            formulario.reset();
        }
    });
}
