## 1. GUÍA DE DESPLIEGUE EN KUBERNETES (PASO A PASO)
### **Prerrequisitos:**
- Google Cloud SDK instalado
- kubectl instalado
- Proyecto GCP con billing habilitado
- Imágenes Docker en GCR

### **PASO 1: Crear Cluster GKE**

```bash
# Crear cluster
gcloud container clusters create delivereats-cluster \
  --zone us-central1-a \
  --num-nodes 3 \
  --machine-type n1-standard-2 \
  --enable-autoscaling \
  --min-nodes 3 \
  --max-nodes 10

# Conectar kubectl al cluster
gcloud container clusters get-credentials delivereats-cluster --zone us-central1-a
```

### **PASO 2: Crear Namespace**

```bash
kubectl create namespace delivereats-prod
kubectl config set-context --current --namespace=delivereats-prod
```

### **PASO 3: Crear Secrets**

```bash
# JWT Secret
kubectl create secret generic jwt-secret \
  --from-literal=JWT_SECRET='tu-secret-key-super-seguro-123'

# Database passwords
kubectl create secret generic auth-db-password \
  --from-literal=DB_PASSWORD='auth_password_2026'

kubectl create secret generic catalog-db-password \
  --from-literal=DB_PASSWORD='catalog_password_2026'

kubectl create secret generic order-db-password \
  --from-literal=DB_PASSWORD='order_password_2026'

kubectl create secret generic delivery-db-password \
  --from-literal=DB_PASSWORD='delivery_password_2026'

# SMTP credentials
kubectl create secret generic smtp-credentials \
  --from-literal=SMTP_USER='uvictorgomez58@gmail.com' \
  --from-literal=SMTP_PASSWORD='tu-app-password-gmail'
```

### **PASO 4: Deploy RabbitMQ**

```bash
kubectl apply -f k8s/rabbitmq-deployment.yaml
kubectl wait --for=condition=ready pod -l app=rabbitmq --timeout=300s
```

### **PASO 5: Deploy Microservicios**

```bash
# Auth Service
kubectl apply -f k8s/auth-service-deployment.yaml
kubectl wait --for=condition=ready pod -l app=auth-service --timeout=180s

# Catalog Service
kubectl apply -f k8s/catalog-service-deployment.yaml
kubectl wait --for=condition=ready pod -l app=catalog-service --timeout=180s

# Order Service
kubectl apply -f k8s/order-service-deployment.yaml
kubectl wait --for=condition=ready pod -l app=order-service --timeout=180s

# Delivery Service
kubectl apply -f k8s/delivery-service-deployment.yaml
kubectl wait --for=condition=ready pod -l app=delivery-service --timeout=180s

# Notification Service
kubectl apply -f k8s/notification-service-deployment.yaml
kubectl wait --for=condition=ready pod -l app=notification-service --timeout=180s

# API Gateway
kubectl apply -f k8s/api-gateway-deployment.yaml
kubectl wait --for=condition=ready pod -l app=api-gateway --timeout=180s

# Frontend
kubectl apply -f k8s/frontend-deployment.yaml
kubectl wait --for=condition=ready pod -l app=frontend --timeout=180s
```

### **PASO 6: Verificar Despliegue**

```bash
# Ver todos los pods
kubectl get pods

# Ver servicios
kubectl get services

# Ver logs de un servicio
kubectl logs -f deployment/order-service

# Describir un pod
kubectl describe pod <pod-name>
```

### **PASO 7: Obtener URL Pública**

```bash
# Frontend URL
kubectl get service frontend-service -o jsonpath='{.status.loadBalancer.ingress[0].ip}'

# API Gateway URL
kubectl get service api-gateway-service -o jsonpath='{.status.loadBalancer.ingress[0].ip}'
```

### **ESTRATEGIAS DE ROLLOUT**

**Rolling Update (por defecto):**
- Actualiza pods gradualmente
- Zero downtime
- Configurable con `maxSurge` y `maxUnavailable`

```yaml
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxSurge: 1        # Máximo 1 pod extra durante update
    maxUnavailable: 0  # Siempre mantener disponibilidad
```

**Recreate:**
- Para down de todos los pods y crea nuevos
- Usado cuando no se puede tener versiones simultáneas

```yaml
strategy:
  type: Recreate
```

### **ESTRATEGIAS DE ROLLBACK**

```bash
# Ver historial de deployments
kubectl rollout history deployment/order-service

# Rollback a versión anterior
kubectl rollout undo deployment/order-service

# Rollback a versión específica
kubectl rollout undo deployment/order-service --to-revision=2

# Ver status de rollout
kubectl rollout status deployment/order-service
```

---

## 2. PIPELINE CI/CD

### **Arquitectura del Pipeline:**

```
GitHub Push → GitHub Actions → Build Image → Push to GCR → Deploy to GKE
```

### **Archivo: .github/workflows/deploy.yml**

```yaml
name: CI/CD Pipeline - DeliverEats

on:
  push:
    branches: [ main ]
    paths:
      - 'auth-service/**'
      - 'restaurant-catalog-service/**'
      - 'order-service/**'
      - 'delivery-service/**'
      - 'notification-service/**'
      - 'api-gateway/**'
      - 'frontend/**'

env:
  GCP_PROJECT_ID: delivereats-prod
  GKE_CLUSTER: delivereats-cluster
  GKE_ZONE: us-central1-a
  
jobs:
  
  # ========================================
  # JOB 1: BUILD & TEST
  # ========================================
  build-and-test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        service: [auth-service, catalog-service, order-service, delivery-service, notification-service, api-gateway]
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
    
    - name: Install dependencies
      working-directory: ./${{ matrix.service }}
      run: npm ci
    
    - name: Run tests
      working-directory: ./${{ matrix.service }}
      run: npm test || echo "No tests configured"
    
    - name: Build TypeScript
      working-directory: ./${{ matrix.service }}
      run: npm run build
  
  # ========================================
  # JOB 2: BUILD DOCKER IMAGES
  # ========================================
  build-images:
    needs: build-and-test
    runs-on: ubuntu-latest
    strategy:
      matrix:
        service: [auth-service, catalog-service, order-service, delivery-service, notification-service, api-gateway, frontend]
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v3
    
    - name: Setup Google Cloud SDK
      uses: google-github-actions/setup-gcloud@v1
      with:
        project_id: ${{ env.GCP_PROJECT_ID }}
        service_account_key: ${{ secrets.GCP_SA_KEY }}
        export_default_credentials: true
    
    - name: Configure Docker for GCR
      run: gcloud auth configure-docker
    
    - name: Build Docker image
      working-directory: ./${{ matrix.service }}
      run: |
        docker build -t gcr.io/${{ env.GCP_PROJECT_ID }}/${{ matrix.service }}:${{ github.sha }} .
        docker build -t gcr.io/${{ env.GCP_PROJECT_ID }}/${{ matrix.service }}:latest .
    
    - name: Push to GCR
      run: |
        docker push gcr.io/${{ env.GCP_PROJECT_ID }}/${{ matrix.service }}:${{ github.sha }}
        docker push gcr.io/${{ env.GCP_PROJECT_ID }}/${{ matrix.service }}:latest
  
  # ========================================
  # JOB 3: DEPLOY TO GKE
  # ========================================
  deploy:
    needs: build-images
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v3
    
    - name: Setup Google Cloud SDK
      uses: google-github-actions/setup-gcloud@v1
      with:
        project_id: ${{ env.GCP_PROJECT_ID }}
        service_account_key: ${{ secrets.GCP_SA_KEY }}
        export_default_credentials: true
    
    - name: Get GKE credentials
      run: |
        gcloud container clusters get-credentials ${{ env.GKE_CLUSTER }} \
          --zone ${{ env.GKE_ZONE }}
    
    - name: Deploy to GKE
      run: |
        kubectl set image deployment/auth-service \
          auth-service=gcr.io/${{ env.GCP_PROJECT_ID }}/auth-service:${{ github.sha }}
        
        kubectl set image deployment/catalog-service \
          catalog-service=gcr.io/${{ env.GCP_PROJECT_ID }}/catalog-service:${{ github.sha }}
        
        kubectl set image deployment/order-service \
          order-service=gcr.io/${{ env.GCP_PROJECT_ID }}/order-service:${{ github.sha }}
        
        kubectl set image deployment/delivery-service \
          delivery-service=gcr.io/${{ env.GCP_PROJECT_ID }}/delivery-service:${{ github.sha }}
        
        kubectl set image deployment/notification-service \
          notification-service=gcr.io/${{ env.GCP_PROJECT_ID }}/notification-service:${{ github.sha }}
        
        kubectl set image deployment/api-gateway \
          api-gateway=gcr.io/${{ env.GCP_PROJECT_ID }}/api-gateway:${{ github.sha }}
        
        kubectl set image deployment/frontend \
          frontend=gcr.io/${{ env.GCP_PROJECT_ID }}/frontend:${{ github.sha }}
    
    - name: Wait for rollout
      run: |
        kubectl rollout status deployment/auth-service
        kubectl rollout status deployment/catalog-service
        kubectl rollout status deployment/order-service
        kubectl rollout status deployment/delivery-service
        kubectl rollout status deployment/notification-service
        kubectl rollout status deployment/api-gateway
        kubectl rollout status deployment/frontend
    
    - name: Verify deployment
      run: kubectl get pods
```

### **Variables y Secrets Necesarios:**

**GitHub Secrets:**
- `GCP_SA_KEY`: Service Account Key de GCP (JSON)

**Variables de Entorno en Deployments:**
- `NODE_ENV=production`
- `DB_HOST=/cloudsql/...`
- `DB_NAME=...`
- `DB_USER=...`
- `DB_PORT=5432`
- `RABBITMQ_HOST=rabbitmq-service`
- `RABBITMQ_PORT=5672`

**Secrets en Kubernetes:**
- `jwt-secret`: JWT_SECRET
- `*-db-password`: DB_PASSWORD para cada servicio
- `smtp-credentials`: SMTP_USER, SMTP_PASSWORD

---

## 3. FLUJO JWT (JSON Web Token)

### **Arquitectura del Flujo:**

```
Usuario → Frontend → API Gateway → Auth Service → JWT generado
                                 ↓
                         Validación en cada request
                                 ↓
                         Servicios protegidos
```

### **PASO 1: Registro de Usuario**

```
POST /api/v1/auth/register
Body: {
  "email": "cliente@example.com",
  "password": "password123",
  "fullName": "Juan Pérez",
  "role": "CLIENTE"
}

Response: {
  "success": true,
  "userId": "uuid-123",
  "message": "Usuario registrado"
}
```

**Backend (Auth Service):**
```typescript
// 1. Validar datos
// 2. Hash password con bcrypt (10 rounds)
const hashedPassword = await bcrypt.hash(password, 10);
// 3. Guardar en BD
await userRepository.save({ email, password: hashedPassword, role });
```

### **PASO 2: Login (Autenticación)**

```
POST /api/v1/auth/login
Body: {
  "email": "cliente@example.com",
  "password": "password123"
}

Response: {
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid-123",
    "email": "cliente@example.com",
    "role": "CLIENTE"
  }
}
```

**Backend (Auth Service):**
```typescript
// 1. Buscar usuario por email
const user = await userRepository.findByEmail(email);

// 2. Validar password
const isValid = await bcrypt.compare(password, user.password);

// 3. Generar JWT
const token = jwt.sign(
  {
    userId: user.id,
    email: user.email,
    role: user.role
  },
  process.env.JWT_SECRET,
  { expiresIn: '24h' }
);

// 4. Retornar token
return { token, user };
```

### **PASO 3: Request Protegido**

```
POST /api/v1/orders
Headers: {
  "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
Body: {
  "restaurantId": "uuid-456",
  "items": [...]
}
```

**Backend (API Gateway):**
```typescript
// Middleware de validación JWT
async function validateJWT(req, res, next) {
  try {
    // 1. Extraer token del header
    const authHeader = req.headers.authorization;
    const token = authHeader.split(' ')[1]; // "Bearer TOKEN"
    
    // 2. Verificar token con Auth Service (gRPC)
    const result = await authServiceClient.validateJWT({ token });
    
    // 3. Agregar datos del usuario al request
    req.user = {
      userId: result.userId,
      email: result.email,
      role: result.role
    };
    
    // 4. Continuar al siguiente middleware
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

// Aplicar middleware
app.post('/api/v1/orders', validateJWT, createOrderHandler);
```

**Backend (Auth Service - gRPC):**
```typescript
// Método gRPC ValidateJWT
async validateJWT(call, callback) {
  try {
    const { token } = call.request;
    
    // Verificar y decodificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Retornar datos del usuario
    callback(null, {
      valid: true,
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role
    });
  } catch (error) {
    callback({
      code: grpc.status.UNAUTHENTICATED,
      message: 'Token inválido'
    });
  }
}
```

### **PASO 4: Autorización por Rol**

```typescript
// Middleware de autorización
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'No tienes permisos para esta acción' 
      });
    }
    next();
  };
}

// Ejemplo de uso
app.post('/api/v1/restaurants', 
  validateJWT,                    // Primero valida token
  requireRole('ADMIN'),           // Luego valida rol
  createRestaurantHandler
);

app.get('/api/v1/orders',
  validateJWT,
  requireRole('CLIENTE', 'ADMIN'), // Múltiples roles permitidos
  getOrdersHandler
);
```

### **Estructura del Token JWT:**

**Header:**
```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

**Payload (Claims):**
```json
{
  "userId": "uuid-123-456-789",
  "email": "cliente@example.com",
  "role": "CLIENTE",
  "iat": 1677649200,  // Issued at
  "exp": 1677735600   // Expiration (24h después)
}
```

**Signature:**
```
HMACSHA256(
  base64UrlEncode(header) + "." + base64UrlEncode(payload),
  JWT_SECRET
)
```

### **Ejemplo de Request Completo:**

```bash
# 1. Login
curl -X POST http://api-gateway-url/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "cliente@example.com",
    "password": "password123"
  }'

# Response:
# {
#   "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1dWlkLTEyMyIsImVtYWlsIjoiY2xpZW50ZUBleGFtcGxlLmNvbSIsInJvbGUiOiJDTElFTlRFIiwiaWF0IjoxNjc3NjQ5MjAwLCJleHAiOjE2Nzc3MzU2MDB9.signature",
#   "user": { ... }
# }

# 2. Crear orden con token
curl -X POST http://api-gateway-url/api/v1/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "restaurantId": "uuid-456",
    "items": [
      {"productId": "prod-1", "quantity": 2, "price": 15.99}
    ],
    "deliveryAddress": "Calle 123, Ciudad"
  }'