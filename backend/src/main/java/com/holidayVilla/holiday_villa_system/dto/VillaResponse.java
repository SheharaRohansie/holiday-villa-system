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
    private Double pricePerNight;
    private Integer maxGuests;
    private List<String> amenities;
    private List<String> imageUrls;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Double averageRating;
    private Long reviewCount;
}
