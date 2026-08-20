package com.canchalibre.court;

import com.canchalibre.complex.SportsComplex;
import com.canchalibre.complex.SportsComplexRepository;
import com.canchalibre.user.UserPrincipal;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/v1/courts")
@RequiredArgsConstructor
public class CourtController {

    private final CourtRepository courtRepository;
    private final SportsComplexRepository complexRepository;

    public record CourtRequest(
            @NotBlank String name,
            @NotNull Sport sport,
            @NotNull Surface surface,
            @NotNull Boolean isIndoor,
            @NotNull @DecimalMin("1") BigDecimal price,
            @NotNull @Min(1) @Max(100) Integer depositPercentage) {}

    public record CourtResponse(Long id, String name, Sport sport, Surface surface,
                                Boolean isIndoor, BigDecimal price, Integer depositPercentage) {
        static CourtResponse from(Court c) {
            return new CourtResponse(c.getId(), c.getName(), c.getSport(), c.getSurface(),
                    c.getIsIndoor(), c.getPrice(), c.getDepositPercentage());
        }
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN_COMPLEX','SUPERADMIN')")
    public List<CourtResponse> myCourts(@AuthenticationPrincipal UserPrincipal principal) {
        SportsComplex complex = myComplex(principal);
        return courtRepository.findByComplexIdAndIsActiveTrue(complex.getId())
                .stream().map(CourtResponse::from).toList();
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN_COMPLEX','SUPERADMIN')")
    public CourtResponse create(@Valid @RequestBody CourtRequest request,
                                @AuthenticationPrincipal UserPrincipal principal) {
        SportsComplex complex = myComplex(principal);
        Court court = new Court();
        apply(court, request);
        court.setComplex(complex);
        return CourtResponse.from(courtRepository.save(court));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN_COMPLEX','SUPERADMIN')")
    public CourtResponse update(@PathVariable Long id, @Valid @RequestBody CourtRequest request,
                                @AuthenticationPrincipal UserPrincipal principal) {
        Court court = courtRepository.findById(id).orElseThrow();
        if (!court.getComplex().getOwner().getId().equals(principal.getUser().getId())) {
            throw new AccessDeniedException("Cancha ajena");
        }
        apply(court, request);
        return CourtResponse.from(courtRepository.save(court));
    }

    private void apply(Court court, CourtRequest r) {
        court.setName(r.name());
        court.setSport(r.sport());
        court.setSurface(r.surface());
        court.setIsIndoor(r.isIndoor());
        court.setPrice(r.price());
        court.setDepositPercentage(r.depositPercentage());
    }

    private SportsComplex myComplex(UserPrincipal principal) {
        return complexRepository.findByOwnerId(principal.getUser().getId())
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException(
                        "Tu usuario no tiene un complejo asociado"));
    }
}
