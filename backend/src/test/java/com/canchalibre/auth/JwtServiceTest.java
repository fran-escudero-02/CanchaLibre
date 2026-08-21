package com.canchalibre.auth;

import com.canchalibre.user.Role;
import com.canchalibre.user.User;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.MalformedJwtException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.*;

@ExtendWith(MockitoExtension.class)
class JwtServiceTest {

    @InjectMocks private JwtService jwtService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(jwtService, "secret",
                "secreto-de-pruebas-canchalibre-con-mas-de-256-bits-para-hmac-sha");
        ReflectionTestUtils.setField(jwtService, "expirationMinutes", 60);
    }

    private User user() {
        User u = new User();
        u.setId(7L);
        u.setEmail("player@test.com");
        u.setRole(Role.ROLE_PLAYER);
        return u;
    }

    @Test
    void generateYParseVanYVuelvenConLosClaimsCorrectos() {
        String token = jwtService.generate(user());

        var claims = jwtService.parse(token);

        assertThat(claims.getSubject()).isEqualTo("player@test.com");
        assertThat(claims.get("userId", Long.class)).isEqualTo(7L);
        assertThat(claims.get("role", String.class)).isEqualTo("ROLE_PLAYER");
    }

    @Test
    void parseRechazaTokenAdulterado() {
        String token = jwtService.generate(user());
        String adulterado = token.substring(0, token.length() - 3) + "abc";

        assertThatThrownBy(() -> jwtService.parse(adulterado)).isInstanceOf(JwtException.class);
    }

    @Test
    void parseRechazaBasura() {
        assertThatThrownBy(() -> jwtService.parse("no-es-un-jwt"))
                .isInstanceOf(MalformedJwtException.class);
    }
}
