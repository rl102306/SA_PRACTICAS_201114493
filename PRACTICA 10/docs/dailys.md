# Minutas de Daily Stand-up
**Proyecto:** Sistema de Mesa de Ayuda (Practicas 9 y 10)
**Equipo:** SA 201114493

---

## Daily #1 - 2026-04-10 | 09:00 AM

**Duración:** 15 minutos
**Facilitador:** Carlos M.
**Presentes:** Carlos M., Ana R., Luis P.

### ¿Que hice ayer?
- **Carlos M.:** Configure el entorno base: docker-compose.yml con PostgreSQL y RabbitMQ levantando correctamente. Verifiqué que los healthchecks funcionan antes de que arranquen los servicios.
- **Ana R.:** Diseñé el esquema de base de datos con las tablas `users` y `tickets`, definí las restricciones CHECK para los enums de rol, estado y prioridad. Cree el initDB en el config de database.js.
- **Luis P.:** Investigue la arquitectura standalone de Angular 17, monté el proyecto base con `ng new`, configuré `app.config.ts` con `provideRouter` y `provideHttpClient`.

### ¿Que voy a hacer hoy?
- **Carlos M.:** Implementar user-service completo: CRUD de usuarios, hash de passwords con bcrypt, generacion y verificacion de JWT.
- **Ana R.:** Implementar ticket-service: CRUD de tickets con validaciones de acceso por rol (cliente solo ve sus tickets), y la conexion a RabbitMQ para publicar eventos.
- **Luis P.:** Construir el AuthService en Angular, el interceptor HTTP para adjuntar el JWT a cada request, y el authGuard para proteger rutas.

### Impedimentos
- **Ana R.:** No estoy segura de como manejar la reconexion automatica a RabbitMQ cuando el broker cae temporalmente. Carlos propuso implementar un retry con setTimeout que se llame recursivamente en el evento `close` de la conexion.
- **Resolucion:** Se implementara el patron de reconexion en el modulo `rabbitmq.js` del ticket-service con delay de 5 segundos.

---

## Daily #2 - 2026-04-15 | 09:00 AM

**Duración:** 20 minutos
**Facilitador:** Ana R.
**Presentes:** Carlos M., Ana R., Luis P.

### ¿Que hice ayer?
- **Carlos M.:** Completé user-service con todos los endpoints: POST /register, POST /login, GET /profile, GET /, GET /:id, PUT /:id, DELETE /:id. Teste con Postman y funciona correctamente. También escribí el Dockerfile optimizado con `npm ci --only=production` y usuario node no-root.
- **Ana R.:** ticket-service funcionando con CRUD completo. Los eventos se publican a RabbitMQ con `sendToQueue` y el notification-service los consume. Probé los tres eventos: TICKET_CREATED, TICKET_UPDATED, TICKET_DELETED.
- **Luis P.:** Login y registro en Angular funcionando. El interceptor adjunta el Bearer token. El authGuard redirige a /login si no hay token. Falta conectar los componentes de tickets.

### ¿Que voy a hacer hoy?
- **Carlos M.:** Escribir los manifiestos de Kubernetes para todos los Deployments y Services. Configurar los Secrets de K8s para no hardcodear credenciales. Probar deploy en K3s local.
- **Ana R.:** Terminar el notification-service con manejo de cada tipo de evento. Verificar que la reconexion automatica a RabbitMQ funciona simulando una caida del broker. Escribir el Terraform para la VM GCP.
- **Luis P.:** Construir los componentes: ticket-list con filtros, ticket-create con formulario, ticket-detail con edicion inline. Configurar nginx.conf con proxy inverso a los microservicios.

### Impedimentos
- **Carlos M.:** Al deployar en K3s, el ticket-service no puede conectarse a RabbitMQ porque el pod inicia antes de que RabbitMQ este listo. El readinessProbe no es suficiente porque el init del pod no espera.
- **Resolucion:** La logica de reconexion automatica en `rabbitmq.js` (retry cada 5s) resuelve el problema; el servicio arranca aunque RabbitMQ no este disponible y eventualmente se conecta. Se agrego `initialDelaySeconds: 15` al readinessProbe del ticket-service.

---

## Daily #3 - 2026-04-22 | 09:00 AM

**Duración:** 25 minutos
**Facilitador:** Luis P.
**Presentes:** Carlos M., Ana R., Luis P.

### ¿Que hice ayer?
- **Carlos M.:** Pipeline de GitHub Actions completo con los 4 jobs: lint → build → push → deploy. Configuré los secrets en el repo (DOCKER_USERNAME, DOCKER_PASSWORD, K3S_HOST, K3S_TOKEN). El pipeline tarda ~12 minutos en total. Tambien configure el matrix strategy para buildear las 4 imagenes en paralelo.
- **Ana R.:** Stack de monitoreo funcionando en K3s: Prometheus scrapeando los 3 microservicios, Grafana con dashboard provisionado automaticamente via ConfigMap. El dashboard muestra CPU, RAM y trafico HTTP. Elasticsearch y Kibana levantados en namespace `logging`.
- **Luis P.:** Frontend Angular completamente funcional: login/register, lista de tickets con filtros por estado y prioridad, creacion de ticket, detalle con edicion inline. nginx.conf con proxy a user-service:3001 y ticket-service:3002. Probé el flujo completo end-to-end.

### ¿Que voy a hacer hoy?
- **Carlos M.:** Revisar y documentar como obtener el kubeconfig desde la VM GCP con `gcloud compute scp`. Verificar que el Terraform crea la VM correctamente con el startup script de K3s. Crear el tag `v1.0.0`.
- **Ana R.:** Documentar la retrospectiva del sprint y escribir las minutas. Verificar que Kibana puede ver los indices de logs de los pods.
- **Luis P.:** Terminar el Kanban final con el estado de todas las tareas. Hacer revision final del pipeline de CI/CD probando un push a main.

### Impedimentos
- **Ana R.:** Kibana tarda ~3 minutos en iniciar y el readinessProbe falla antes de eso, causando que el pod reinicie varias veces antes de estabilizarse.
- **Resolucion:** Se aumentó `initialDelaySeconds` a 60 segundos en el readinessProbe de Kibana. K3s es mas lento arrancando pods pesados como Elasticsearch/Kibana, por lo que se necesitan valores más altos de tolerancia.
- **Luis P.:** El build de Angular en Docker tarda 4 minutos porque descarga todas las dependencias cada vez.
- **Resolucion:** Se agrego `cache-from: type=gha` en el step de `docker/build-push-action` para reutilizar capas de build entre ejecuciones del pipeline. Tiempo reducido a ~90 segundos en builds subsecuentes.

### Acuerdos tomados
1. Tag `v1.0.0` se crea al finalizar la revision del pipeline hoy.
2. La documentacion (retrospectiva, kanban, dailys) se comitea junto con el tag.
3. No se harán más commits a main hasta la entrega sin pasar por PR y aprobacion del equipo.
