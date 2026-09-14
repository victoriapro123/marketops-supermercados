const botonesEliminar = document.querySelectorAll(".eliminar");

botonesEliminar.forEach(function(boton) {

    boton.addEventListener("click", function() {

        const fila = this.parentElement.parentElement;
        const nombre = fila.children[0].textContent;

        const respuesta = confirm("¿Seguro que quieres eliminar a " + nombre + "?");

        if (respuesta) {
            fila.remove();
        }

    });

});