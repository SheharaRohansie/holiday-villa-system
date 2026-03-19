package com.holidayVilla.holiday_villa_system.service;

import com.holidayVilla.holiday_villa_system.dto.AuthResponse;
import com.holidayVilla.holiday_villa_system.dto.LoginRequest;
import com.holidayVilla.holiday_villa_system.dto.RegisterRequest;
import com.holidayVilla.holiday_villa_system.entity.Role;
import com.holidayVilla.holiday_villa_system.entity.User;
import com.holidayVilla.holiday_villa_system.exception.EmailAlreadyExistsException;
import com.holidayVilla.holiday_villa_system.repository.UserRepository;
import com.holidayVilla.holiday_villa_system.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;
    private final UserDetailsService userDetailsService;

    public AuthResponse register(RegisterRequest request) {
        // Validate password confirmation
        if (!request.getPassword().equals(request.getConfirmPassword())) {
            throw new IllegalArgumentException("Passwords do not match");
        }

        // Check email uniqueness
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new EmailAlreadyExistsException("Email already in use: " + request.getEmail());
        }

        // Validate NIC / Passport
        validateIdentityDocument(request.getNationality(), request.getNic(), request.getPassportNumber());

        User user = User.builder()
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .nationality(request.getNationality())
                .nic(request.getNic())
                .passportNumber(request.getPassportNumber())
                .phoneNumber(request.getPhoneNumber())
                .role(Role.GUEST)
                .build();

        userRepository.save(user);

        UserDetails userDetails = userDetailsService.loadUserByUsername(user.getEmail());
        String token = jwtUtil.generateToken(userDetails);

        return AuthResponse.builder()
                .token(token)
                .role(user.getRole().name())
                .userId(user.getId())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .build();
    }

    public AuthResponse login(LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
        );

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found"));

        UserDetails userDetails = userDetailsService.loadUserByUsername(user.getEmail());
        String token = jwtUtil.generateToken(userDetails);

        return AuthResponse.builder()
                .token(token)
                .role(user.getRole().name())
                .userId(user.getId())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .build();
    }

    public String refreshToken(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        UserDetails userDetails = userDetailsService.loadUserByUsername(user.getEmail());
        return jwtUtil.generateToken(userDetails);
    }

    private void validateIdentityDocument(String nationality, String nic, String passportNumber) {
        if ("Sri Lanka".equalsIgnoreCase(nationality)) {
            if (nic == null || nic.isBlank()) {
                throw new IllegalArgumentException("NIC is required for Sri Lankan nationals");
            }
        } else {
            if (passportNumber == null || passportNumber.isBlank()) {
                throw new IllegalArgumentException("Passport number is required for non-Sri Lankan nationals");
            }
        }
    }
}
