package com.buy01.userservice.dto;

import com.buy01.userservice.model.User;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RegisterRequest {

    @NotBlank(message = "Username is required")
    @Size(min = 2, max = 15, message = "Username must be between 2 and 15 characters.")
    @Pattern(regexp = "^[A-Za-z0-9]+$", message = "Username can contain only letters and numbers.")
    private String username;

    @NotBlank(message = "Email is required")
    @Email(message = "Email must be a valid address")
    @Size(max = 20, message = "Email cannot exceed 20 characters.")
    private String email;

    @NotBlank(message = "Password is required")
    @Size(min = 6, message = "Password must be at least 6 characters")
    private String password;

    @NotNull(message = "Role is required: CLIENT or SELLER")
    private User.Role role;
}
