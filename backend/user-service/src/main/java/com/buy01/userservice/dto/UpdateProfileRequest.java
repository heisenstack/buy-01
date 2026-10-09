package com.buy01.userservice.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Pattern;

public class UpdateProfileRequest {
    private String avatarMediaId;

    @Pattern(regexp = "^(?=.{2,50}$)(?!\\s).*(?<!\\s)$", message = "Username must be 2-50 characters and cannot start or end with spaces.")
    private String username;

    @Email(message = "Please enter a valid email address.")
    private String email;

    public String getAvatarMediaId() { return avatarMediaId; }
    public void setAvatarMediaId(String avatarMediaId) { this.avatarMediaId = avatarMediaId; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
}