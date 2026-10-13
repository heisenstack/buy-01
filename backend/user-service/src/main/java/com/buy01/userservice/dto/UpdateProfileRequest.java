package com.buy01.userservice.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateProfileRequest {
    private String avatarMediaId;

    @Size(min = 2, max = 15, message = "Username must be between 2 and 15 characters.")
    @Pattern(regexp = "^[A-Za-z0-9]+$", message = "Username can contain only letters and numbers.")
    private String username;

    @Email(message = "Please enter a valid email address.")
    @Size(max = 20, message = "Email cannot exceed 20 characters.")
    private String email;
}
