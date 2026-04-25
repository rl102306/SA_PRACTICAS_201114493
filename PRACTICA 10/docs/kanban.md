# Kanban Final - Sistema de Mesa de Ayuda
**Fecha de cierre:** 2026-04-24
**Proyecto:** SA Practica 9 + 10

---

## DONE - Completado

### Practica 9 - Backend

| ID | Tarea | Estimacion | Notas |
|----|-------|-----------|-------|
| P9-01 | Diseño de entidades (User, Ticket) | 2h | Incluye diagrama ER |
| P9-02 | Configuracion PostgreSQL en Docker | 1h | Con healthcheck |
| P9-03 | user-service: CRUD completo | 4h | JWT auth incluida |
| P9-04 | user-service: Endpoint login/register | 2h | bcrypt para passwords |
| P9-05 | ticket-service: CRUD completo | 5h | Filtros por estado/prioridad |
| P9-06 | ticket-service: Publicar eventos RabbitMQ | 2h | TICKET_CREATED, UPDATED, DELETED |
| P9-07 | notification-service: Consumer RabbitMQ | 3h | Con retry logic |
| P9-08 | Dockerfiles optimizados (multi-stage) | 2h | Imagen final < 200MB |
| P9-09 | docker-compose.yml con todos los servicios | 1.5h | healthchecks y depends_on |

### Practica 9 - Frontend

| ID | Tarea | Estimacion | Notas |
|----|-------|-----------|-------|
| P9-10 | Setup Angular 17 standalone | 1h | angular.json + app.config |
| P9-11 | AuthService + interceptor JWT | 2h | Token en localStorage |
| P9-12 | Componente Login/Register | 3h | Validaciones de formulario |
| P9-13 | Componente lista de tickets con filtros | 3h | Filtro por estado y prioridad |
| P9-14 | Componente crear ticket | 2h | Formulario reactivo |
| P9-15 | Componente detalle + edicion de ticket | 3h | Inline editing |
| P9-16 | AuthGuard + routing protegido | 1h | Redirect a login |
| P9-17 | nginx.conf con proxy a microservicios | 1h | Proxy /api/users y /api/tickets |

### Practica 9 - Infraestructura

| ID | Tarea | Estimacion | Notas |
|----|-------|-----------|-------|
| P9-18 | Manifiestos K3s (Deployment + Service) para todos los servicios | 3h | 5 Deployments |
| P9-19 | Ingress K3s con rutas / /api/users /api/tickets | 1h | Traefik ingress class |
| P9-20 | Terraform VM e2-standard-4 GCP us-central1 | 3h | Con startup script K3s |
| P9-21 | Kubernetes Secrets para credenciales | 0.5h | db-password, jwt-secret |
| P9-22 | PersistentVolumeClaim para PostgreSQL | 0.5h | 5Gi local-path |

### Practica 10 - CI/CD

| ID | Tarea | Estimacion | Notas |
|----|-------|-----------|-------|
| P10-01 | GitHub Actions: job lint | 1h | npm ci en los 3 servicios |
| P10-02 | GitHub Actions: job build Docker | 1.5h | Matrix strategy para 4 imágenes |
| P10-03 | GitHub Actions: job push DockerHub | 1.5h | Tags :latest y :sha |
| P10-04 | GitHub Actions: job deploy K3s | 2h | kubectl apply con rollout status |
| P10-05 | Configuracion de secrets en GitHub | 0.5h | DOCKER_USERNAME, DOCKER_PASSWORD, K3S_HOST, K3S_TOKEN |

### Practica 10 - Monitoreo

| ID | Tarea | Estimacion | Notas |
|----|-------|-----------|-------|
| P10-06 | Prometheus ConfigMap con scrape configs | 2h | Scraping de 3 microservicios + K8s pods |
| P10-07 | Prometheus Deployment + RBAC | 1.5h | ClusterRole para leer pods/nodes |
| P10-08 | Grafana Deployment con datasource Prometheus | 1h | Provisionado via ConfigMap |
| P10-09 | Dashboard Grafana: CPU, RAM, HTTP traffic | 3h | 3 panels, auto-provisionado |
| P10-10 | Grafana NodePort service (30030) | 0.5h | Acceso externo |

### Practica 10 - Logging

| ID | Tarea | Estimacion | Notas |
|----|-------|-----------|-------|
| P10-11 | Elasticsearch Deployment (single-node) | 1.5h | xpack.security deshabilitado para dev |
| P10-12 | Kibana Deployment conectado a ES | 1h | Variables de entorno configuradas |
| P10-13 | Services y NodePorts para Kibana (30056) | 0.5h | Acceso externo |
| P10-14 | Namespaces monitoring y logging | 0.5h | Separacion de recursos |

### Documentacion

| ID | Tarea | Estimacion | Notas |
|----|-------|-----------|-------|
| P10-15 | Retrospectiva del equipo | 1h | Keep/Improve/Stop |
| P10-16 | Kanban final | 0.5h | Este documento |
| P10-17 | 3 minutas de daily meetings | 1h | Dailys coherentes |
| P10-18 | Tag release v1.0.0 | 0.1h | git tag v1.0.0 |

---

## Resumen

| Estado | Cantidad | Porcentaje |
|--------|---------|-----------|
| Done | 35 | 87.5% |
| In Progress | 3 | 7.5% |
| Blocked | 2 | 5% |
| **Total** | **40** | **100%** |

**Total de horas estimadas:** ~62 horas
**Total de horas reales:** ~68 horas (+9.7% sobre estimacion)
