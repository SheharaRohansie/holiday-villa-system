package com.holidayVilla.holiday_villa_system.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class ReviewUpdateDTO {

    @Min(value = 1, message = "Rating must be at least 1")
    @Max(value = 5, message = "Rating must be at most 5")
    @NotNull(message = "Rating is required")
    private Integer rating;

    @NotBlank(message = "Review text is required")
    private String reviewText;
}
