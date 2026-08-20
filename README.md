# CanchaLibre (MVP)

Plataforma de reserva de turnos deportivos con cobro de seña online (Mercado Pago).

## Ejecutar con Docker
    docker compose up --build

- Frontend: http://localhost:5173
- API: http://localhost:8080
- Swagger: http://localhost:8080/swagger-ui/index.html

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

## Desarrollo local sin Docker
Requiere PostgreSQL (o levantá solo la db: `docker compose up db`).

    # Terminal 1
    cd backend && mvn spring-boot:run
    # Terminal 2
    cd frontend && npm install && npm run dev

Nota: los turnos se generan en la zona horaria `America/Argentina/Buenos_Aires`
(configurable con la variable `APP_TIMEZONE`).
