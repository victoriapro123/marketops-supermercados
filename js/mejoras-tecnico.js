
const tablaSucursales = document.getElementById("sucursales");

if (tablaSucursales) {
    let datosGuardados = null;
    try {
        datosGuardados = JSON.parse(localStorage.getItem("marketops_estados"));
    } catch (error) {
        console.warn("No se pudieron leer los datos guardados");
    }

    const filas = Array.from(tablaSucursales.querySelectorAll("tr"));
    let totalProblemas = 0;
    let sinAlertas = 0;

    filas.forEach(function (fila) {
        const nombre = fila.querySelector(".tech-cell-name").textContent.trim();
        let problemas = Number(fila.cells[1].textContent);

        if (datosGuardados && Array.isArray(datosGuardados[nombre])) {
            problemas = datosGuardados[nombre].filter(function (equipo) {
                return equipo.estado !== "Funcionando";
            }).length;
        }

        fila.cells[1].textContent = problemas;
        const estado = fila.querySelector(".tech-status");

        if (problemas >= 2) {
            estado.textContent = "Atencion requerida";
            estado.className = "tech-status tech-status-danger";
        } else if (problemas === 1) {
            estado.textContent = "Revisar equipos";
            estado.className = "tech-status tech-status-warning";
        } else {
            estado.textContent = "Operativa";
            estado.className = "tech-status tech-status-success";
            sinAlertas++;
        }
        totalProblemas += problemas;
    });

    const indicadores = document.querySelectorAll(".tech-metric strong");
    if (indicadores.length >= 3) {
        indicadores[1].textContent = totalProblemas;
        indicadores[2].textContent = sinAlertas;
    }

    const filtro = document.getElementById("filtroSucursal");
    if (filtro) filtro.dispatchEvent(new Event("change"));

    const botonOrden = document.createElement("button");
    botonOrden.type = "button";
    botonOrden.className = "tech-action-link";
    botonOrden.textContent = "Ordenar: mas fallas primero";
    document.querySelector(".tech-controls").appendChild(botonOrden);

    let mayorPrimero = true;
    botonOrden.addEventListener("click", function () {
        filas.sort(function (a, b) {
            const diferencia = Number(b.cells[1].textContent) - Number(a.cells[1].textContent);
            return mayorPrimero ? diferencia : -diferencia;
        });
        filas.forEach(function (fila) {
            tablaSucursales.appendChild(fila);
        });
        mayorPrimero = !mayorPrimero;
        botonOrden.textContent = mayorPrimero ? "Ordenar: mas fallas primero" : "Ordenar: menos fallas primero";
    });
}

const sucursalHistorial = document.getElementById("historialSucursal");
const fechaHistorial = document.getElementById("fechaHistorial");

if (sucursalHistorial && fechaHistorial) {
    function filtrarHistorial() {
        document.querySelectorAll("#incidencias tr").forEach(function (fila) {
            const sucursal = fila.cells[0].textContent.trim().toLowerCase();
            const fecha = fila.cells[3].textContent.trim().split(" ")[0];
            const partes = fecha.split("/");
            const fechaISO = partes.length === 3 ? partes[2] + "-" + partes[1] + "-" + partes[0] : "";

            const coincideSucursal = sucursalHistorial.value === "todas" || sucursalHistorial.value === sucursal;
            const coincideFecha = !fechaHistorial.value || fechaHistorial.value === fechaISO;
            fila.style.display = coincideSucursal && coincideFecha ? "" : "none";
        });
    }

    sucursalHistorial.addEventListener("change", filtrarHistorial);
    fechaHistorial.addEventListener("change", filtrarHistorial);
}
