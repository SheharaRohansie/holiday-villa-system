package com.holidayVilla.holiday_villa_system.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
public class PromotionResponse {

    private Long id;
    private Long villaId;
    private String villaName;
    private String title;
    private String description;
    private String discountType;
    private Double discountValue;
    private LocalDate startDate;
    private LocalDate endDate;
    private Boolean isActive;
    private LocalDateTime createdAt;
}
