package com.holidayVilla.holiday_villa_system.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.*;
import jakarta.validation.Valid;
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

    @NotBlank(message = "Villa type is required")
    private String type;

    // Passed as a list; stored joined by commas
    private List<String> amenities;

    @NotNull(message = "At least one image is required")
    @Size(min = 1, max = 5, message = "Images must be between 1 and 5")
    @JsonAlias("images")
    private List<@NotBlank(message = "Image path must not be blank") String> imageUrls;

    @NotNull(message = "Pricing is required")
    @Size(min = 1, message = "Pricing is required")
    private List<@Valid VillaPricingRequestDTO> pricing;
}
