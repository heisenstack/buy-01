package com.buy01.userservice.dto;

import com.buy01.userservice.model.User;
import lombok.Data;

@Data
public class UserResponse {
    private String id;
    private String email;
    private User.Role role;
    private String avatarUrl;
    private String username;

    public UserResponse(User user) {
        this.id = user.getId();
        this.username = user.getUsername();
        this.email = user.getEmail();
        this.role = user.getRole();
        this.avatarUrl = user.getAvatarUrl();
    }
}
