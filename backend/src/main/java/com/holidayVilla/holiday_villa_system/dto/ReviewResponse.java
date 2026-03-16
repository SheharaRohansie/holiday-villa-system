package com.holidayVilla.holiday_villa_system.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class ReviewResponse {

    private Long id;
    private Long userId;
    private String guestName;
    private Long villaId;
    private String villaName;
    private Long bookingId;
    private Integer rating;
    private String reviewText;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Boolean isVisible;
    /** True when the review was posted within the allowed edit window (7 days) */
    private Boolean canEdit;
}
