// Usuarios de prueba para la entrega 2.
// Los cambios se hacen en la pagina, sin base de datos.
function adminUsuarios() {
    return {
        usuarios: [
            { id: 1, nombre: 'Sebastián Pavez', correo: 'sebastian@marketops.cl', rol: 'Encargado', sucursal: 'La Reina' },
            { id: 2, nombre: 'José Pavez', correo: 'jose@marketops.cl', rol: 'Técnico', sucursal: '' },
            { id: 3, nombre: 'Victoria Rodríguez', correo: 'victoria@marketops.cl', rol: 'Administrador', sucursal: '' },
            { id: 4, nombre: 'Camila Muñoz', correo: 'camila@marketops.cl', rol: 'Encargado', sucursal: 'Centro' },
            { id: 5, nombre: 'Diego Araya', correo: 'diego@marketops.cl', rol: 'Técnico', sucursal: '' },
            { id: 6, nombre: 'Paula Soto', correo: 'paula@marketops.cl', rol: 'Encargado', sucursal: 'La Florida' }
        ],
        siguienteId: 7,
        buscar: '',
        filtroRol: 'todos',
        ordenar: 'nombre-asc',
        editandoId: null,
        form: { nombre: '', correo: '', rol: '', sucursal: '' },
        mensaje: '',
        error: false,

        // Se actualiza la tabla cuando cambian los filtros o los usuarios.
        get usuariosVisibles() {
            let texto = this.buscar.toLowerCase().trim();
            let lista = this.usuarios.filter(usuario => {
                let coincideNombre = usuario.nombre.toLowerCase().includes(texto);
                let coincideCorreo = usuario.correo.toLowerCase().includes(texto);
                let coincideRol = this.filtroRol === 'todos' || usuario.rol === this.filtroRol;
                return (coincideNombre || coincideCorreo) && coincideRol;
            });

            if (this.ordenar === 'nombre-asc') {
                lista.sort((a, b) => a.nombre.localeCompare(b.nombre));
            } else if (this.ordenar === 'nombre-desc') {
                lista.sort((a, b) => b.nombre.localeCompare(a.nombre));
            } else if (this.ordenar === 'rol') {
                lista.sort((a, b) => a.rol.localeCompare(b.rol));
            } else if (this.ordenar === 'sucursal') {
                lista.sort((a, b) => a.sucursal.localeCompare(b.sucursal));
            }
            return lista;
        },

        contarRol(rol) {
            return this.usuarios.filter(usuario => usuario.rol === rol).length;
        },

        guardarUsuario() {
            let nombre = this.form.nombre.trim();
            let correo = this.form.correo.trim().toLowerCase();
            let rol = this.form.rol;
            let sucursal = rol === 'Encargado' ? this.form.sucursal : '';

            // El formulario HTML tambien valida los campos obligatorios y el correo.
            if (nombre.length < 3 || !correo || !rol) {
                this.mensaje = 'Revisa los campos del formulario.';
                this.error = true;
                return;
            }
            if (rol === 'Encargado' && !sucursal) {
                this.mensaje = 'Selecciona una sucursal.';
                this.error = true;
                return;
            }
            let repetido = this.usuarios.some(usuario =>
                usuario.correo.toLowerCase() === correo && usuario.id !== this.editandoId
            );
            if (repetido) {
                this.mensaje = 'Este correo ya está registrado.';
                this.error = true;
                return;
            }

            if (this.editandoId === null) {
                this.usuarios.push({ id: this.siguienteId, nombre: nombre, correo: correo, rol: rol, sucursal: sucursal });
                this.siguienteId++;
                this.limpiarFormulario();
                this.mensaje = 'Usuario agregado.';
            } else {
                let usuario = this.usuarios.find(usuario => usuario.id === this.editandoId);
                if (!usuario) return;
                usuario.nombre = nombre;
                usuario.correo = correo;
                usuario.rol = rol;
                usuario.sucursal = sucursal;
                this.limpiarFormulario();
                this.mensaje = 'Usuario actualizado.';
            }
        },

        editarUsuario(usuario) {
            this.editandoId = usuario.id;
            this.form = {
                nombre: usuario.nombre,
                correo: usuario.correo,
                rol: usuario.rol,
                sucursal: usuario.sucursal
            };
            this.mensaje = '';
            document.getElementById('formularioNuevoUsuario').scrollIntoView();
        },

        eliminarUsuario(id) {
            let usuario = this.usuarios.find(usuario => usuario.id === id);
            if (!usuario) return;
            if (!confirm('¿Eliminar a ' + usuario.nombre + '?')) return;

            this.usuarios = this.usuarios.filter(usuario => usuario.id !== id);
            if (this.editandoId === id) this.limpiarFormulario();
            this.mensaje = 'Usuario eliminado.';
            this.error = false;
        },

        limpiarFormulario() {
            this.editandoId = null;
            this.form = { nombre: '', correo: '', rol: '', sucursal: '' };
            this.mensaje = '';
            this.error = false;
        }
    };
}
