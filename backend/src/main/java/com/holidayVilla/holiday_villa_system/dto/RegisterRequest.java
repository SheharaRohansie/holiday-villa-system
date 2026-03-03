package com.holidayVilla.holiday_villa_system.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class RegisterRequest {

    @NotBlank(message = "First name is required")
    private String firstName;

    @NotBlank(message = "Last name is required")
    private String lastName;

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    private String email;

    @NotBlank(message = "Phone number is required")
    @Pattern(regexp = "^\\+?[0-9]{8,15}$", message = "Phone number must be 8-15 digits")
    private String phoneNumber;

    @NotBlank(message = "Nationality is required")
    private String nationality;

    private String nic;

    private String passportNumber;

    @NotBlank(message = "Password is required")
    @Size(min = 8, message = "Password must be at least 8 characters")
    @Pattern(
        regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&#^()_+\\-=\\[\\]{};':\"\\\\|,.<>/?]).{8,}$",
        message = "Password must contain at least 1 uppercase, 1 lowercase, 1 digit, and 1 special character"
    )
    private String password;

    @NotBlank(message = "Confirm password is required")
    private String confirmPassword;
}
