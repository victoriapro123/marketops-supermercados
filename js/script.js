
var filtroSucursal = document.getElementById("filtroSucursal");

if (filtroSucursal) {
    filtroSucursal.addEventListener("change", function () {
        var filas = document.querySelectorAll("#sucursales tr");

        filas.forEach(function (fila) {
            var cantidad = Number(fila.children[1].textContent);

            if (filtroSucursal.value == "todos") {
                fila.style.display = "";
            } else if (filtroSucursal.value == "grave" && cantidad >= 2) {
                fila.style.display = "";
            } else if (filtroSucursal.value == "leve" && cantidad < 2) {
                fila.style.display = "";
            } else {
                fila.style.display = "none";
            }
        });
    });
}

var botonEstados = document.getElementById("guardarEstados");

if (botonEstados) {
    botonEstados.addEventListener("click", function () {
        var respuesta = confirm("¿Desea guardar los cambios?");

        if (respuesta) {
            document.getElementById("mensaje").textContent =
                "Los estados fueron actualizados.";
        }
    });
}
