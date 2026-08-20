package com.canchalibre.payment;

import com.canchalibre.booking.Booking;
import com.mercadopago.MercadoPagoConfig;
import com.mercadopago.client.payment.PaymentClient;
import com.mercadopago.client.preference.PreferenceBackUrlsRequest;
import com.mercadopago.client.preference.PreferenceClient;
import com.mercadopago.client.preference.PreferenceItemRequest;
import com.mercadopago.client.preference.PreferenceRequest;
import com.mercadopago.exceptions.MPApiException;
import com.mercadopago.exceptions.MPException;
import com.mercadopago.resources.payment.Payment;
import com.mercadopago.resources.payment.PaymentRefund;
import com.mercadopago.resources.preference.Preference;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;

@Component
public class MercadoPagoGateway {

    @Value("${mercadopago.access-token:}")
    private String accessToken;

    @Value("${app.frontend-url}")
    private String frontendUrl;

    public String createDepositPreference(Booking booking) {
        try {
            MercadoPagoConfig.setAccessToken(accessToken);
            PreferenceItemRequest item = PreferenceItemRequest.builder()
                    .id(booking.getId().toString())
                    .title("Sena de reserva - " + booking.getComplex().getName())
                    .quantity(1)
                    .unitPrice(booking.getDepositAmount())
                    .currencyId("ARS")
                    .build();
            PreferenceBackUrlsRequest backUrls = PreferenceBackUrlsRequest.builder()
                    .success(frontendUrl + "/reserva/exito?bookingId=" + booking.getId())
                    .failure(frontendUrl + "/reserva/error?bookingId=" + booking.getId())
                    .pending(frontendUrl + "/reserva/exito?bookingId=" + booking.getId())
                    .build();
            PreferenceRequest request = PreferenceRequest.builder()
                    .items(List.of(item))
                    .externalReference(booking.getId().toString())
                    .backUrls(backUrls)
                    .build();
            Preference preference = new PreferenceClient().create(request);
            return preference.getInitPoint();
        } catch (MPException | MPApiException e) {
            throw new IllegalStateException("No se pudo crear la preferencia de pago en Mercado Pago", e);
        }
    }

    public Payment getPayment(Long mpPaymentId) throws MPException, MPApiException {
        MercadoPagoConfig.setAccessToken(accessToken);
        return new PaymentClient().get(mpPaymentId);
    }

    public PaymentRefund refund(Long mpPaymentId, BigDecimal amount) throws MPException, MPApiException {
        MercadoPagoConfig.setAccessToken(accessToken);
        return new PaymentClient().refund(mpPaymentId, amount);
    }
}
