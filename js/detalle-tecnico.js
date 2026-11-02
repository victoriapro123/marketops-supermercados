
document.addEventListener("alpine:init", () => {
    Alpine.data("detalleTecnico", () => ({
        sucursal: "Centro",
        mensaje: "",

        equiposPorSucursal: {
            Centro: [
                { id: 1, nombre: "Caja 1", tipo: "Caja", estado: "Funcionando" },
                { id: 2, nombre: "Balanza 1", tipo: "Balanza", estado: "Con falla" },
                { id: 3, nombre: "Impresora 1", tipo: "Impresora", estado: "Fuera de servicio" }
            ],
            Norte: [
                { id: 4, nombre: "Caja 2", tipo: "Caja", estado: "Con falla" },
                { id: 5, nombre: "Balanza 2", tipo: "Balanza", estado: "Funcionando" },
                { id: 6, nombre: "Impresora 2", tipo: "Impresora", estado: "Funcionando" }
            ],
            Sur: [
                { id: 7, nombre: "Caja 3", tipo: "Caja", estado: "Funcionando" },
                { id: 8, nombre: "Balanza 3", tipo: "Balanza", estado: "Funcionando" },
                { id: 9, nombre: "Impresora 3", tipo: "Impresora", estado: "Funcionando" }
            ]
        },

        init() {
            const datos = localStorage.getItem("marketops_estados");

            if (datos) {
                this.equiposPorSucursal = JSON.parse(datos);
            }
        },

        guardar() {
            if (confirm("¿Desea guardar los cambios?")) {
                localStorage.setItem(
                    "marketops_estados",
                    JSON.stringify(this.equiposPorSucursal)
                );

                this.mensaje = "Los estados fueron actualizados.";
            }
        }
    }));
});
