# CanchaLibre (MVP)

Plataforma de reserva de turnos deportivos con cobro de seña online (Mercado Pago).

## Ejecutar con Docker
    docker compose up --build

- Frontend: http://localhost:5173
- API: http://localhost:8080
- Swagger: http://localhost:8080/swagger-ui/index.html

## Variables de entorno del backend

| Variable | Obligatoria | Descripción |
|---|---|---|
| `JWT_SECRET` | **Sí** | Secreto de firma de tokens (mínimo 256 bits). Sin ella la app **no arranca**. Generá uno con `python -c "import secrets; print(secrets.token_urlsafe(48))"` |
| `DB_HOST` / `DB_NAME` / `DB_USER` / `DB_PASSWORD` | No | Conexión PostgreSQL (defaults para dev local) |
| `FRONTEND_URL` | No | URL del frontend para las redirecciones de pago |
| `MP_SIMULATION` | No | `true` confirma señas sin llamar a Mercado Pago (demo) |
| `MP_ACCESS_TOKEN` | No | Credencial real de Mercado Pago |
| `SLOT_LOCK_MINUTES` | No | Minutos de retención del turno durante el pago (default `5`) |
| `APP_TIMEZONE` | No | Zona horaria de generación de turnos (default `America/Argentina/Buenos_Aires`) |

## Usuarios de prueba (se crean solos al arrancar)
| Rol | Email | Contraseña |
|---|---|---|
| Jugador | player@canchalibre.dev | player1234 |
| Admin de complejo | admin@canchalibre.dev | admin1234 |
| SuperAdmin | super@canchalibre.dev | super1234 |

## Modo simulación de pagos
Con `MP_SIMULATION=true` (por defecto), al pagar la seña el sistema la confirma
automáticamente sin llamar a Mercado Pago: permite probar todo el flujo sin cuenta de MP.

Para usar Mercado Pago real:
1. Creá credenciales de prueba en https://www.mercadopago.com.ar/developers/panel
2. En docker-compose.yml: `MP_SIMULATION: "false"` y `MP_ACCESS_TOKEN: TEST-xxxx`
3. Configurá el webhook en el panel de MP apuntando a una URL pública (ej. con ngrok):
   `https://TU-DOMINIO/api/v1/webhooks/mercadopago`

## Migraciones de base de datos (Flyway)

El esquema lo gestiona **Flyway** (`backend/src/main/resources/db/migration`) y Hibernate
corre con `ddl-auto: validate` (solo verifica que las entidades matcheen el esquema).

- Para cambiar el esquema: creá una migración nueva `V{n}__descripcion.sql` (nunca edites
  una ya aplicada).
- Al adoptar Flyway sobre una base existente creada antes de las migraciones, se aplica
  baseline automático (`baseline-on-migrate`) y las migraciones futuras se aplican normal.

## Desarrollo local sin Docker
Requiere PostgreSQL (o levantá solo la db: `docker compose up db`) y `JWT_SECRET` definida.

    # Terminal 1
    export JWT_SECRET=$(python -c "import secrets; print(secrets.token_urlsafe(48))")
    cd backend && mvn spring-boot:run
    # Terminal 2
    cd frontend && npm install && npm run dev

Nota: los turnos se generan en la zona horaria `America/Argentina/Buenos_Aires`
(configurable con la variable `APP_TIMEZONE`).

## Tests

### Backend (JUnit 5 + Mockito + Testcontainers)
    cd backend && mvn test

- **Unitarios**: lógica crítica de reservas/cancelaciones (`BookingServiceTest`,
  `AuthServiceTest`, `WebhookServiceTest`, `PaymentServiceTest`, `ComplexServiceTest`,
  `JwtServiceTest`) — corren sin Docker.
- **De integración** (`com.canchalibre.it`): flujo completo del jugador, RBAC
  (403 de jugador contra panel admin) y **concurrencia anti-colisión** (dos reservas
  simultáneas sobre el mismo slot → exactamente un ganador) contra PostgreSQL real.
  Requieren Docker; si no está disponible se omiten automáticamente.

### Frontend (Vitest + Testing Library)
    cd frontend && npm test

Cubren el guard de rutas por rol, el modal (portal, Escape, bloqueo de scroll),
la grilla de slots por estado, el cliente de API y los helpers de formato.
