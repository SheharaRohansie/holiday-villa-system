package com.holidayVilla.holiday_villa_system.dto;

import jakarta.validation.constraints.*;
import lombok.*;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VillaRequestDTO {

    @NotBlank(message = "Villa name is required")
    private String name;

    @NotBlank(message = "Description is required")
    private String description;

    @NotNull(message = "Price per night is required")
    @Positive(message = "Price must be positive")
    private Double pricePerNight;

    private Integer maxGuests;

    // Passed as a list; stored joined by commas
    private List<String> amenities;

    @NotNull(message = "At least one image URL is required")
    @Size(min = 1, message = "At least one image URL is required")
    private List<@NotBlank(message = "Image URL must not be blank") String> imageUrls;
}
