package com.canchalibre.it;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * HU-06 (bloqueo/desbloqueo), HU-13 (agenda diaria) y HU-14 (turno manual,
 * edición y cancelación) de punta a punta.
 */
class AdminOperationsIntegrationTest extends IntegrationTestBase {

    @Autowired
    private TestRestTemplate rest;

    private String adminToken() {
        ResponseEntity<Map> res = rest.postForEntity("/api/v1/auth/login",
                new HttpEntity<>(Map.of("email", "admin@canchalibre.dev", "password", "admin1234")), Map.class);
        return (String) res.getBody().get("token");
    }

    private HttpHeaders auth(String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        return headers;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> agenda(String token, String fecha) {
        ResponseEntity<Map> res = rest.exchange("/api/v1/admin/agenda?fecha=" + fecha,
                HttpMethod.GET, new HttpEntity<>(auth(token)), Map.class);
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        return res.getBody();
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> primerSlot(String token, String estadoEsperado) {
        String fecha = LocalDate.now().plusDays(1).toString();
        for (Object courtObj : (List<Object>) agenda(token, fecha).get("canchas")) {
            Map<String, Object> court = (Map<String, Object>) courtObj;
            for (Object slotObj : (List<Object>) court.get("slots")) {
                Map<String, Object> slot = (Map<String, Object>) slotObj;
                if (estadoEsperado.equals(slot.get("estado"))) {
                    return slot;
                }
            }
        }
        throw new IllegalStateException("No hay slot " + estadoEsperado);
    }

    @Test
    @SuppressWarnings("unchecked")
    void flujoCompletoDeAgendaBloqueoManualEdicionYDesbloqueo() {
        String token = adminToken();
        String fecha = LocalDate.now().plusDays(1).toString();

        // HU-14: registrar turno manual → CONFIRMADO directo, asociado al dueño.
        Map<String, Object> paraManual = primerSlot(token, "DISPONIBLE");
        Long slotManual = ((Number) paraManual.get("slotId")).longValue();
        ResponseEntity<Map> manual = rest.exchange("/api/v1/admin/bookings/manual",
                HttpMethod.POST, new HttpEntity<>(
                        Map.of("slotId", slotManual, "titular", "Juan Perez", "telefono", "11-2345-6789"),
                        auth(token)), Map.class);
        assertThat(manual.getStatusCode()).isEqualTo(HttpStatus.OK);
        Long bookingId = ((Number) manual.getBody().get("bookingId")).longValue();

        // HU-13: la agenda muestra titular, teléfono, bookingId y fuente.
        Map<String, Object> agenda = agenda(token, fecha);
        Map<String, Object> slotConfirmado = buscarSlot(agenda, slotManual);
        assertThat(slotConfirmado.get("estado")).isEqualTo("CONFIRMADO");
        assertThat(slotConfirmado.get("titular")).isEqualTo("Juan Perez");
        assertThat(slotConfirmado.get("telefono")).isEqualTo("11-2345-6789");
        assertThat(((Number) slotConfirmado.get("bookingId")).longValue()).isEqualTo(bookingId);
        assertThat(slotConfirmado.get("fuente")).isEqualTo("MOSTRADOR");
        assertThat(((Number) slotConfirmado.get("saldo")).doubleValue()).isPositive();

        // Edición del turno manual: cambia titular y teléfono.
        ResponseEntity<Map> editado = rest.exchange("/api/v1/admin/bookings/" + bookingId + "/manual",
                HttpMethod.PUT, new HttpEntity<>(
                        Map.of("titular", "Ana Gomez", "telefono", "11-9999-8888"), auth(token)), Map.class);
        assertThat(editado.getStatusCode()).isEqualTo(HttpStatus.OK);
        Map<String, Object> slotEditado = buscarSlot(agenda(token, fecha), slotManual);
        assertThat(slotEditado.get("titular")).isEqualTo("Ana Gomez");
        assertThat(slotEditado.get("telefono")).isEqualTo("11-9999-8888");

        // El turno manual figura en "Mis reservas" del dueño.
        ResponseEntity<Map> misReservas = rest.exchange("/api/v1/bookings/mis-reservas",
                HttpMethod.GET, new HttpEntity<>(auth(token)), Map.class);
        List<Object> content = (List<Object>) misReservas.getBody().get("content");
        assertThat(content.stream()
                .map(b -> ((Number) ((Map<String, Object>) b).get("id")).longValue())
                .anyMatch(id -> id.equals(bookingId))).isTrue();

        // Cancelación desde la agenda: libera el slot.
        ResponseEntity<Map> cancel = rest.exchange("/api/v1/bookings/" + bookingId + "/cancel",
                HttpMethod.POST, new HttpEntity<>(auth(token)), Map.class);
        assertThat(cancel.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(buscarSlot(agenda(token, fecha), slotManual).get("estado")).isEqualTo("DISPONIBLE");

        // HU-06: bloqueo y desbloqueo operativo.
        ResponseEntity<Void> block = rest.exchange("/api/v1/admin/slots/" + slotManual + "/bloquear",
                HttpMethod.POST, new HttpEntity<>(Map.of("motivo", "Reparación de red"), auth(token)), Void.class);
        assertThat(block.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(buscarSlot(agenda(token, fecha), slotManual).get("estado")).isEqualTo("BLOQUEADO");

        ResponseEntity<Void> unblock = rest.exchange("/api/v1/admin/slots/" + slotManual + "/desbloquear",
                HttpMethod.POST, new HttpEntity<>(auth(token)), Void.class);
        assertThat(unblock.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(buscarSlot(agenda(token, fecha), slotManual).get("estado")).isEqualTo("DISPONIBLE");
    }

    @Test
    void desbloquearUnTurnoNoBloqueadoDa409() {
        String token = adminToken();
        Map<String, Object> disponible = primerSlot(token, "DISPONIBLE");
        Long slotId = ((Number) disponible.get("slotId")).longValue();

        ResponseEntity<Map> res = rest.exchange("/api/v1/admin/slots/" + slotId + "/desbloquear",
                HttpMethod.POST, new HttpEntity<>(auth(token)), Map.class);
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    void elDuenoNoPuedeReservarOnlineDesdeLaGrillaPublica() {
        String token = adminToken();
        Map<String, Object> disponible = primerSlot(token, "DISPONIBLE");
        Long slotId = ((Number) disponible.get("slotId")).longValue();

        // La grilla pública es consultable sin login...
        ResponseEntity<Map> grid = rest.getForEntity(
                "/api/v1/complexes/1/grid?date=" + LocalDate.now().plusDays(1), Map.class);
        assertThat(grid.getStatusCode()).isEqualTo(HttpStatus.OK);

        // ...pero el dueño no puede iniciar una reserva online (solo manual).
        ResponseEntity<Map> initiate = rest.exchange("/api/v1/bookings/initiate",
                HttpMethod.POST, new HttpEntity<>(Map.of("slotId", slotId), auth(token)), Map.class);
        assertThat(initiate.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void bloquearUnSlotYaConfirmadoDa409() {
        String token = adminToken();
        Map<String, Object> disponible = primerSlot(token, "DISPONIBLE");
        Long slotId = ((Number) disponible.get("slotId")).longValue();

        ResponseEntity<Map> manual = rest.exchange("/api/v1/admin/bookings/manual",
                HttpMethod.POST, new HttpEntity<>(
                        Map.of("slotId", slotId, "titular", "Ocupado", "telefono", "11"), auth(token)), Map.class);
        assertThat(manual.getStatusCode()).isEqualTo(HttpStatus.OK);

        ResponseEntity<Map> block = rest.exchange("/api/v1/admin/slots/" + slotId + "/bloquear",
                HttpMethod.POST, new HttpEntity<>(Map.of("motivo", "test"), auth(token)), Map.class);
        assertThat(block.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    void registroManualSinTitularDa400() {
        String token = adminToken();
        ResponseEntity<Map> res = rest.exchange("/api/v1/admin/bookings/manual",
                HttpMethod.POST, new HttpEntity<>(Map.of("slotId", 1), auth(token)), Map.class);
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> buscarSlot(Map<String, Object> agenda, Long slotId) {
        for (Object courtObj : (List<Object>) agenda.get("canchas")) {
            for (Object slotObj : (List<Object>) ((Map<String, Object>) courtObj).get("slots")) {
                Map<String, Object> slot = (Map<String, Object>) slotObj;
                if (((Number) slot.get("slotId")).longValue() == slotId) return slot;
              }
        }
        throw new IllegalStateException("Slot " + slotId + " no encontrado en la agenda");
    }
}
