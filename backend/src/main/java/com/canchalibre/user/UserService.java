package com.canchalibre.user;

import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    public record ProfileResponse(Long id, String fullName, String email, String phone, String role) {
        static ProfileResponse from(User u) {
            return new ProfileResponse(u.getId(), u.getFullName(), u.getEmail(), u.getPhone(), u.getRole().name());
        }
    }

    public record UpdateProfileRequest(@Size(min = 2, max = 100) String fullName,
                                       @Size(min = 6, max = 20) String phone) {}

    @Transactional
    public ProfileResponse update(User user, UpdateProfileRequest request) {
        if (request.fullName() != null) user.setFullName(request.fullName());
        if (request.phone() != null) user.setPhone(request.phone());
        return ProfileResponse.from(userRepository.save(user));
    }
}
