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
    void updateMe_returnsConflictWhenEmailAlreadyExists() {
        User currentUser = new User("Alice", "alice@test.com", "hashed", User.Role.CLIENT);
        Authentication authentication = mock(Authentication.class);
        when(authentication.getName()).thenReturn("alice@test.com");
        when(userRepository.findByEmail("alice@test.com")).thenReturn(Optional.of(currentUser));
        when(userRepository.findByEmail("taken@test.com")).thenReturn(Optional.of(new User("Bob", "taken@test.com", "hashed", User.Role.CLIENT)));

        UpdateProfileRequest request = new UpdateProfileRequest();
        request.setEmail("taken@test.com");

        ResponseEntity<?> response = profileController.updateMe(request, authentication);

        assertEquals(409, response.getStatusCode().value());
        assertTrue(((Map<?, ?>) response.getBody()).get("error").toString().contains("already"));
    }

    @Test
    void updateMe_updatesUsernameAndEmailWhenValid() {
        User currentUser = new User("Alice", "alice@test.com", "hashed", User.Role.CLIENT);
        Authentication authentication = mock(Authentication.class);
        when(authentication.getName()).thenReturn("alice@test.com");
        when(userRepository.findByEmail("alice@test.com")).thenReturn(Optional.of(currentUser));
        when(userRepository.findByEmail("new-alice@test.com")).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UpdateProfileRequest request = new UpdateProfileRequest();
        request.setUsername("Alice Updated");
        request.setEmail("new-alice@test.com");

        ResponseEntity<?> response = profileController.updateMe(request, authentication);

        assertEquals(200, response.getStatusCode().value());
        UserResponse savedUser = (UserResponse) response.getBody();
        assertNotNull(savedUser);
        assertEquals("Alice Updated", savedUser.getUsername());
        assertEquals("new-alice@test.com", savedUser.getEmail());
    }
}
