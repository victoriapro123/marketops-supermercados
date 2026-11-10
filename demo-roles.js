// Datos simulados de encargado y técnico para probar la entrega 2.
// Se guardan en el navegador para que las vistas compartan los cambios.
const MarketOpsDemo = {
    clave: 'marketops-demo-e2',
    inicial: {
        equipos: [
            { id: 1, nombre: 'Caja 1', tipo: 'Caja', sucursal: 'Centro', estado: 'Funcionando' },
            { id: 2, nombre: 'Balanza 1', tipo: 'Balanza', sucursal: 'Centro', estado: 'Con falla' },
            { id: 3, nombre: 'Impresora 1', tipo: 'Impresora', sucursal: 'Centro', estado: 'Fuera de servicio' },
            { id: 4, nombre: 'Caja 2', tipo: 'Caja', sucursal: 'Norte', estado: 'Funcionando' },
            { id: 5, nombre: 'Balanza 2', tipo: 'Balanza', sucursal: 'Norte', estado: 'Con falla' },
            { id: 6, nombre: 'Impresora 2', tipo: 'Impresora', sucursal: 'Norte', estado: 'Funcionando' },
            { id: 7, nombre: 'Caja 3', tipo: 'Caja', sucursal: 'Sur', estado: 'Funcionando' },
            { id: 8, nombre: 'Balanza 3', tipo: 'Balanza', sucursal: 'Sur', estado: 'Funcionando' },
            { id: 9, nombre: 'Impresora 3', tipo: 'Impresora', sucursal: 'Sur', estado: 'Funcionando' }
        ],
        incidencias: [
            { id: 1, equipo: 'Balanza 1', sucursal: 'Centro', falla: 'No enciende', fecha: '2026-09-10', resolucion: 'Pendiente' },
            { id: 2, equipo: 'Caja 2', sucursal: 'Norte', falla: 'Error de conexión', fecha: '2026-09-08', resolucion: '2026-09-09' },
            { id: 3, equipo: 'Impresora 3', sucursal: 'Sur', falla: 'No imprime', fecha: '2026-09-07', resolucion: '2026-09-08' }
        ]
    },
    cargar() {
        try {
            let datos = JSON.parse(localStorage.getItem(this.clave));
            if (datos && Array.isArray(datos.equipos) && Array.isArray(datos.incidencias)) return datos;
        } catch (error) { console.log('Usando los datos iniciales'); }
        return JSON.parse(JSON.stringify(this.inicial));
    },
    guardar(datos) { localStorage.setItem(this.clave, JSON.stringify(datos)); },
    reiniciar() { localStorage.removeItem(this.clave); }
};

function demoEncargado() {
    return {
        datos: MarketOpsDemo.cargar(), filtro: 'todos', orden: 'nombre', buscar: '',
        get equiposVisibles() {
            return this.datos.equipos.filter(e => e.sucursal === 'Centro')
                .filter(e => this.filtro === 'todos' || e.estado.toLowerCase() === this.filtro)
                .filter(e => e.nombre.toLowerCase().includes(this.buscar.toLowerCase()))
                .sort((a, b) => this.orden === 'estado' ? a.estado.localeCompare(b.estado) : a.nombre.localeCompare(b.nombre));
        }
    };
}
function demoReporte() {
    return {
        datos: MarketOpsDemo.cargar(), equipo: '', descripcion: '', fecha: new Date().toISOString().slice(0, 10), mensaje: '',
        guardar() {
            if (!this.equipo || this.descripcion.trim().length < 5 || !this.fecha) { this.mensaje = 'Revisa los datos del reporte.'; return; }
            if (!confirm('¿Enviar reporte de falla?')) return;
            this.datos.incidencias.push({ id: Date.now(), equipo: this.equipo, sucursal: 'Centro', falla: this.descripcion.trim(), fecha: this.fecha, resolucion: 'Pendiente' });
            let encontrado = this.datos.equipos.find(e => e.sucursal === 'Centro' && e.nombre === this.equipo);
            if (encontrado) encontrado.estado = 'Con falla';
            MarketOpsDemo.guardar(this.datos);
            this.mensaje = 'La falla fue registrada.';
            this.equipo = ''; this.descripcion = '';
        }
    };
}
function demoHistorial(esLocal) {
    return {
        datos: MarketOpsDemo.cargar(), sucursal: 'todas', fecha: '', buscar: '',
        get visibles() {
            return this.datos.incidencias.filter(i => (!esLocal || i.sucursal === 'Centro') &&
                (this.sucursal === 'todas' || i.sucursal.toLowerCase() === this.sucursal) &&
                (!this.fecha || i.fecha === this.fecha) &&
                (`${i.equipo} ${i.falla}`.toLowerCase().includes(this.buscar.toLowerCase())))
                .sort((a,b) => b.fecha.localeCompare(a.fecha));
        }
    };
}
function demoTecnico() {
    return {
        datos: MarketOpsDemo.cargar(), filtro: 'todas', orden: 'sucursal', buscar: '', sucursal: 'Centro', mensaje: '',
        get sucursales() {
            return ['Centro', 'Norte', 'Sur'].map(nombre => {
                let equipos = this.datos.equipos.filter(e => e.sucursal === nombre);
                return { nombre, problemas: equipos.filter(e => e.estado !== 'Funcionando').length };
            }).filter(s => this.filtro === 'todas' || (this.filtro === 'fallas' && s.problemas > 0));
        },
        get equiposVisibles() {
            return this.datos.equipos.filter(e => e.sucursal === this.sucursal && e.nombre.toLowerCase().includes(this.buscar.toLowerCase()))
                .sort((a, b) => this.orden === 'estado' ? a.estado.localeCompare(b.estado) : a.nombre.localeCompare(b.nombre));
        },
        guardar() { MarketOpsDemo.guardar(this.datos); this.mensaje = 'Cambios guardados en esta demostración.'; },
        cambiar(equipo) { if (confirm('¿Actualizar el estado de ' + equipo.nombre + '?')) this.guardar(); },
        irASucursal(nombre) { this.sucursal = nombre; document.querySelector('a[href="#sucursales"]').click(); }
    };
}
