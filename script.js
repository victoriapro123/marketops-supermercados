var filtro = document.getElementById("filtro");

if (filtro) {
    filtro.addEventListener("change", function () {
        var filas = document.querySelectorAll("#equipos tr");

        filas.forEach(function (fila) {
            var estado = fila.children[2].textContent.trim().toLowerCase();

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
            var reporte = {
                equipo: document.getElementById("equipo").value,
                descripcion: document.getElementById("descripcion").value,
                fecha: document.getElementById("fecha").value
            };

            var reportes = JSON.parse(
                localStorage.getItem("marketops_reportes") || "[]"
            );

            reportes.push(reporte);

            localStorage.setItem(
                "marketops_reportes",
                JSON.stringify(reportes)
            );

            document.getElementById("mensaje").textContent =
                "La falla fue registrada.";

            formulario.reset();
        }
    });
}


var formularioLogin = document.getElementById("formularioLogin");

if (formularioLogin) {
    formularioLogin.addEventListener("submit", function (evento) {
        evento.preventDefault();

        var rol = document.getElementById("rol").value;

        if (rol == "encargado") {
            window.location.href = "encargado.html";
        }

        if (rol == "tecnico") {
            window.location.href = "pages/tecnico.html";
        }

        if (rol == "administrador") {
            window.location.href = "admin.html";
        }
    });
}

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

var historialSucursal = document.getElementById("historialSucursal");

if (historialSucursal) {
    historialSucursal.addEventListener("change", function () {
        var filas = document.querySelectorAll("#incidencias tr");

        filas.forEach(function (fila) {
            var sucursal = fila.children[0].textContent.toLowerCase();

            if (historialSucursal.value == "todas" ||
                historialSucursal.value == sucursal) {
                fila.style.display = "";
            } else {
                fila.style.display = "none";
            }
        });
    });
}

var formularioUsuario = document.getElementById("formularioUsuario");

if (formularioUsuario) {
    formularioUsuario.addEventListener("submit", function (evento) {
        evento.preventDefault();

        var respuesta = confirm("¿Desea guardar este usuario?");

        if (respuesta) {
            document.getElementById("mensaje").textContent =
                "El usuario fue guardado.";

            formularioUsuario.reset();
        }
    });
}

var botonesEditar = document.querySelectorAll(".editar");

botonesEditar.forEach(function (boton) {
    boton.addEventListener("click", function () {
        alert("Se puede editar la cuenta seleccionada.");
    });
});

var tablaHistorial = document.getElementById("reportesGuardados");

if (tablaHistorial) {
    var reportes = JSON.parse(
        localStorage.getItem("marketops_reportes") || "[]"
    );

    reportes.forEach(function (reporte) {
        var fila = tablaHistorial.insertRow(0);

        fila.insertCell(0).textContent = reporte.equipo;
        fila.insertCell(1).textContent = reporte.descripcion;
        fila.insertCell(2).textContent = reporte.fecha;
        fila.insertCell(3).textContent = "Pendiente";
    });
}
