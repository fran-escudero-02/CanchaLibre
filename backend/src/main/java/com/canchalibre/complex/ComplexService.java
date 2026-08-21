package com.canchalibre.complex;

import com.canchalibre.user.Role;
import com.canchalibre.user.User;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DateTimeException;
import java.time.LocalTime;

@Service
@RequiredArgsConstructor
public class ComplexService {

    private static final int MIN_SLOT_MINUTES = 15;
    private static final int MAX_SLOT_MINUTES = 240;

    private final SportsComplexRepository repository;

    public record ComplexResponse(Long id, String name, String address, String phone,
                                   String openTime, String closeTime, Integer slotDurationMinutes) {
        static ComplexResponse from(SportsComplex c) {
            return new ComplexResponse(c.getId(), c.getName(), c.getAddress(), c.getPhone(),
                    c.getOpenTime().toString(), c.getCloseTime().toString(), c.getSlotDurationMinutes());
        }
    }

    public record UpdateConfigRequest(String openTime, String closeTime, Integer slotDurationMinutes) {}

    @Transactional(readOnly = true)
    public Page<ComplexResponse> list(Pageable pageable) {
        return repository.findByIsActiveTrue(pageable).map(ComplexResponse::from);
    }

    @Transactional(readOnly = true)
    public ComplexResponse detail(Long id) {
        return repository.findById(id)
                .map(ComplexResponse::from)
                .orElseThrow(() -> new EntityNotFoundException("Complejo no encontrado"));
    }

    @Transactional
    public ComplexResponse updateConfig(Long id, UpdateConfigRequest request, User requester) {
        SportsComplex complex = repository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Complejo no encontrado"));
        boolean owner = complex.getOwner().getId().equals(requester.getId());
        if (!owner && requester.getRole() != Role.ROLE_SUPERADMIN) {
            throw new AccessDeniedException("No sos propietario de este complejo");
        }

        LocalTime open = complex.getOpenTime();
        LocalTime close = complex.getCloseTime();
        int duration = complex.getSlotDurationMinutes();
        if (request.openTime() != null) open = parseTime(request.openTime(), "openTime");
        if (request.closeTime() != null) close = parseTime(request.closeTime(), "closeTime");
        if (request.slotDurationMinutes() != null) duration = request.slotDurationMinutes();

        // openTime == closeTime generaria una grilla de 24 hs sin cortes; se rechaza.
        if (open.equals(close)) {
            throw new IllegalArgumentException("El horario de apertura y cierre no pueden coincidir");
        }
        if (duration < MIN_SLOT_MINUTES || duration > MAX_SLOT_MINUTES) {
            throw new IllegalArgumentException("La duracion del turno debe estar entre "
                    + MIN_SLOT_MINUTES + " y " + MAX_SLOT_MINUTES + " minutos");
        }

        complex.setOpenTime(open);
        complex.setCloseTime(close);
        complex.setSlotDurationMinutes(duration);
        return ComplexResponse.from(repository.save(complex));
    }

    private LocalTime parseTime(String value, String field) {
        try {
            return LocalTime.parse(value);
        } catch (DateTimeException e) {
            throw new IllegalArgumentException(field + ": formato de hora invalido (se espera HH:mm)");
        }
    }
}
