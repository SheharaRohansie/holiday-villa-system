package com.holidayVilla.holiday_villa_system.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VillaPricingRequestDTO {

    @NotNull(message = "Guest count is required")
    @Min(value = 1, message = "Guest count must be at least 1")
    private Integer guestCount;

    @NotBlank(message = "Meal plan is required")
    private String mealPlan;

    @NotNull(message = "Price is required")
    @Positive(message = "Price must be positive")
    private Double price;
}
