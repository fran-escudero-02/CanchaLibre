package com.canchalibre.complex;

import com.canchalibre.user.Role;
import com.canchalibre.user.User;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.time.LocalTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * HU-05: configuración de esquema horario y señas.
 */
@ExtendWith(MockitoExtension.class)
class ComplexServiceTest {

    @Mock private SportsComplexRepository repository;

    @InjectMocks private ComplexService complexService;

    private SportsComplex complex;
    private User owner;
    private User superadmin;

    @BeforeEach
    void setUp() {
        owner = new User();
        owner.setId(20L);
        owner.setRole(Role.ROLE_ADMIN_COMPLEX);

        superadmin = new User();
        superadmin.setId(40L);
        superadmin.setRole(Role.ROLE_SUPERADMIN);

        complex = new SportsComplex();
        complex.setId(1L);
        complex.setName("Club Test");
        complex.setOpenTime(LocalTime.of(8, 0));
        complex.setCloseTime(LocalTime.of(23, 0));
        complex.setSlotDurationMinutes(60);
        complex.setOwner(owner);
    }

    @Test
    void updateConfigConHorarioNocturnoQueCruzaMedianocheEsValido() {
        // HU-05 escenario: 18:00 a 00:00, turnos de 60 min.
        when(repository.findById(1L)).thenReturn(Optional.of(complex));
        when(repository.save(any(SportsComplex.class))).thenAnswer(inv -> inv.getArgument(0));

        var res = complexService.updateConfig(1L,
                new ComplexService.UpdateConfigRequest("18:00", "00:00", 60), owner);

        assertThat(res.openTime()).isEqualTo("18:00");
        assertThat(res.closeTime()).isEqualTo("00:00");
    }

    @Test
    void updateConfigConFormatoDeHoraInvalidoDa400() {
        when(repository.findById(1L)).thenReturn(Optional.of(complex));

        assertThatThrownBy(() -> complexService.updateConfig(1L,
                new ComplexService.UpdateConfigRequest("25:99", null, null), owner))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("openTime");
    }

    @Test
    void updateConfigRechazaAperturaIgualACierre() {
        when(repository.findById(1L)).thenReturn(Optional.of(complex));

        assertThatThrownBy(() -> complexService.updateConfig(1L,
                new ComplexService.UpdateConfigRequest("09:00", "09:00", null), owner))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void updateConfigRechazaDuracionDeTurnoAbsurda() {
        when(repository.findById(1L)).thenReturn(Optional.of(complex));

        assertThatThrownBy(() -> complexService.updateConfig(1L,
                new ComplexService.UpdateConfigRequest(null, null, 5), owner))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void updateConfigRechazaNoPropietariosSalvoSuperadmin() {
        User otro = new User();
        otro.setId(99L);
        otro.setRole(Role.ROLE_ADMIN_COMPLEX);
        when(repository.findById(1L)).thenReturn(Optional.of(complex));
        when(repository.save(any(SportsComplex.class))).thenAnswer(inv -> inv.getArgument(0));

        assertThatThrownBy(() -> complexService.updateConfig(1L,
                new ComplexService.UpdateConfigRequest("09:00", "20:00", 90), otro))
                .isInstanceOf(AccessDeniedException.class);

        // Superadmin si puede
        var res = complexService.updateConfig(1L,
                new ComplexService.UpdateConfigRequest("09:00", "20:00", 90), superadmin);
        assertThat(res.slotDurationMinutes()).isEqualTo(90);
    }

    @Test
    void detailInexistenteDa404() {
        when(repository.findById(99L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> complexService.detail(99L))
                .isInstanceOf(EntityNotFoundException.class);
    }
}
