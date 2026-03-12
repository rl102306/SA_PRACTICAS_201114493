# INTEGRACIÓN DE RABBITMQ AL PROYECTO EXISTENTE
# Delivereats - Práctica 4

## TABLA DE CONTENIDOS
1. Instalación de Dependencias
2. Configuración de RabbitMQ con Docker
3. Código para Order Service (Productor)
4. Código para Restaurant-Catalog Service (Consumidor)
5. Código para Notification Service (Consumidor)
6. Pruebas Locales
7. Despliegue en Kubernetes

---

## 1. INSTALACIÓN DE DEPENDENCIAS

### Para TODOS los servicios que usen RabbitMQ:

```bash
# Order Service
cd order-service
npm install amqplib @types/amqplib

# Restaurant-Catalog Service
cd ../restaurant-catalog-service
npm install amqplib @types/amqplib

# Notification Service
cd ../notification-service
npm install amqplib @types/amqplib
```

---

## 2. CONFIGURACIÓN DE RABBITMQ CON DOCKER

### Actualizar docker-compose.yml

Agregar este servicio al archivo `docker-compose.yml` en la raíz del proyecto:

```yaml
services:
  # ... servicios existentes ...

  rabbitmq:
    image: rabbitmq:3-management-alpine
    container_name: delivereats-rabbitmq
    ports:
      - "5672:5672"    # Puerto AMQP
      - "15672:15672"  # Puerto Management UI
    environment:
      RABBITMQ_DEFAULT_USER: admin
      RABBITMQ_DEFAULT_PASS: admin123
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq
    networks:
      - delivereats-network
    healthcheck:
      test: rabbitmq-diagnostics -q ping
      interval: 30s
      timeout: 10s
      retries: 5

volumes:
  # ... volúmenes existentes ...
  rabbitmq_data:
```

---

## 3. CÓDIGO PARA ORDER SERVICE (PRODUCTOR)

### 3.1 Crear RabbitMQ Client

**Archivo:** `order-service/src/infrastructure/messaging/RabbitMQClient.ts`

```typescript
import amqp, { Connection, Channel } from 'amqplib';

export class RabbitMQClient {
  private connection: Connection | null = null;
  private channel: Channel | null = null;
  private readonly url: string;
  private readonly exchange: string = 'delivereats.events';

  constructor() {
    const host = process.env.RABBITMQ_HOST || 'localhost';
    const port = process.env.RABBITMQ_PORT || '5672';
    const user = process.env.RABBITMQ_USER || 'admin';
    const pass = process.env.RABBITMQ_PASS || 'admin123';
    
    this.url = `amqp://${user}:${pass}@${host}:${port}`;
  }

  async connect(): Promise<void> {
    try {
      console.log('🔌 Conectando a RabbitMQ...');
      this.connection = await amqp.connect(this.url);
      this.channel = await this.connection.createChannel();
      
      // Crear exchange tipo topic
      await this.channel.assertExchange(this.exchange, 'topic', {
        durable: true
      });
      
      console.log('✅ Conectado a RabbitMQ');
    } catch (error) {
      console.error('❌ Error conectando a RabbitMQ:', error);
      throw error;
    }
  }

  async publishEvent(routingKey: string, event: any): Promise<boolean> {
    try {
      if (!this.channel) {
        throw new Error('Canal no inicializado');
      }

      const message = JSON.stringify(event);
      
      const published = this.channel.publish(
        this.exchange,
        routingKey,
        Buffer.from(message),
        {
          persistent: true,
          contentType: 'application/json',
          timestamp: Date.now()
        }
      );

      if (published) {
        console.log(`📤 Evento publicado: ${routingKey}`, event);
      }

      return published;
    } catch (error) {
      console.error('❌ Error publicando evento:', error);
      return false;
    }
  }

  async close(): Promise<void> {
    try {
      await this.channel?.close();
      await this.connection?.close();
      console.log('🔌 Desconectado de RabbitMQ');
    } catch (error) {
      console.error('❌ Error cerrando conexión:', error);
    }
  }
}
```

### 3.2 Actualizar CreateOrderUseCase

**Archivo:** `order-service/src/application/usecases/CreateOrderUseCase.ts`

```typescript
import { IOrderRepository } from '../../domain/interfaces/IOrderRepository';
import { Order } from '../../domain/entities/Order';
import { v4 as uuidv4 } from 'uuid';
import { CatalogServiceClient } from '../../infrastructure/grpc/clients/CatalogServiceClient';
import { RabbitMQClient } from '../../infrastructure/messaging/RabbitMQClient';

export interface CreateOrderDTO {
  userId: string;
  restaurantId: string;
  items: Array<{
    productId: string;
    quantity: number;
    price: number;
  }>;
  deliveryAddress: string;
}

export class CreateOrderUseCase {
  constructor(
    private readonly orderRepository: IOrderRepository,
    private readonly catalogClient: CatalogServiceClient,
    private readonly messagingClient: RabbitMQClient // ← NUEVO
  ) {}

  async execute(dto: CreateOrderDTO): Promise<Order> {
    console.log(`📦 Creando orden para usuario ${dto.userId}...`);

    // Validar productos con Catalog Service (gRPC)
    const productsValid = await this.catalogClient.validateProducts(
      dto.items.map(item => item.productId)
    );

    if (!productsValid) {
      throw new Error('Uno o más productos no están disponibles');
    }

    // Calcular total
    const totalAmount = dto.items.reduce(
      (sum, item) => sum + (item.price * item.quantity),
      0
    );

    // Crear orden
    const order = new Order({
      id: uuidv4(),
      userId: dto.userId,
      restaurantId: dto.restaurantId,
      items: dto.items,
      status: 'PENDING',
      totalAmount,
      deliveryAddress: dto.deliveryAddress,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Guardar en BD
    const savedOrder = await this.orderRepository.save(order);

    // ============================================
    // PUBLICAR EVENTO ASÍNCRONO
    // ============================================
    await this.messagingClient.publishEvent('order.created', {
      orderId: savedOrder.id,
      userId: savedOrder.userId,
      restaurantId: savedOrder.restaurantId,
      items: savedOrder.items,
      totalAmount: savedOrder.totalAmount,
      deliveryAddress: savedOrder.deliveryAddress,
      status: savedOrder.status,
      createdAt: savedOrder.createdAt.toISOString()
    });

    console.log(`✅ Orden creada y evento publicado: ${savedOrder.id}`);

    return savedOrder;
  }
}
```

### 3.3 Actualizar server.ts de Order Service

**Archivo:** `order-service/src/server.ts`

```typescript
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import dotenv from 'dotenv';
import { createDatabasePool, initializeDatabase } from './infrastructure/database/postgres/config';
import { PostgresOrderRepository } from './infrastructure/database/postgres/PostgresOrderRepository';
import { CreateOrderUseCase } from './application/usecases/CreateOrderUseCase';
import { CatalogServiceClient } from './infrastructure/grpc/clients/CatalogServiceClient';
import { RabbitMQClient } from './infrastructure/messaging/RabbitMQClient'; // ← NUEVO
import { Order } from './domain/entities/Order';

dotenv.config();

const PROTO_PATH = path.join(__dirname, './infrastructure/grpc/proto/order.proto');
const PORT = process.env.PORT || process.env.GRPC_PORT || 8080;

async function main() {
  try {
    console.log('🚀 Iniciando Order Service...');

    // Inicializar base de datos
    const pool = createDatabasePool();
    await initializeDatabase(pool);

    // Inicializar RabbitMQ
    const messagingClient = new RabbitMQClient(); // ← NUEVO
    await messagingClient.connect(); // ← NUEVO

    // Inicializar repositorios y use cases
    const orderRepository = new PostgresOrderRepository(pool);
    const catalogClient = new CatalogServiceClient();
    const createOrderUseCase = new CreateOrderUseCase(
      orderRepository,
      catalogClient,
      messagingClient // ← NUEVO
    );

    // ... resto del código gRPC ...

    // Manejo de señales
    process.on('SIGINT', async () => {
      console.log('\n🛑 Cerrando servidor...');
      await messagingClient.close(); // ← NUEVO
      server.tryShutdown(() => {
        pool.end();
        console.log('👋 Servidor cerrado');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  }
}

main();
```

---

## 4. CÓDIGO PARA RESTAURANT-CATALOG SERVICE (CONSUMIDOR)

### 4.1 Crear RabbitMQ Consumer

**Archivo:** `restaurant-catalog-service/src/infrastructure/messaging/RabbitMQConsumer.ts`

```typescript
import amqp, { Connection, Channel, ConsumeMessage } from 'amqplib';

export type EventHandler = (event: any) => Promise<void>;

export class RabbitMQConsumer {
  private connection: Connection | null = null;
  private channel: Channel | null = null;
  private readonly url: string;
  private readonly exchange: string = 'delivereats.events';

  constructor() {
    const host = process.env.RABBITMQ_HOST || 'localhost';
    const port = process.env.RABBITMQ_PORT || '5672';
    const user = process.env.RABBITMQ_USER || 'admin';
    const pass = process.env.RABBITMQ_PASS || 'admin123';
    
    this.url = `amqp://${user}:${pass}@${host}:${port}`;
  }

  async connect(): Promise<void> {
    try {
      console.log('🔌 Conectando a RabbitMQ...');
      this.connection = await amqp.connect(this.url);
      this.channel = await this.connection.createChannel();
      
      // Configurar prefetch (procesar de a 10 mensajes)
      await this.channel.prefetch(10);
      
      // Crear exchange
      await this.channel.assertExchange(this.exchange, 'topic', {
        durable: true
      });
      
      console.log('✅ Conectado a RabbitMQ (Consumer)');
    } catch (error) {
      console.error('❌ Error conectando a RabbitMQ:', error);
      // Reintentar conexión después de 5 segundos
      setTimeout(() => this.connect(), 5000);
    }
  }

  async subscribe(
    queueName: string,
    routingKeys: string[],
    handler: EventHandler
  ): Promise<void> {
    try {
      if (!this.channel) {
        throw new Error('Canal no inicializado');
      }

      // Crear cola durable
      await this.channel.assertQueue(queueName, {
        durable: true,
        arguments: {
          'x-message-ttl': 86400000 // 24 horas
        }
      });

      // Bind routing keys
      for (const routingKey of routingKeys) {
        await this.channel.bindQueue(queueName, this.exchange, routingKey);
        console.log(`🔗 Queue '${queueName}' bound to '${routingKey}'`);
      }

      // Consumir mensajes
      await this.channel.consume(
        queueName,
        async (msg: ConsumeMessage | null) => {
          if (!msg) return;

          try {
            const content = msg.content.toString();
            const event = JSON.parse(content);
            const routingKey = msg.fields.routingKey;

            console.log(`📥 Evento recibido [${routingKey}]:`, event);

            // Procesar evento
            await handler(event);

            // Confirmar procesamiento
            this.channel?.ack(msg);
            console.log(`✅ Evento procesado [${routingKey}]`);

          } catch (error) {
            console.error('❌ Error procesando evento:', error);
            // Rechazar y NO reencolar (evitar loops infinitos)
            this.channel?.nack(msg, false, false);
          }
        },
        { noAck: false }
      );

      console.log(`👂 Escuchando eventos en queue '${queueName}'...`);
    } catch (error) {
      console.error('❌ Error suscribiendo a cola:', error);
      throw error;
    }
  }

  async close(): Promise<void> {
    try {
      await this.channel?.close();
      await this.connection?.close();
      console.log('🔌 Desconectado de RabbitMQ');
    } catch (error) {
      console.error('❌ Error cerrando conexión:', error);
    }
  }
}
```

### 4.2 Crear Event Handler

**Archivo:** `restaurant-catalog-service/src/application/events/OrderCreatedHandler.ts`

```typescript
export class OrderCreatedHandler {
  async handle(event: any): Promise<void> {
    console.log('');
    console.log('═══════════════════════════════════════════════');
    console.log('🆕 NUEVA ORDEN RECIBIDA');
    console.log('═══════════════════════════════════════════════');
    console.log(`📋 Order ID: ${event.orderId}`);
    console.log(`👤 User ID: ${event.userId}`);
    console.log(`🏪 Restaurant ID: ${event.restaurantId}`);
    console.log(`💰 Total: $${event.totalAmount}`);
    console.log(`📍 Dirección: ${event.deliveryAddress}`);
    console.log(`📦 Items:`);
    
    event.items.forEach((item: any, index: number) => {
      console.log(`   ${index + 1}. Product ${item.productId}`);
      console.log(`      Cantidad: ${item.quantity}`);
      console.log(`      Precio: $${item.price}`);
    });
    
    console.log(`⏰ Creada: ${event.createdAt}`);
    console.log('═══════════════════════════════════════════════');
    console.log('');
    
    // Aquí podrías:
    // - Actualizar stock
    // - Reservar productos
    // - Notificar al restaurante
    // - Guardar en una tabla de órdenes recibidas
    
    // Por ahora solo logueamos (PoC)
  }
}
```

### 4.3 Actualizar server.ts de Restaurant-Catalog Service

**Archivo:** `restaurant-catalog-service/src/server.ts`

```typescript
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import dotenv from 'dotenv';
import { createDatabasePool, initializeDatabase } from './infrastructure/database/postgres/config';
import { RabbitMQConsumer } from './infrastructure/messaging/RabbitMQConsumer'; // ← NUEVO
import { OrderCreatedHandler } from './application/events/OrderCreatedHandler'; // ← NUEVO

dotenv.config();

const PROTO_PATH = path.join(__dirname, './infrastructure/grpc/proto/catalog.proto');
const PORT = process.env.PORT || process.env.GRPC_PORT || 8080;

async function main() {
  try {
    console.log('🚀 Iniciando Restaurant-Catalog Service...');

    // Inicializar base de datos
    const pool = createDatabasePool();
    await initializeDatabase(pool);

    // ============================================
    // INICIALIZAR RABBITMQ CONSUMER
    // ============================================
    const messagingConsumer = new RabbitMQConsumer();
    await messagingConsumer.connect();

    // Suscribirse a eventos de órdenes
    const orderCreatedHandler = new OrderCreatedHandler();
    await messagingConsumer.subscribe(
      'catalog.orders.queue',           // Nombre de la cola
      ['order.created'],                // Routing keys a escuchar
      (event) => orderCreatedHandler.handle(event)  // Handler
    );

    // ... resto del código gRPC ...

    // Manejo de señales
    process.on('SIGINT', async () => {
      console.log('\n🛑 Cerrando servidor...');
      await messagingConsumer.close(); // ← NUEVO
      server.tryShutdown(() => {
        pool.end();
        console.log('👋 Servidor cerrado');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  }
}

main();
```

---

## 5. CÓDIGO PARA NOTIFICATION SERVICE (CONSUMIDOR)

### 5.1 Crear Event Handler

**Archivo:** `notification-service/src/application/events/OrderEventsHandler.ts`

```typescript
import { EmailService } from '../services/EmailService';

export class OrderEventsHandler {
  constructor(private readonly emailService: EmailService) {}

  async handleOrderCreated(event: any): Promise<void> {
    console.log('📧 Enviando notificación de orden creada...');

    const emailContent = `
      <h2>¡Orden Creada Exitosamente!</h2>
      <p>Hola,</p>
      <p>Tu orden #${event.orderId} ha sido creada.</p>
      
      <h3>Detalles:</h3>
      <ul>
        <li><strong>Total:</strong> $${event.totalAmount}</li>
        <li><strong>Dirección de entrega:</strong> ${event.deliveryAddress}</li>
        <li><strong>Estado:</strong> Pendiente</li>
      </ul>
      
      <h3>Productos:</h3>
      <ul>
        ${event.items.map((item: any) => `
          <li>Producto ${item.productId} - Cantidad: ${item.quantity} - $${item.price}</li>
        `).join('')}
      </ul>
      
      <p>Te notificaremos cuando el restaurante acepte tu orden.</p>
      <p>Gracias por tu compra!</p>
    `;

    await this.emailService.sendEmail(
      event.userEmail || 'cliente@example.com', // En producción obtener de Auth Service
      'Orden Creada - Delivereats',
      emailContent
    );

    console.log(`✅ Email enviado para orden ${event.orderId}`);
  }

  async handleOrderStatusChanged(event: any): Promise<void> {
    console.log(`📧 Enviando notificación de cambio de estado: ${event.newStatus}`);

    const statusMessages: Record<string, string> = {
      'IN_PROCESS': 'El restaurante está preparando tu orden',
      'READY': 'Tu orden está lista para ser recogida',
      'IN_TRANSIT': 'Tu orden está en camino',
      'DELIVERED': 'Tu orden ha sido entregada',
      'CANCELLED': 'Tu orden ha sido cancelada',
      'REJECTED': 'El restaurante ha rechazado tu orden'
    };

    const message = statusMessages[event.newStatus] || 'Estado actualizado';

    const emailContent = `
      <h2>Actualización de Orden #${event.orderId}</h2>
      <p>${message}</p>
      <p><strong>Nuevo estado:</strong> ${event.newStatus}</p>
    `;

    await this.emailService.sendEmail(
      event.userEmail || 'cliente@example.com',
      `Orden ${event.orderId} - ${event.newStatus}`,
      emailContent
    );

    console.log(`✅ Email de actualización enviado`);
  }
}
```

### 5.2 Actualizar server.ts de Notification Service

**Archivo:** `notification-service/src/server.ts`

```typescript
import * as grpc from '@grpc/grpc-js';
import dotenv from 'dotenv';
import { RabbitMQConsumer } from './infrastructure/messaging/RabbitMQConsumer';
import { OrderEventsHandler } from './application/events/OrderEventsHandler';
import { EmailService } from './application/services/EmailService';

dotenv.config();

const PORT = process.env.PORT || process.env.GRPC_PORT || 8080;

async function main() {
  try {
    console.log('🚀 Iniciando Notification Service...');

    // Inicializar Email Service
    const emailService = new EmailService();

    // Inicializar RabbitMQ Consumer
    const messagingConsumer = new RabbitMQConsumer();
    await messagingConsumer.connect();

    // Crear handler de eventos
    const orderEventsHandler = new OrderEventsHandler(emailService);

    // Suscribirse a eventos de órdenes
    await messagingConsumer.subscribe(
      'notification.orders.queue',
      ['order.created', 'order.status.changed', 'order.cancelled'],
      async (event) => {
        const routingKey = event.routingKey || 'order.created';
        
        if (routingKey === 'order.created') {
          await orderEventsHandler.handleOrderCreated(event);
        } else if (routingKey === 'order.status.changed') {
          await orderEventsHandler.handleOrderStatusChanged(event);
        }
      }
    );

    console.log(`✅ Notification Service listo en puerto ${PORT}`);

    // Manejo de señales
    process.on('SIGINT', async () => {
      console.log('\n🛑 Cerrando servidor...');
      await messagingConsumer.close();
      console.log('👋 Servidor cerrado');
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  }
}

main();
```

---

## 6. PRUEBAS LOCALES

### 6.1 Levantar servicios con Docker Compose

```bash
# Desde la raíz del proyecto
docker-compose up -d

# Verificar que RabbitMQ esté corriendo
docker ps | grep rabbitmq

# Ver logs de RabbitMQ
docker logs delivereats-rabbitmq
```

### 6.2 Acceder a RabbitMQ Management UI

Abre en el navegador:
```
http://localhost:15672
```

Credenciales:
- Usuario: `admin`
- Password: `admin123`

### 6.3 Probar flujo completo

```bash
# 1. Crear una orden (via API Gateway o directamente)
curl -X POST http://localhost:3000/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "restaurantId": "123",
    "items": [
      {"productId": "prod-1", "quantity": 2, "price": 15.99}
    ],
    "deliveryAddress": "Calle 123, Ciudad"
  }'

# 2. Verificar logs de Order Service
docker logs delivereats-order-service

# Deberías ver: "📤 Evento publicado: order.created"

# 3. Verificar logs de Restaurant-Catalog Service
docker logs delivereats-catalog-service

# Deberías ver: "🆕 NUEVA ORDEN RECIBIDA"

# 4. Verificar logs de Notification Service
docker logs delivereats-notification-service

# Deberías ver: "📧 Enviando notificación de orden creada..."

# 5. Verificar en RabbitMQ UI
# Ve a http://localhost:15672 → Queues
# Deberías ver:
# - catalog.orders.queue
# - notification.orders.queue
```

---

## 7. DESPLIEGUE EN KUBERNETES

### 7.1 Crear RabbitMQ Deployment

**Archivo:** `k8s/rabbitmq-deployment.yaml`

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: rabbitmq-config
  namespace: delivereats-prod
data:
  RABBITMQ_DEFAULT_USER: admin
  RABBITMQ_DEFAULT_PASS: admin123

---
apiVersion: v1
kind: Service
metadata:
  name: rabbitmq-service
  namespace: delivereats-prod
spec:
  selector:
    app: rabbitmq
  ports:
    - name: amqp
      port: 5672
      targetPort: 5672
    - name: management
      port: 15672
      targetPort: 15672
  type: ClusterIP

---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: rabbitmq
  namespace: delivereats-prod
spec:
  serviceName: rabbitmq-service
  replicas: 1
  selector:
    matchLabels:
      app: rabbitmq
  template:
    metadata:
      labels:
        app: rabbitmq
    spec:
      containers:
      - name: rabbitmq
        image: rabbitmq:3-management-alpine
        ports:
        - containerPort: 5672
          name: amqp
        - containerPort: 15672
          name: management
        envFrom:
        - configMapRef:
            name: rabbitmq-config
        volumeMounts:
        - name: rabbitmq-data
          mountPath: /var/lib/rabbitmq
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
  volumeClaimTemplates:
  - metadata:
      name: rabbitmq-data
    spec:
      accessModes: [ "ReadWriteOnce" ]
      resources:
        requests:
          storage: 10Gi
```

### 7.2 Variables de entorno para servicios

Actualizar deployments de Order, Catalog y Notification para incluir:

```yaml
env:
  - name: RABBITMQ_HOST
    value: "rabbitmq-service"
  - name: RABBITMQ_PORT
    value: "5672"
  - name: RABBITMQ_USER
    value: "admin"
  - name: RABBITMQ_PASS
    valueFrom:
      secretKeyRef:
        name: rabbitmq-secret
        key: password
```

---

## RESUMEN DE CAMBIOS

### Archivos NUEVOS a crear:

1. **Order Service:**
   - `infrastructure/messaging/RabbitMQClient.ts`
   - Actualizar: `usecases/CreateOrderUseCase.ts`
   - Actualizar: `server.ts`

2. **Restaurant-Catalog Service:**
   - `infrastructure/messaging/RabbitMQConsumer.ts`
   - `application/events/OrderCreatedHandler.ts`
   - Actualizar: `server.ts`

3. **Notification Service:**
   - `infrastructure/messaging/RabbitMQConsumer.ts`
   - `application/events/OrderEventsHandler.ts`
   - Actualizar: `server.ts`

4. **Docker Compose:**
   - Agregar servicio `rabbitmq` al `docker-compose.yml`

5. **Kubernetes:**
   - `k8s/rabbitmq-deployment.yaml`

### Dependencias a instalar:

```bash
npm install amqplib @types/amqplib
```

### Puertos que se usan:

- **5672**: AMQP (comunicación de mensajes)
- **15672**: Management UI (interfaz web)

---

¿Quieres que genere estos archivos listos para copiar y pegar en tu proyecto? 🚀
