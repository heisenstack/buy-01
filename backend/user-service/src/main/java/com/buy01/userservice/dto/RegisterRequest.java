package com.buy01.userservice.dto;

import com.buy01.userservice.model.User;

public class RegisterRequest {
    private String email;
    private String password;
    private User.Role role;
    private String username;

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
    public User.Role getRole() { return role; }
    public void setRole(User.Role role) { this.role = role; }
    public String getUsername() { return username; }
public void setUsername(String username) { this.username = username; }
}