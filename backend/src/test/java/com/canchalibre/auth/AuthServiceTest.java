package com.canchalibre.auth;

import com.canchalibre.common.InvalidCredentialsException;
import com.canchalibre.user.Role;
import com.canchalibre.user.User;
import com.canchalibre.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * HU-01: registro e inicio de sesión.
 */
@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private JwtService jwtService;

    @InjectMocks private AuthService authService;

    private User existing;

    @BeforeEach
    void setUp() {
        existing = new User();
        existing.setId(1L);
        existing.setEmail("player@test.com");
        existing.setPasswordHash("$2a$12$hash");
        existing.setFullName("Jugador");
        existing.setRole(Role.ROLE_PLAYER);
    }

    @Test
    void registroPersisteUsuarioPlayerConPasswordHasheadaYDevuelveToken() {
        when(userRepository.existsByEmail("nuevo@test.com")).thenReturn(false);
        when(passwordEncoder.encode("clave1234")).thenReturn("$2a$12$encoded");
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
        when(jwtService.generate(any(User.class))).thenReturn("jwt-token");

        var response = authService.register(
                new AuthService.RegisterRequest("Nuevo", "nuevo@test.com", "1100000000", "clave1234"));

        assertThat(response.token()).isEqualTo("jwt-token");
        assertThat(response.role()).isEqualTo("ROLE_PLAYER");

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        User saved = captor.getValue();
        assertThat(saved.getPasswordHash()).isEqualTo("$2a$12$encoded");
        assertThat(saved.getRole()).isEqualTo(Role.ROLE_PLAYER);
    }

    @Test
    void registroConEmailDuplicadoDaConflicto() {
        when(userRepository.existsByEmail("player@test.com")).thenReturn(true);
        assertThatThrownBy(() -> authService.register(
                new AuthService.RegisterRequest("Dup", "player@test.com", "11", "clave1234")))
                .isInstanceOf(IllegalStateException.class);
        verify(userRepository, never()).save(any());
    }

    @Test
    void loginExitosoDevuelveToken() {
        when(userRepository.findByEmail("player@test.com")).thenReturn(Optional.of(existing));
        when(passwordEncoder.matches("clave1234", "$2a$12$hash")).thenReturn(true);
        when(jwtService.generate(existing)).thenReturn("jwt-token");

        var response = authService.login(new AuthService.LoginRequest("player@test.com", "clave1234"));

        assertThat(response.token()).isEqualTo("jwt-token");
        assertThat(response.fullName()).isEqualTo("Jugador");
    }

    @Test
    void loginConPasswordIncorrectaDa401SinRevelarQueCampoFallo() {
        when(userRepository.findByEmail("player@test.com")).thenReturn(Optional.of(existing));
        when(passwordEncoder.matches("incorrecta", "$2a$12$hash")).thenReturn(false);

        assertThatThrownBy(() -> authService.login(new AuthService.LoginRequest("player@test.com", "incorrecta")))
                .isInstanceOf(InvalidCredentialsException.class)
                .hasMessageNotContaining("password")
                .hasMessageNotContaining("email");
    }

    @Test
    void loginConEmailInexistenteDa401() {
        when(userRepository.findByEmail("ghost@test.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.login(new AuthService.LoginRequest("ghost@test.com", "clave1234")))
                .isInstanceOf(InvalidCredentialsException.class);
    }
}
