package com.holidayVilla.holiday_villa_system.dto;

import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VillaResponse {

    private Long id;
    private String name;
    private String description;
    private String type;
    private Double pricePerNight;
    private Integer maxGuests;
    private List<String> amenities;
    private List<String> imageUrls;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Double averageRating;
    private Long reviewCount;

    // Minimum price label data for cards
    private Double minPrice;
    private Integer minPriceGuestCount;
    private String minPriceMealPlan;

    // Helps UI render guest selector without a pricing table
    private List<Integer> allowedGuestCounts;
}
