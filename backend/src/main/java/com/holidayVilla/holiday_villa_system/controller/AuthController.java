package com.holidayVilla.holiday_villa_system.controller;

import com.holidayVilla.holiday_villa_system.dto.AuthResponse;
import com.holidayVilla.holiday_villa_system.dto.ForgotPasswordResetRequest;
import com.holidayVilla.holiday_villa_system.dto.LoginRequest;
import com.holidayVilla.holiday_villa_system.dto.RegisterRequest;
import com.holidayVilla.holiday_villa_system.dto.SendOtpRequest;
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

    @PostMapping("/send-otp")
    public ResponseEntity<Map<String, String>> sendOtp(@Valid @RequestBody SendOtpRequest request) {
        authService.sendRegistrationOtp(request.getEmail());
        return ResponseEntity.ok(Map.of("message", "OTP sent successfully"));
    }

    @PostMapping("/register")
    public ResponseEntity<Map<String, String>> register(@Valid @RequestBody RegisterRequest request) {
        authService.register(request);
        return ResponseEntity.ok(Map.of("message", "Registration successful"));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/forgot-password/send-otp")
    public ResponseEntity<Map<String, String>> forgotPasswordSendOtp(@Valid @RequestBody SendOtpRequest request) {
        authService.sendForgotPasswordOtp(request.getEmail());
        return ResponseEntity.ok(Map.of("message", "OTP sent successfully"));
    }

    @PostMapping("/forgot-password/reset")
    public ResponseEntity<Map<String, String>> forgotPasswordReset(@Valid @RequestBody ForgotPasswordResetRequest request) {
        authService.resetPassword(request.getEmail(), request.getOtp(), request.getNewPassword());
        return ResponseEntity.ok(Map.of("message", "Password reset successful"));
    }

    @PostMapping("/refresh")
    public ResponseEntity<Map<String, String>> refresh(Authentication authentication) {
        String email = authentication.getName();
        String token = authService.refreshToken(email);
        return ResponseEntity.ok(Map.of("token", token));
    }
}
