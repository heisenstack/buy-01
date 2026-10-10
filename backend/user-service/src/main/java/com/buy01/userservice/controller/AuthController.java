package com.buy01.userservice.controller;

import com.buy01.userservice.dto.LoginRequest;
import com.buy01.userservice.dto.RegisterRequest;
import com.buy01.userservice.dto.UserResponse;
import com.buy01.userservice.model.User;
import com.buy01.userservice.repository.UserRepository;
import com.buy01.userservice.security.JwtUtil;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserRepository userRepository;

    private final PasswordEncoder passwordEncoder;

    private final JwtUtil jwtUtil;

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
        var userOpt = userRepository.findByEmail(request.getEmail());

        if (userOpt.isEmpty() || !passwordEncoder.matches(request.getPassword(), userOpt.get().getPassword())) {
            return ResponseEntity.status(401).body(Map.of("error", "Invalid email or password"));
        }

        User user = userOpt.get();
        String token = jwtUtil.generateToken(user.getEmail(), user.getRole().name(), user.getUsername());

        return ResponseEntity.ok(Map.of("token", token));
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request) {
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            return ResponseEntity.status(409).body(Map.of("error", "Email already registered"));
        }

        String hashedPassword = passwordEncoder.encode(request.getPassword());
        User user = new User(request.getUsername(), request.getEmail(), hashedPassword, request.getRole());
        User saved = userRepository.save(user);

        return ResponseEntity.ok(new UserResponse(saved));
    }
}