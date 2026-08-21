package com.canchalibre.court;

import com.canchalibre.complex.SportsComplex;
import com.canchalibre.complex.SportsComplexRepository;
import com.canchalibre.user.User;
import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CourtService {

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

    @Transactional(readOnly = true)
    public List<CourtResponse> myCourts(User owner) {
        SportsComplex complex = myComplex(owner);
        return courtRepository.findByComplexIdAndIsActiveTrue(complex.getId())
                .stream().map(CourtResponse::from).toList();
    }

    @Transactional
    public CourtResponse create(@Valid CourtRequest request, User owner) {
        SportsComplex complex = myComplex(owner);
        Court court = new Court();
        apply(court, request);
        court.setComplex(complex);
        return CourtResponse.from(courtRepository.save(court));
    }

    @Transactional
    public CourtResponse update(Long id, @Valid CourtRequest request, User owner) {
        Court court = courtRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Cancha no encontrada"));
        if (!court.getComplex().getOwner().getId().equals(owner.getId())) {
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

    private SportsComplex myComplex(User owner) {
        return complexRepository.findByOwnerId(owner.getId())
                .orElseThrow(() -> new EntityNotFoundException("Tu usuario no tiene un complejo asociado"));
    }
}
