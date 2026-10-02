package com.buy01.userservice.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.assertEquals;

class JwtUtilTest {

    @Test
    void generateTokenIncludesUsernameClaim() {
        JwtUtil jwtUtil = new JwtUtil();
        ReflectionTestUtils.setField(jwtUtil, "secret", "my-super-secret-key-my-super-secret-key");
        ReflectionTestUtils.setField(jwtUtil, "expirationMs", 3600000L);

        String token = jwtUtil.generateToken("seller@example.com", "SELLER", "Alice Seller");

        SecretKey key = Keys.hmacShaKeyFor("my-super-secret-key-my-super-secret-key".getBytes(StandardCharsets.UTF_8));
        Claims claims = Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();

        assertEquals("Alice Seller", claims.get("username", String.class));
    }
}
