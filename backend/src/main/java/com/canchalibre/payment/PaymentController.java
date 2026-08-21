package com.canchalibre.payment;

import com.canchalibre.user.UserPrincipal;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    public record CheckoutRequest(@NotNull Long bookingId) {}

    @PostMapping("/checkout")
    public Map<String, Object> checkout(@Valid @RequestBody CheckoutRequest request,
                                        @AuthenticationPrincipal UserPrincipal principal) {
        return paymentService.checkout(request.bookingId(), principal.getUser().getId());
    }
}
