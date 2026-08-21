package com.canchalibre.booking;

import com.canchalibre.booking.BookingService.BookingInitiateDTO;
import com.canchalibre.booking.BookingService.BookingInitiateRequest;
import com.canchalibre.booking.BookingService.MyBookingDTO;
import com.canchalibre.user.UserPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/bookings")
@RequiredArgsConstructor
public class BookingController {

    private final BookingService bookingService;

    @PostMapping("/initiate")
    public BookingInitiateDTO initiate(@Valid @RequestBody BookingInitiateRequest request,
                                       @AuthenticationPrincipal UserPrincipal principal) {
        return bookingService.initiate(request.slotId(), principal.getUser());
    }

    @GetMapping("/mis-reservas")
    public Page<MyBookingDTO> myBookings(@ParameterObject Pageable pageable,
                                         @AuthenticationPrincipal UserPrincipal principal) {
        return bookingService.myBookings(principal.getUser().getId(), pageable);
    }

    @GetMapping("/{id}")
    public MyBookingDTO detail(@PathVariable Long id, @AuthenticationPrincipal UserPrincipal principal) {
        return bookingService.detail(id, principal.getUser());
    }

    @PostMapping("/{id}/cancel")
    public Map<String, String> cancel(@PathVariable Long id,
                                      @AuthenticationPrincipal UserPrincipal principal) {
        return Map.of("resultado", bookingService.cancel(id, principal.getUser()));
    }
}
