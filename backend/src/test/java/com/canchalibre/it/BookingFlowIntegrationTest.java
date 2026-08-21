package com.canchalibre.it;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Flujo completo del jugador (HU-07 → HU-08 → HU-10/11 simulado → HU-03 → HU-12)
 * + prueba de concurrencia anti-colisión (RNF-02).
 */
class BookingFlowIntegrationTest extends IntegrationTestBase {

    @Autowired
    private TestRestTemplate rest;

    private String playerToken() {
        ResponseEntity<Map> res = rest.postForEntity("/api/v1/auth/login",
                new HttpEntity<>(Map.of("email", "player@canchalibre.dev", "password", "player1234")), Map.class);
        return (String) res.getBody().get("token");
    }

    private HttpHeaders auth(String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        return headers;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> gridForTomorrow() {
        String date = LocalDate.now().plusDays(1).toString();
        ResponseEntity<Map> res = rest.getForEntity("/api/v1/complexes/1/grid?date=" + date, Map.class);
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        return res.getBody();
    }

    @SuppressWarnings("unchecked")
    private Long primerSlotDisponible() {
        Map<String, Object> grid = gridForTomorrow();
        for (Object courtObj : (List<Object>) grid) {
            Map<String, Object> court = (Map<String, Object>) courtObj;
            for (Object slotObj : (List<Object>) court.get("slots")) {
                Map<String, Object> slot = (Map<String, Object>) slotObj;
                if ("DISPONIBLE".equals(slot.get("estado"))) {
                    return ((Number) slot.get("id")).longValue();
                }
            }
        }
        throw new IllegalStateException("No hay slots disponibles en la grilla de mañana");
    }

    @Test
    @SuppressWarnings("unchecked")
    void flujoCompletoDelJugador() {
        String token = playerToken();

        // 1. Initiate: bloquea el slot (HU-08)
        Long slotId = primerSlotDisponible();
        ResponseEntity<Map> initiate = rest.exchange("/api/v1/bookings/initiate",
                HttpMethod.POST, new HttpEntity<>(Map.of("slotId", slotId), auth(token)), Map.class);
        assertThat(initiate.getStatusCode()).isEqualTo(HttpStatus.OK);
        Number bookingId = (Number) initiate.getBody().get("bookingId");
        assertThat(initiate.getBody().get("expiraEn")).isNotNull();

        // 2. La grilla refleja EN_PROCESO_PAGO en tiempo real (HU-07)
        Map<String, Object> grid = gridForTomorrow();
        boolean enProceso = ((List<Object>) grid).stream()
                .flatMap(c -> ((List<Object>) ((Map<String, Object>) c).get("slots")).stream())
                .map(s -> (Map<String, Object>) s)
                .anyMatch(s -> "EN_PROCESO_PAGO".equals(s.get("estado")));
        assertThat(enProceso).isTrue();

        // 3. Checkout en modo simulación confirma la seña (HU-10/11 simulado)
        ResponseEntity<Map> checkout = rest.exchange("/api/v1/payments/checkout",
                HttpMethod.POST, new HttpEntity<>(Map.of("bookingId", bookingId), auth(token)), Map.class);
        assertThat(checkout.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(checkout.getBody().get("simulacion")).isEqualTo(true);

        // 4. Mis reservas muestra la reserva CONFIRMADA (HU-03)
        ResponseEntity<Map> misReservas = rest.exchange("/api/v1/bookings/mis-reservas",
                HttpMethod.GET, new HttpEntity<>(auth(token)), Map.class);
        assertThat(misReservas.getStatusCode()).isEqualTo(HttpStatus.OK);
        List<Object> content = (List<Object>) misReservas.getBody().get("content");
        assertThat(content).isNotEmpty();
        Map<String, Object> reserva = (Map<String, Object>) content.get(0);
        assertThat(reserva.get("estado")).isEqualTo("CONFIRMADA");

        // 5. Cancelación con margen > 2 hs → reembolso y slot liberado (HU-12)
        ResponseEntity<Map> cancel = rest.exchange("/api/v1/bookings/" + bookingId + "/cancel",
                HttpMethod.POST, new HttpEntity<>(auth(token)), Map.class);
        assertThat(cancel.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(cancel.getBody().get("resultado")).isEqualTo("CANCELADA_REEMBOLSADA");

        // 6. El slot vuelve a estar DISPONIBLE
        Map<String, Object> gridFinal = gridForTomorrow();
        boolean liberado = ((List<Object>) gridFinal).stream()
                .flatMap(c -> ((List<Object>) ((Map<String, Object>) c).get("slots")).stream())
                .map(s -> (Map<String, Object>) s)
                .anyMatch(s -> ((Number) s.get("id")).longValue() == slotId
                        && "DISPONIBLE".equals(s.get("estado")));
        assertThat(liberado).isTrue();
    }

    @Test
    void iniciarDosReservasSimultaneasSobreElMismoSlotSoloDejaGanarAUna() throws Exception {
        String tokenA = playerToken();
        // Un segundo jugador distinto: registramos uno nuevo para que los locks compitan de verdad.
        ResponseEntity<Map> reg = rest.postForEntity("/api/v1/auth/register",
                new HttpEntity<>(Map.of("fullName", "Rival", "email", "rival+concurrency@it.test",
                        "phone", "1100000000", "password", "clave1234")), Map.class);
        String tokenB = (String) (reg.getStatusCode().is2xxSuccessful()
                ? reg.getBody().get("token")
                : loginRival());

        Long slotId = primerSlotDisponible();

        int hilos = 2;
        ExecutorService pool = Executors.newFixedThreadPool(hilos);
        CountDownLatch listos = new CountDownLatch(hilos);
        CountDownLatch arranque = new CountDownLatch(1);
        AtomicInteger exitosos = new AtomicInteger();
        AtomicInteger rechazados = new AtomicInteger();

        Runnable reservar = () -> {
            String token = Thread.currentThread().getName().equals("A") ? tokenA : tokenB;
            listos.countDown();
            try {
                arranque.await(5, TimeUnit.SECONDS);
            } catch (InterruptedException ignored) {
            }
            ResponseEntity<Map> res = rest.exchange("/api/v1/bookings/initiate",
                    HttpMethod.POST, new HttpEntity<>(Map.of("slotId", slotId), auth(token)), Map.class);
            if (res.getStatusCode().is2xxSuccessful()) exitosos.incrementAndGet();
            else if (res.getStatusCode() == HttpStatus.CONFLICT) rechazados.incrementAndGet();
        };

        Thread a = new Thread(reservar, "A");
        Thread b = new Thread(reservar, "B");
        a.start();
        b.start();
        assertThat(listos.await(5, TimeUnit.SECONDS)).isTrue();
        arranque.countDown();
        a.join(15000);
        b.join(15000);
        pool.shutdown();

        // RNF-02: 0 colisiones — exactamente un ganador y un rechazado con 409.
        assertThat(exitosos.get()).isEqualTo(1);
        assertThat(rechazados.get()).isEqualTo(1);
    }

    @SuppressWarnings("unchecked")
    private String loginRival() {
        ResponseEntity<Map> res = rest.postForEntity("/api/v1/auth/login",
                new HttpEntity<>(Map.of("email", "rival+concurrency@it.test", "password", "clave1234")), Map.class);
        return (String) res.getBody().get("token");
    }

    @Test
    void validarPayloadDeInitiateSinSlotIdDa400() {
        String token = playerToken();
        ResponseEntity<Map> res = rest.exchange("/api/v1/bookings/initiate",
                HttpMethod.POST, new HttpEntity<>(Map.of(), auth(token)), Map.class);
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }
}
