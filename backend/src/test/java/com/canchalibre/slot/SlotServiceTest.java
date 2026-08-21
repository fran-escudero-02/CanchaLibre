package com.canchalibre.slot;

import com.canchalibre.complex.SportsComplex;
import com.canchalibre.complex.SportsComplexRepository;
import com.canchalibre.court.Court;
import com.canchalibre.court.CourtRepository;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SlotServiceTest {

    @Mock private SportsComplexRepository complexRepository;
    @Mock private CourtRepository courtRepository;
    @Mock private SlotRepository slotRepository;

    @InjectMocks private SlotService slotService;

    private SportsComplex complex;
    private Court court;
    private Slot slot;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(slotService, "timezone", "America/Argentina/Buenos_Aires");

        complex = new SportsComplex();
        complex.setId(1L);
        complex.setOpenTime(LocalTime.of(8, 0));
        complex.setCloseTime(LocalTime.of(23, 0));
        complex.setSlotDurationMinutes(60);

        court = new Court();
        court.setId(100L);
        court.setName("Cancha 1");
        court.setSport(com.canchalibre.court.Sport.FUTBOL_5);
        court.setSurface(com.canchalibre.court.Surface.CEMENTO);
        court.setIsIndoor(false);
        court.setPrice(new java.math.BigDecimal("20000"));
        court.setDepositPercentage(30);
        court.setComplex(complex);

        slot = new Slot();
        slot.setId(1000L);
        slot.setCourt(court);
        slot.setStartAt(Instant.now().plus(1, ChronoUnit.DAYS));
        slot.setEndAt(Instant.now().plus(1, ChronoUnit.DAYS).plus(1, ChronoUnit.HOURS));
        slot.setStatus(SlotStatus.DISPONIBLE);
    }

    // ── unblockSlot (HU-06) ───────────────────────────────────────────

    @Test
    void desbloquearDevuelveElTurnoADisponible() {
        slot.setStatus(SlotStatus.BLOQUEADO);
        slot.setBlockReason("Mantenimiento");
        when(slotRepository.findByIdForUpdate(1000L)).thenReturn(Optional.of(slot));

        slotService.unblockSlot(1000L, 1L);

        assertThat(slot.getStatus()).isEqualTo(SlotStatus.DISPONIBLE);
        assertThat(slot.getBlockReason()).isNull();
    }

    @Test
    void desbloquearUnTurnoNoBloqueadoDa409() {
        slot.setStatus(SlotStatus.CONFIRMADO);
        when(slotRepository.findByIdForUpdate(1000L)).thenReturn(Optional.of(slot));

        assertThatThrownBy(() -> slotService.unblockSlot(1000L, 1L))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void desbloquearUnTurnoAjenoDa403() {
        when(slotRepository.findByIdForUpdate(1000L)).thenReturn(Optional.of(slot));

        assertThatThrownBy(() -> slotService.unblockSlot(1000L, 2L))
                .isInstanceOf(AccessDeniedException.class);
    }

    // ── getGrid: ocultar turnos pasados (RF-07) ──────────────────────

    @Test
    void laGrillaPublicaNoMuestraTurnosQueYaComenzaron() {
        when(complexRepository.findById(1L)).thenReturn(Optional.of(complex));
        when(courtRepository.findByComplexIdAndIsActiveTrue(1L)).thenReturn(List.of(court));
        // Todos los slots ya existen: la generacion no debe guardar nada nuevo.
        when(slotRepository.existsByCourtIdAndStartAt(eq(100L), any(Instant.class))).thenReturn(true);

        Slot pasado = new Slot();
        pasado.setId(2000L);
        pasado.setCourt(court);
        pasado.setStartAt(Instant.now().minus(1, ChronoUnit.HOURS));
        pasado.setEndAt(Instant.now().minus(1, ChronoUnit.MINUTES));
        pasado.setStatus(SlotStatus.DISPONIBLE);

        Slot futuro = new Slot();
        futuro.setId(2001L);
        futuro.setCourt(court);
        futuro.setStartAt(Instant.now().plus(2, ChronoUnit.HOURS));
        futuro.setEndAt(Instant.now().plus(3, ChronoUnit.HOURS));
        futuro.setStatus(SlotStatus.DISPONIBLE);

        when(slotRepository.findByCourtIdAndStartAtBetweenOrderByStartAtAsc(eq(100L), any(Instant.class), any(Instant.class)))
                .thenReturn(List.of(pasado, futuro));

        List<GridDTO> grid = slotService.getGrid(1L, LocalDate.now());

        assertThat(grid).hasSize(1);
        assertThat(grid.get(0).slots()).hasSize(1);
        assertThat(grid.get(0).slots().get(0).id()).isEqualTo(2001L);
    }

    @Test
    void getGridConComplejoInexistenteDa404() {
        when(complexRepository.findById(99L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> slotService.getGrid(99L, LocalDate.now()))
                .isInstanceOf(EntityNotFoundException.class);
    }
}
