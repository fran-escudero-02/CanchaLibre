package com.canchalibre.payment;

import com.canchalibre.user.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    @PostMapping("/checkout")
    public Map<String, Object> checkout(@RequestBody Map<String, Long> body,
                                        @AuthenticationPrincipal UserPrincipal principal) {
        return paymentService.checkout(body.get("bookingId"), principal.getUser().getId());
    }
}
