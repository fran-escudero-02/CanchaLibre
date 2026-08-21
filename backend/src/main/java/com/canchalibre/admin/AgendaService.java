package com.canchalibre.admin;

import com.canchalibre.booking.Booking;
import com.canchalibre.booking.BookingRepository;
import com.canchalibre.booking.BookingStatus;
import com.canchalibre.complex.SportsComplex;
import com.canchalibre.slot.Slot;
import com.canchalibre.slot.SlotRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AgendaService {

    private final SlotRepository slotRepository;
    private final BookingRepository bookingRepository;

    @Value("${app.timezone}")
    private String timezone;

    public record SlotAgendaDTO(Long slotId, String hora, String estado, String titular,
                                String telefono, BigDecimal sena, BigDecimal saldo,
                                Long bookingId, String fuente) {}

    public record CourtAgendaDTO(Long courtId, String cancha, String deporte, List<SlotAgendaDTO> slots) {}

    public record AgendaDTO(List<CourtAgendaDTO> canchas, BigDecimal totalSenas, BigDecimal totalSaldos) {}

    @Transactional(readOnly = true)
    public AgendaDTO dailyAgenda(SportsComplex complex, LocalDate date) {
        ZoneId zone = ZoneId.of(timezone);
        Instant from = date.atStartOfDay(zone).toInstant();
        Instant to = date.plusDays(1).atStartOfDay(zone).toInstant();

        List<Slot> slots = slotRepository
                .findByCourtComplexIdAndStartAtBetweenOrderByCourtIdAscStartAtAsc(complex.getId(), from, to);
        Map<Long, Booking> bookingsBySlot = bookingRepository
                .findByComplexIdAndSlotStartAtBetween(complex.getId(), from, to).stream()
                .filter(b -> b.getStatus() == BookingStatus.CONFIRMADA)
                .collect(Collectors.toMap(b -> b.getSlot().getId(), b -> b));

        BigDecimal totalSenas = BigDecimal.ZERO;
        BigDecimal totalSaldos = BigDecimal.ZERO;
        // Agrupado por cancha (id) para no mezclar canchas con el mismo nombre.
        Map<Long, List<SlotAgendaDTO>> byCourt = new LinkedHashMap<>();
        Map<Long, Slot> courtSample = new LinkedHashMap<>();

        for (Slot slot : slots) {
            Long courtId = slot.getCourt().getId();
            Booking booking = bookingsBySlot.get(slot.getId());
            String titular = null, telefono = null;
            BigDecimal sena = BigDecimal.ZERO, saldo = BigDecimal.ZERO;
            Long bookingId = null;
            String fuente = null;
            if (booking != null) {
                // El titular del turno manual es el cliente cargado por el dueño
                // (guestName), aunque la reserva esté asociada al dueño.
                titular = booking.getGuestName() != null ? booking.getGuestName()
                        : booking.getPlayer().getFullName();
                telefono = booking.getGuestPhone() != null ? booking.getGuestPhone()
                        : booking.getPlayer().getPhone();
                sena = booking.getDepositAmount();
                saldo = booking.getRemainingAmount();
                totalSenas = totalSenas.add(sena);
                totalSaldos = totalSaldos.add(saldo);
                bookingId = booking.getId();
                fuente = booking.getSource().name();
            }
            byCourt.computeIfAbsent(courtId, k -> new ArrayList<>()).add(new SlotAgendaDTO(
                    slot.getId(),
                    slot.getStartAt().atZone(zone).toLocalTime().toString(),
                    slot.getStatus().name(), titular, telefono, sena, saldo, bookingId, fuente));
            courtSample.putIfAbsent(courtId, slot);
        }
        List<CourtAgendaDTO> courts = byCourt.entrySet().stream()
                .map(e -> {
                    Slot sample = courtSample.get(e.getKey());
                    return new CourtAgendaDTO(e.getKey(), sample.getCourt().getName(),
                            sample.getCourt().getSport().name(), e.getValue());
                })
                .toList();
        return new AgendaDTO(courts, totalSenas, totalSaldos);
    }
}
