package com.holidayVilla.holiday_villa_system.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VillaPricingResponseDTO {
    private Long id;
    private Integer guestCount;
    private String mealPlan;
    private Double price;
}
