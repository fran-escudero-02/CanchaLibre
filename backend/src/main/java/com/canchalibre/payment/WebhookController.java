package com.canchalibre.payment;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/webhooks/mercadopago")
@RequiredArgsConstructor
public class WebhookController {

    private final WebhookService webhookService;

    public record WebhookPayload(String type, String action, Data data) {
        public record Data(Long id) {}
    }

    @PostMapping
    public ResponseEntity<Void> handle(@RequestBody WebhookPayload payload) {
        if (payload != null && payload.data() != null && payload.data().id() != null) {
            webhookService.processPaymentNotification(payload.data().id());
        }
        return ResponseEntity.ok().build();
    }
}
