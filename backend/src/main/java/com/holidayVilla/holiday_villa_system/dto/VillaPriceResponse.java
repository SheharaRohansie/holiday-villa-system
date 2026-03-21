package com.holidayVilla.holiday_villa_system.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VillaPriceResponse {
    private Long villaId;
    private Integer guestCount;
    private String mealPlan;
    private Double pricePerNight;
}
