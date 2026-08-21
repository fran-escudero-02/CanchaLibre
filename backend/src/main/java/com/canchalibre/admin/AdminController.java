package com.canchalibre.admin;

import com.canchalibre.admin.AgendaService.AgendaDTO;
import com.canchalibre.booking.Booking;
import com.canchalibre.booking.BookingService;
import com.canchalibre.complex.SportsComplex;
import com.canchalibre.complex.SportsComplexRepository;
import com.canchalibre.slot.SlotService;
import com.canchalibre.user.UserPrincipal;
import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
public class AdminController {

    private final SportsComplexRepository complexRepository;
    private final AgendaService agendaService;
    private final SlotService slotService;
    private final BookingService bookingService;

    public record BlockSlotRequest(@NotBlank String motivo) {}

    public record ManualBookingRequest(@NotNull Long slotId, @NotBlank String titular, String telefono) {}

    public record UpdateManualRequest(@NotBlank String titular, String telefono) {}

    @GetMapping("/agenda")
    @PreAuthorize("hasRole('ADMIN_COMPLEX')")
    public AgendaDTO agenda(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fecha,
            @AuthenticationPrincipal UserPrincipal principal) {
        return agendaService.dailyAgenda(myComplex(principal), fecha);
    }

    @PostMapping("/slots/{slotId}/bloquear")
    @PreAuthorize("hasRole('ADMIN_COMPLEX')")
    public ResponseEntity<Void> block(@PathVariable Long slotId,
                                      @Valid @RequestBody BlockSlotRequest request,
                                      @AuthenticationPrincipal UserPrincipal principal) {
        slotService.blockSlot(slotId, request.motivo(), myComplex(principal).getId());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/slots/{slotId}/desbloquear")
    @PreAuthorize("hasRole('ADMIN_COMPLEX')")
    public ResponseEntity<Void> unblock(@PathVariable Long slotId,
                                        @AuthenticationPrincipal UserPrincipal principal) {
        slotService.unblockSlot(slotId, myComplex(principal).getId());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/bookings/manual")
    @PreAuthorize("hasRole('ADMIN_COMPLEX')")
    public ManualBookingResponse manual(@Valid @RequestBody ManualBookingRequest request,
                                        @AuthenticationPrincipal UserPrincipal principal) {
        Booking booking = bookingService.createManualBooking(
                request.slotId(), request.titular(), request.telefono(),
                myComplex(principal).getId(), principal.getUser());
        return new ManualBookingResponse(booking.getId(), booking.getStatus().name());
    }

    @PutMapping("/bookings/{bookingId}/manual")
    @PreAuthorize("hasRole('ADMIN_COMPLEX')")
    public ManualBookingResponse updateManual(@PathVariable Long bookingId,
                                              @Valid @RequestBody UpdateManualRequest request,
                                              @AuthenticationPrincipal UserPrincipal principal) {
        Booking booking = bookingService.updateManualBooking(
                bookingId, request.titular(), request.telefono(), myComplex(principal).getId());
        return new ManualBookingResponse(booking.getId(), booking.getStatus().name());
    }

    public record ManualBookingResponse(Long bookingId, String estado) {}

    private SportsComplex myComplex(UserPrincipal principal) {
        return complexRepository.findByOwnerId(principal.getUser().getId())
                .orElseThrow(() -> new EntityNotFoundException("Tu usuario no tiene un complejo asociado"));
    }
}
