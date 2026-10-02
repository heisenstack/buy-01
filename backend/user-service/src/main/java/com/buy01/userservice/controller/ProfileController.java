package com.buy01.userservice.controller;

import com.buy01.userservice.dto.UpdateProfileRequest;
import com.buy01.userservice.model.User;
import com.buy01.userservice.dto.UserResponse;
import com.buy01.userservice.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ProfileController {

    @Autowired
    private UserRepository userRepository;

    @GetMapping("/me")
    public ResponseEntity<?> me(Authentication authentication) {
        String email = authentication.getName();
        var user = userRepository.findByEmail(email).orElseThrow();
        return ResponseEntity.ok(new UserResponse(user));
    }

    @PutMapping("/me")
    public ResponseEntity<?> updateMe(@RequestBody UpdateProfileRequest request, Authentication authentication) {
        String email = authentication.getName();
        var user = userRepository.findByEmail(email).orElseThrow();

        if (request.getAvatarMediaId() != null && !request.getAvatarMediaId().isBlank()) {
            user.setAvatarUrl("/api/media/media/images/" + request.getAvatarMediaId());
        }

        User saved = userRepository.save(user);
        return ResponseEntity.ok(new UserResponse(saved));
    }
}