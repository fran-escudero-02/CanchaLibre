package com.canchalibre.slot;

import com.canchalibre.complex.SportsComplex;
import com.canchalibre.complex.SportsComplexRepository;
import com.canchalibre.court.Court;
import com.canchalibre.court.CourtRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SlotService {

    private final SportsComplexRepository complexRepository;
    private final CourtRepository courtRepository;
    private final SlotRepository slotRepository;

    @Value("${app.timezone}")
    private String timezone;

    @Transactional
    public List<GridDTO> getGrid(Long complexId, LocalDate date) {
        SportsComplex complex = complexRepository.findById(complexId)
                .orElseThrow(() -> new EntityNotFoundException("Complejo no encontrado"));
        generateMissingSlots(complex, date);
        ZoneId zone = ZoneId.of(timezone);
        Instant from = date.atStartOfDay(zone).toInstant();
        Instant to = date.plusDays(1).atStartOfDay(zone).toInstant();
        Instant ahora = Instant.now();
        // La grilla pública solo muestra turnos futuros: los que ya empezaron
        // no se pueden ver ni reservar (RF-07).
        return courtRepository.findByComplexIdAndIsActiveTrue(complexId).stream()
                .map(court -> toGridDTO(court,
                        slotRepository.findByCourtIdAndStartAtBetweenOrderByStartAtAsc(court.getId(), from, to)
                                .stream()
                                .filter(s -> s.getStartAt().isAfter(ahora))
                                .toList()))
                .toList();
    }

    private void generateMissingSlots(SportsComplex complex, LocalDate date) {
        ZoneId zone = ZoneId.of(timezone);
        ZonedDateTime start = date.atTime(complex.getOpenTime()).atZone(zone);
        boolean crossesMidnight = !complex.getCloseTime().isAfter(complex.getOpenTime());
        ZonedDateTime end = crossesMidnight
                ? date.plusDays(1).atTime(complex.getCloseTime()).atZone(zone)
                : date.atTime(complex.getCloseTime()).atZone(zone);
        int duration = complex.getSlotDurationMinutes();

        for (Court court : courtRepository.findByComplexIdAndIsActiveTrue(complex.getId())) {
            ZonedDateTime cursor = start;
            while (!cursor.plusMinutes(duration).isAfter(end)) {
                Instant slotStart = cursor.toInstant();
                if (!slotRepository.existsByCourtIdAndStartAt(court.getId(), slotStart)) {
                    Slot slot = new Slot();
                    slot.setCourt(court);
                    slot.setStartAt(slotStart);
                    slot.setEndAt(cursor.plusMinutes(duration).toInstant());
                    slotRepository.save(slot);
                }
                cursor = cursor.plusMinutes(duration);
            }
        }
    }

    private GridDTO toGridDTO(Court court, List<Slot> slots) {
        return new GridDTO(court.getId(), court.getName(), court.getSport().name(),
                court.getSurface().name(), court.getIsIndoor(), court.getPrice(),
                court.getDepositPercentage(),
                slots.stream()
                        .map(s -> new GridDTO.SlotDTO(s.getId(), s.getStartAt(), s.getStatus().name()))
                        .toList());
    }

    @Transactional
    public void blockSlot(Long slotId, String reason, Long complexId) {
        Slot slot = slotRepository.findByIdForUpdate(slotId)
                .orElseThrow(() -> new EntityNotFoundException("El turno no existe"));
        if (!slot.getCourt().getComplex().getId().equals(complexId)) {
            throw new AccessDeniedException("Slot ajeno");
        }
        if (slot.getStatus() != SlotStatus.DISPONIBLE) {
            throw new IllegalStateException("Solo se pueden bloquear turnos DISPONIBLES");
        }
        slot.setStatus(SlotStatus.BLOQUEADO);
        slot.setBlockReason(reason);
    }

    /**
     * Deshace un bloqueo operativo (HU-06): vuelve el turno a DISPONIBLE.
     */
    @Transactional
    public void unblockSlot(Long slotId, Long complexId) {
        Slot slot = slotRepository.findByIdForUpdate(slotId)
                .orElseThrow(() -> new EntityNotFoundException("El turno no existe"));
        if (!slot.getCourt().getComplex().getId().equals(complexId)) {
            throw new AccessDeniedException("Slot ajeno");
        }
        if (slot.getStatus() != SlotStatus.BLOQUEADO) {
            throw new IllegalStateException("Solo se pueden desbloquear turnos BLOQUEADOS");
        }
        slot.setStatus(SlotStatus.DISPONIBLE);
        slot.setBlockReason(null);
    }
}
