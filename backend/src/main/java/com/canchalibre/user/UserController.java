package com.canchalibre.user;

import com.canchalibre.user.UserService.ProfileResponse;
import com.canchalibre.user.UserService.UpdateProfileRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/me")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping
    public ProfileResponse profile(@AuthenticationPrincipal UserPrincipal principal) {
        return ProfileResponse.from(principal.getUser());
    }

    @PutMapping
    public ProfileResponse update(@Valid @RequestBody UpdateProfileRequest request,
                                  @AuthenticationPrincipal UserPrincipal principal) {
        return userService.update(principal.getUser(), request);
    }
}
