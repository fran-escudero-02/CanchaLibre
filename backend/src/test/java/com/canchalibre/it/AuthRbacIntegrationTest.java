package com.canchalibre.it;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.*;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * HU-01 (registro/login) y HU-02 (RBAC) de punta a punta contra la API real.
 */
class AuthRbacIntegrationTest extends IntegrationTestBase {

    @Autowired
    private TestRestTemplate rest;

    @SuppressWarnings("unchecked")
    private Map<String, Object> login(String email, String password) {
        ResponseEntity<Map> res = rest.postForEntity("/api/v1/auth/login",
                new HttpEntity<>(Map.of("email", email, "password", password)), Map.class);
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        return res.getBody();
    }

    private HttpHeaders auth(String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        return headers;
    }

    @Test
    void loginDeUsuariosSeedFuncionaYDevuelveTokenConRol() {
        Map<String, Object> player = login("player@canchalibre.dev", "player1234");
        assertThat(player.get("role")).isEqualTo("ROLE_PLAYER");
        assertThat((String) player.get("token")).isNotBlank();

        Map<String, Object> admin = login("admin@canchalibre.dev", "admin1234");
        assertThat(admin.get("role")).isEqualTo("ROLE_ADMIN_COMPLEX");
    }

    @Test
    void loginConPasswordIncorrectaDa401SinDetalleDelCampo() {
        ResponseEntity<Map> res = rest.postForEntity("/api/v1/auth/login",
                new HttpEntity<>(Map.of("email", "player@canchalibre.dev", "password", "incorrecta")), Map.class);

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat((String) res.getBody().get("error")).doesNotContain("password").doesNotContain("email");
    }

    @Test
    void registroCreaJugadorYDevuelveToken() {
        ResponseEntity<Map> res = rest.postForEntity("/api/v1/auth/register",
                new HttpEntity<>(Map.of("fullName", "Nuevo Jugador", "email", "nuevo@it.test",
                        "phone", "1100000000", "password", "clave1234")), Map.class);

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(res.getBody().get("role")).isEqualTo("ROLE_PLAYER");
    }

    @Test
    void registroConEmailDuplicadoDa409() {
        var body = Map.of("fullName", "Dup", "email", "player@canchalibre.dev",
                "phone", "1100000000", "password", "clave1234");
        ResponseEntity<Map> res = rest.postForEntity("/api/v1/auth/register", new HttpEntity<>(body), Map.class);
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    void jugadorNoPuedeAccederAlPanelDeAdministracion() {
        // HU-02: ROLE_PLAYER contra endpoint de ADMIN_COMPLEX → 403.
        String token = (String) login("player@canchalibre.dev", "player1234").get("token");

        ResponseEntity<String> res = rest.exchange("/api/v1/admin/agenda?fecha=2030-01-01",
                HttpMethod.GET, new HttpEntity<>(auth(token)), String.class);

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void sinTokenLaApiDevuelve401OSinAcceso() {
        ResponseEntity<String> res = rest.getForEntity("/api/v1/bookings/mis-reservas", String.class);
        assertThat(res.getStatusCode()).isIn(HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN);
    }

    @Test
    void adminDeComplejoAccedeASuAgenda() {
        String token = (String) login("admin@canchalibre.dev", "admin1234").get("token");

        ResponseEntity<Map> res = rest.exchange("/api/v1/admin/agenda?fecha=2030-01-01",
                HttpMethod.GET, new HttpEntity<>(auth(token)), Map.class);

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(res.getBody()).containsKeys("canchas", "totalSenas", "totalSaldos");
    }
}
