# Retrospectiva del Equipo - Sprint Final
**Proyecto:** Sistema de Mesa de Ayuda
**Fecha:** 2026-04-24
**Equipo:** Equipo SA 201114493

---

## ¿Que salió bien? (Keep)

- **Arquitectura de microservicios**: La separacion clara entre user-service, ticket-service y notification-service permitio desarrollo paralelo sin conflictos entre los integrantes del equipo.
- **Docker Compose para desarrollo local**: Levantamos el stack completo (PostgreSQL, RabbitMQ, 3 servicios, frontend) con un solo comando, lo que aceleró enormemente el ciclo de desarrollo y prueba.
- **RabbitMQ para eventos asincrónos**: La decision de usar mensajeria asincrónica para notificaciones fue correcta; desacopló completamente el ticket-service del notification-service y permitio que el primero respondiera sin esperar confirmacion de envio de notificacion.
- **Angular standalone components**: Migrar a la nueva arquitectura standalone de Angular 17 redujo el boilerplate y simplificó el lazy loading de rutas.
- **Terraform para infraestructura**: Documentar la infraestructura como código garantizó entornos reproducibles y eliminó el problema de "funciona en mi maquina".
- **Health checks en todos los servicios**: Los endpoints `/health` facilitaron la depuracion en K3s y la configuracion de readiness probes.

---

## ¿Que se puede mejorar? (Improve)

- **Cobertura de tests**: No alcanzamos a escribir pruebas unitarias ni de integración para los servicios Node.js. En futuros sprints debemos incluir tiempo de testing en la estimacion de tareas.
- **Secretos hardcodeados en development**: Aunque usamos Kubernetes Secrets para K3s, en desarrollo local los valores sensibles quedaron en variables de entorno sin gestión formal (ej. Vault o AWS Secrets Manager).
- **Tiempo de build del frontend**: El build de Angular con multi-stage Docker demora ~4 minutos, lo que ralentiza el pipeline. Explorar la caché de capas de Docker o compilacion incremental para reducirlo.
- **Documentacion de API**: No generamos documentacion Swagger/OpenAPI para los endpoints REST. Agregar `swagger-ui-express` a los servicios en el próximo sprint.
- **Alertas en Grafana**: Los dashboards quedaron configurados pero no definimos reglas de alerta (alertas de CPU > 80%, memoria > 70%). Esto es trabajo pendiente.

---

## ¿Que debemos dejar de hacer? (Stop)

- **Commits directos a main**: Varios cambios urgentes se pusieron directamente en la rama principal saltandose el proceso de Pull Request. Esto generó conflictos y rompió el pipeline en dos ocasiones.
- **No leer los logs de RabbitMQ durante pruebas**: Asumimos que los mensajes se estaban enviando sin verificar la cola. Perdimos 2 horas depurando un error de conexión que estaba claramente en los logs de management.
- **Ignorar los resource limits en K3s**: Deployamos sin definir límites de CPU/memoria y el nodo se saturó durante las pruebas de carga. Siempre definir requests/limits desde el inicio.

---

## Plan de acción para el próximo sprint

| Accion | Responsable | Fecha limite |
|--------|------------|-------------|
| Agregar tests unitarios (Jest) a user-service y ticket-service | Equipo | 2026-05-08 |
| Configurar alertas en Grafana | Equipo | 2026-05-01 |
| Documentar API con Swagger | Equipo | 2026-05-05 |
| Implementar política de ramas (branch protection en main) | Equipo | 2026-04-27 |

---

## Métricas del sprint

- **Tareas planificadas:** 24
- **Tareas completadas:** 21 (87.5%)
- **Bugs encontrados:** 7
- **Bugs resueltos:** 7 (100%)
- **Velocidad del equipo:** 42 story points
