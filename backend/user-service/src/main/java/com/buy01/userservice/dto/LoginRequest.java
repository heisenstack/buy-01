package com.buy01.userservice.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LoginRequest {

    @NotBlank(message = "Email is required")
    @Email(message = "Email must be a valid address")
    @Size(max = 50, message = "Email cannot exceed 50 characters.")
    private String email;

    @NotBlank(message = "Password is required")
    private String password;
}
