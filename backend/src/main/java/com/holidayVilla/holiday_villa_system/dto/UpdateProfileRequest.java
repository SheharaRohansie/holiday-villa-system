package com.holidayVilla.holiday_villa_system.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class UpdateProfileRequest {

    @Email(message = "Invalid email format")
    private String email;

    @Size(min = 8, message = "Password must be at least 8 characters")
    @Pattern(
        regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&#^()_+\\-=\\[\\]{};':\"\\\\|,.<>/?]).{8,}$",
        message = "Password must contain at least 1 uppercase, 1 lowercase, 1 digit, and 1 special character"
    )
    private String newPassword;

    private String currentPassword;
}
