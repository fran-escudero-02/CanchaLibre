package com.canchalibre.admin;

import com.canchalibre.booking.Booking;
import com.canchalibre.booking.BookingService;
import com.canchalibre.complex.SportsComplex;
import com.canchalibre.complex.SportsComplexRepository;
import com.canchalibre.slot.SlotService;
import com.canchalibre.user.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
public class AdminController {

    private final SportsComplexRepository complexRepository;
    private final AgendaService agendaService;
    private final SlotService slotService;
    private final BookingService bookingService;

    @GetMapping("/agenda")
    @PreAuthorize("hasRole('ADMIN_COMPLEX')")
    public AgendaService.AgendaDTO agenda(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fecha,
            @AuthenticationPrincipal UserPrincipal principal) {
        return agendaService.dailyAgenda(myComplex(principal), fecha);
    }

    @PostMapping("/slots/{slotId}/bloquear")
    @PreAuthorize("hasRole('ADMIN_COMPLEX')")
    public ResponseEntity<Void> block(@PathVariable Long slotId, @RequestBody Map<String, String> body,
                                      @AuthenticationPrincipal UserPrincipal principal) {
        slotService.blockSlot(slotId, body.getOrDefault("motivo", "Mantenimiento"),
                myComplex(principal).getId());
        return ResponseEntity.ok().build();
    }

    public record ManualBookingRequest(Long slotId, String titular, String telefono) {}

    @PostMapping("/bookings/manual")
    @PreAuthorize("hasRole('ADMIN_COMPLEX')")
    public Map<String, Object> manual(@RequestBody ManualBookingRequest request,
                                      @AuthenticationPrincipal UserPrincipal principal) {
        Booking booking = bookingService.createManualBooking(
                request.slotId(), request.titular(), request.telefono(), myComplex(principal).getId());
        return Map.of("bookingId", booking.getId(), "estado", booking.getStatus().name());
    }

    private SportsComplex myComplex(UserPrincipal principal) {
        return complexRepository.findByOwnerId(principal.getUser().getId())
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException(
                        "Tu usuario no tiene un complejo asociado"));
    }
}
