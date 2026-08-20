package com.canchalibre.complex;

import com.canchalibre.user.Role;
import com.canchalibre.user.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalTime;
import java.util.List;

@RestController
@RequestMapping("/api/v1/complexes")
@RequiredArgsConstructor
public class ComplexController {

    private final SportsComplexRepository repository;

    public record ComplexResponse(Long id, String name, String address, String phone,
                                   String openTime, String closeTime, Integer slotDurationMinutes) {
        static ComplexResponse from(SportsComplex c) {
            return new ComplexResponse(c.getId(), c.getName(), c.getAddress(), c.getPhone(),
                    c.getOpenTime().toString(), c.getCloseTime().toString(), c.getSlotDurationMinutes());
        }
    }

    public record UpdateConfigRequest(String openTime, String closeTime, Integer slotDurationMinutes) {}

    @GetMapping
    public List<ComplexResponse> list() {
        return repository.findByIsActiveTrue().stream().map(ComplexResponse::from).toList();
    }

    @GetMapping("/{id}")
    public ComplexResponse detail(@PathVariable Long id) {
        return ComplexResponse.from(repository.findById(id).orElseThrow());
    }

    @PutMapping("/{id}/config")
    @PreAuthorize("hasAnyRole('ADMIN_COMPLEX','SUPERADMIN')")
    public ResponseEntity<ComplexResponse> updateConfig(@PathVariable Long id,
                                                        @RequestBody UpdateConfigRequest request,
                                                        @AuthenticationPrincipal UserPrincipal principal) {
        SportsComplex complex = repository.findById(id).orElseThrow();
        boolean owner = complex.getOwner().getId().equals(principal.getUser().getId());
        if (!owner && principal.getUser().getRole() != Role.ROLE_SUPERADMIN) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        if (request.openTime() != null) complex.setOpenTime(LocalTime.parse(request.openTime()));
        if (request.closeTime() != null) complex.setCloseTime(LocalTime.parse(request.closeTime()));
        if (request.slotDurationMinutes() != null) complex.setSlotDurationMinutes(request.slotDurationMinutes());
        return ResponseEntity.ok(ComplexResponse.from(repository.save(complex)));
    }
}
