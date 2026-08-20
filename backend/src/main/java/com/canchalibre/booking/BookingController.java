package com.canchalibre.booking;

import com.canchalibre.user.Role;
import com.canchalibre.user.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/bookings")
@RequiredArgsConstructor
public class BookingController {

    private final BookingService bookingService;
    private final BookingRepository bookingRepository;

    public record MyBookingDTO(Long id, String complejo, String cancha, Instant inicio,
                               BigDecimal sena, BigDecimal saldoMostrador, String estado, Instant expiraEn) {
        static MyBookingDTO from(Booking b) {
            return new MyBookingDTO(b.getId(), b.getComplex().getName(),
                    b.getSlot().getCourt().getName(), b.getSlot().getStartAt(),
                    b.getDepositAmount(), b.getRemainingAmount(), b.getStatus().name(),
                    b.getSlot().getLockExpiresAt());
        }
    }

    @PostMapping("/initiate")
    public BookingService.BookingInitiateDTO initiate(@RequestBody Map<String, Long> body,
                                                      @AuthenticationPrincipal UserPrincipal principal) {
        return bookingService.initiate(body.get("slotId"), principal.getUser());
    }

    @GetMapping("/mis-reservas")
    @Transactional(readOnly = true)
    public List<MyBookingDTO> myBookings(@AuthenticationPrincipal UserPrincipal principal) {
        return bookingRepository.findByPlayerIdOrderBySlotStartAtAsc(principal.getUser().getId())
                .stream().map(MyBookingDTO::from).toList();
    }

    @GetMapping("/{id}")
    @Transactional(readOnly = true)
    public MyBookingDTO detail(@PathVariable Long id, @AuthenticationPrincipal UserPrincipal principal) {
        Booking booking = bookingRepository.findById(id).orElseThrow();
        boolean owner = booking.getPlayer() != null
                && booking.getPlayer().getId().equals(principal.getUser().getId());
        boolean complexAdmin = booking.getComplex().getOwner().getId().equals(principal.getUser().getId());
        if (!owner && !complexAdmin && principal.getUser().getRole() != Role.ROLE_SUPERADMIN) {
            throw new AccessDeniedException("No autorizado");
        }
        return MyBookingDTO.from(booking);
    }

    @PostMapping("/{id}/cancel")
    public Map<String, String> cancel(@PathVariable Long id,
                                      @AuthenticationPrincipal UserPrincipal principal) {
        return Map.of("resultado", bookingService.cancel(id, principal.getUser()));
    }
}
