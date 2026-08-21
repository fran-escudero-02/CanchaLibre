package com.canchalibre.court;

import com.canchalibre.court.CourtService.CourtRequest;
import com.canchalibre.court.CourtService.CourtResponse;
import com.canchalibre.user.UserPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/courts")
@RequiredArgsConstructor
public class CourtController {

    private final CourtService courtService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN_COMPLEX','SUPERADMIN')")
    public List<CourtResponse> myCourts(@AuthenticationPrincipal UserPrincipal principal) {
        return courtService.myCourts(principal.getUser());
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN_COMPLEX','SUPERADMIN')")
    public ResponseEntity<CourtResponse> create(@Valid @RequestBody CourtRequest request,
                                                @AuthenticationPrincipal UserPrincipal principal) {
        CourtResponse created = courtService.create(request, principal.getUser());
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN_COMPLEX','SUPERADMIN')")
    public CourtResponse update(@PathVariable Long id, @Valid @RequestBody CourtRequest request,
                                @AuthenticationPrincipal UserPrincipal principal) {
        return courtService.update(id, request, principal.getUser());
    }
}
