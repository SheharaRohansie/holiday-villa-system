package com.holidayVilla.holiday_villa_system.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.time.LocalDate;

@Data
public class BookingRequestDTO {

    @NotNull(message = "Villa ID is required")
    private Long villaId;

    @NotNull(message = "Guest count is required")
    @Min(value = 1, message = "Guest count must be at least 1")
    private Integer guestCount;

    @NotBlank(message = "Meal plan is required")
    private String mealPlan;

    @NotNull(message = "Check-in date is required")
    private LocalDate checkInDate;

    @NotNull(message = "Check-out date is required")
    private LocalDate checkOutDate;

    // Promotion fields (optional)
    private Long appliedPromotionId;
    private Boolean promotionAccepted;
}
