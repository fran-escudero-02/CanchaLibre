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
                                String telefono, BigDecimal sena, BigDecimal saldo) {}

    public record CourtAgendaDTO(String cancha, List<SlotAgendaDTO> slots) {}

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
        Map<String, List<SlotAgendaDTO>> byCourt = new LinkedHashMap<>();

        for (Slot slot : slots) {
            Booking booking = bookingsBySlot.get(slot.getId());
            String titular = null, telefono = null;
            BigDecimal sena = BigDecimal.ZERO, saldo = BigDecimal.ZERO;
            if (booking != null) {
                titular = booking.getPlayer() != null ? booking.getPlayer().getFullName() : booking.getGuestName();
                telefono = booking.getPlayer() != null ? booking.getPlayer().getPhone() : booking.getGuestPhone();
                sena = booking.getDepositAmount();
                saldo = booking.getRemainingAmount();
                totalSenas = totalSenas.add(sena);
                totalSaldos = totalSaldos.add(saldo);
            }
            byCourt.computeIfAbsent(slot.getCourt().getName(), k -> new ArrayList<>()).add(new SlotAgendaDTO(
                    slot.getId(),
                    slot.getStartAt().atZone(zone).toLocalTime().toString(),
                    slot.getStatus().name(), titular, telefono, sena, saldo));
        }
        List<CourtAgendaDTO> courts = byCourt.entrySet().stream()
                .map(e -> new CourtAgendaDTO(e.getKey(), e.getValue())).toList();
        return new AgendaDTO(courts, totalSenas, totalSaldos);
    }
}
