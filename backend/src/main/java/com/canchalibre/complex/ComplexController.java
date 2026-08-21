package com.canchalibre.complex;

import com.canchalibre.complex.ComplexService.ComplexResponse;
import com.canchalibre.complex.ComplexService.UpdateConfigRequest;
import com.canchalibre.user.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/complexes")
@RequiredArgsConstructor
public class ComplexController {

    private final ComplexService complexService;

    @GetMapping
    public Page<ComplexResponse> list(@ParameterObject Pageable pageable) {
        return complexService.list(pageable);
    }

    @GetMapping("/{id}")
    public ComplexResponse detail(@PathVariable Long id) {
        return complexService.detail(id);
    }

    @PutMapping("/{id}/config")
    @PreAuthorize("hasAnyRole('ADMIN_COMPLEX','SUPERADMIN')")
    public ComplexResponse updateConfig(@PathVariable Long id,
                                        @RequestBody UpdateConfigRequest request,
                                        @AuthenticationPrincipal UserPrincipal principal) {
        return complexService.updateConfig(id, request, principal.getUser());
    }
}
