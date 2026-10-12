package com.buy01.userservice.controller;

import com.buy01.userservice.dto.UpdateProfileRequest;
import com.buy01.userservice.dto.UserResponse;
import com.buy01.userservice.model.User;
import com.buy01.userservice.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;

import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProfileControllerTest {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private ProfileController profileController;

    @Test
    void updateMe_rejectsEmailChange() {
        User currentUser = new User("Alice", "alice@test.com", "hashed", User.Role.CLIENT);
        Authentication authentication = mock(Authentication.class);
        when(authentication.getName()).thenReturn("alice@test.com");
        when(userRepository.findByEmail("alice@test.com")).thenReturn(Optional.of(currentUser));

        UpdateProfileRequest request = new UpdateProfileRequest();
        request.setEmail("new-alice@test.com");

        ResponseEntity<?> response = profileController.updateMe(request, authentication);

        assertEquals(400, response.getStatusCode().value());
        assertEquals("Email address cannot be changed.", ((Map<?, ?>) response.getBody()).get("error"));
        assertEquals("alice@test.com", currentUser.getEmail());
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void updateMe_updatesUsernameWithoutChangingEmail() {
        User currentUser = new User("Alice", "alice@test.com", "hashed", User.Role.CLIENT);
        Authentication authentication = mock(Authentication.class);
        when(authentication.getName()).thenReturn("alice@test.com");
        when(userRepository.findByEmail("alice@test.com")).thenReturn(Optional.of(currentUser));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UpdateProfileRequest request = new UpdateProfileRequest();
        request.setUsername("Alice Updated");

        ResponseEntity<?> response = profileController.updateMe(request, authentication);

        assertEquals(200, response.getStatusCode().value());
        UserResponse savedUser = (UserResponse) response.getBody();
        assertNotNull(savedUser);
        assertEquals("Alice Updated", savedUser.getUsername());
        assertEquals("alice@test.com", savedUser.getEmail());
    }
}
