package com.holidayVilla.holiday_villa_system.controller;

import com.holidayVilla.holiday_villa_system.dto.AuthResponse;
import com.holidayVilla.holiday_villa_system.dto.LoginRequest;
import com.holidayVilla.holiday_villa_system.dto.RegisterRequest;
import com.holidayVilla.holiday_villa_system.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.ok(authService.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/refresh")
    public ResponseEntity<Map<String, String>> refresh(Authentication authentication) {
        String email = authentication.getName();
        String token = authService.refreshToken(email);
        return ResponseEntity.ok(Map.of("token", token));
    }
}
