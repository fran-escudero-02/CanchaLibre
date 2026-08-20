package com.canchalibre.user;

import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/me")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;

    public record ProfileResponse(Long id, String fullName, String email, String phone, String role) {
        static ProfileResponse from(User u) {
            return new ProfileResponse(u.getId(), u.getFullName(), u.getEmail(), u.getPhone(), u.getRole().name());
        }
    }

    public record UpdateProfileRequest(String fullName, String phone) {}

    @GetMapping
    public ProfileResponse profile(@AuthenticationPrincipal UserPrincipal principal) {
        return ProfileResponse.from(principal.getUser());
    }

    @PutMapping
    public ProfileResponse update(@RequestBody UpdateProfileRequest request,
                                  @AuthenticationPrincipal UserPrincipal principal) {
        User user = principal.getUser();
        if (request.fullName() != null) user.setFullName(request.fullName());
        if (request.phone() != null) user.setPhone(request.phone());
        return ProfileResponse.from(userRepository.save(user));
    }
}
