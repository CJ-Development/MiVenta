# apps/notifications

> **Estado:** Placeholder / módulo pendiente de implementación.

Esta aplicación está registrada en `INSTALLED_APPS` pero no contiene
modelos, vistas, serializers ni URLs definidos.

## TODO

- Definir el modelo de notificación (ej. `Notificacion` con FK a Usuario,
  tipo, mensaje, leída/no leída, fecha).
- Crear serializers y vistas para listar y marcar notificaciones como leídas.
- Definir URLs y conectarlas en `confiig/urls.py`.
- Decidir el canal de envío (in-app, email, push) según los eventos del
  sistema (compra creada, pago confirmado, envío despachado, reseña, etc.).
