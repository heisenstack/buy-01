package com.buy01.userservice.controller;

import com.buy01.userservice.dto.UpdateProfileRequest;
import com.buy01.userservice.dto.UserResponse;
import com.buy01.userservice.model.User;
import com.buy01.userservice.repository.UserRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequiredArgsConstructor
public class ProfileController {

    private final UserRepository userRepository;

    @GetMapping("/me")
    public ResponseEntity<?> me(Authentication authentication) {
        String email = authentication.getName();
        var user = userRepository.findByEmail(email).orElseThrow();
        return ResponseEntity.ok(new UserResponse(user));
    }

    @PutMapping("/me")
    public ResponseEntity<?> updateMe(@Valid @RequestBody UpdateProfileRequest request, Authentication authentication) {
        if (request == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "No profile data was provided."));
        }

        String currentEmail = authentication.getName();
        User user = userRepository.findByEmail(currentEmail).orElseThrow();

        String requestedUsername = request.getUsername() != null ? request.getUsername().trim() : null;
        String requestedEmail = request.getEmail() != null ? request.getEmail().trim() : null;
        String avatarMediaId = request.getAvatarMediaId() != null ? request.getAvatarMediaId().trim() : null;

        boolean hasChanges = requestedUsername != null || requestedEmail != null || avatarMediaId != null;
        if (!hasChanges) {
            return ResponseEntity.badRequest().body(Map.of("error", "No profile fields were provided to update."));
        }

        if (requestedUsername != null && requestedUsername.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Username cannot be empty."));
        }

        if (requestedUsername != null && requestedUsername.length() < 2) {
            return ResponseEntity.badRequest().body(Map.of("error", "Username must be at least 2 characters long."));
        }

        if (requestedEmail != null && !requestedEmail.equals(currentEmail)) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Email address cannot be changed."));
        }

        if (requestedUsername != null) {
            user.setUsername(requestedUsername);
        }

        if (avatarMediaId != null && !avatarMediaId.isBlank()) {
            user.setAvatarUrl("/api/media/media/images/" + avatarMediaId);
        }

        User saved = userRepository.save(user);
        return ResponseEntity.ok(new UserResponse(saved));
    }
}