package com.buy01.userservice.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateProfileRequest {
    private String avatarMediaId;

    @Pattern(regexp = "^(?=.{2,50}$)(?!\\s).*(?<!\\s)$", message = "Username must be 2-50 characters and cannot start or end with spaces.")
    private String username;

    @Email(message = "Please enter a valid email address.")
    private String email;
}
