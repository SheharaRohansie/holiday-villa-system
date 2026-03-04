package com.holidayVilla.holiday_villa_system.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;

@Data
@Builder
public class ApplicablePromotionResponse {

    private Long promotionId;
    private String title;
    private String description;
    private String discountType;
    private Double discountValue;
    private LocalDate endDate;

    private Double originalPrice;
    private Double discountAmount;
    private Double finalPrice;
}
