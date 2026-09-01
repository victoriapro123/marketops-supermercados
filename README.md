# MarketOps - Gestión de supermercados

Proyecto grupal para la gestión del soporte técnico de una cadena de supermercados.

## Entrega 1

La primera entrega corresponde a una interfaz web estática construida con HTML, CSS y JavaScript, publicada en una instancia AWS EC2. Los datos utilizados en las vistas son demostrativos y se encuentran en el frontend.

## Vistas consideradas

- Inicio de sesión.
- Encargado: Mi sucursal, Reporte de falla e Historial local.
- Técnico: Panel general, Detalle de sucursal e Historial de incidencias.
- Administrador: Gestión de usuarios.

## Trabajo grupal

- `feature/encargado`: estructura general y vistas del encargado.
- `feature/tecnico`: panel y vistas del técnico.
- `feature/admin-responsive`: administración de usuarios y adaptación móvil.

Los cambios se incorporan a `main` mediante Pull Requests.

## Desarrollo local

```bash
cd marketops
npm install
npm run dev:web
```

## Supuestos de la Entrega 1

- El inicio de sesión es solamente visual.
- Las sucursales, equipos, usuarios e incidencias son datos simulados.
- Los estados se modifican únicamente en la interfaz y no persisten al recargar.
- Los equipos contemplados son cajas, balanzas e impresoras.
