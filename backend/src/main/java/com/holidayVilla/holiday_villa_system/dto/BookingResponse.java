package com.holidayVilla.holiday_villa_system.dto;

import com.holidayVilla.holiday_villa_system.entity.BookingStatus;
import com.holidayVilla.holiday_villa_system.entity.PaymentStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
public class BookingResponse {

    private Long id;
    private Long userId;
    private String guestName;
    private String guestEmail;
    private Long villaId;
    private String villaName;
    private LocalDate checkInDate;
    private LocalDate checkOutDate;
    private int nights;
    private Double pricePerNight;
    private Double totalPrice;
    private Double amountPaid;
    private Double remainingAmount;
    private BookingStatus status;
    private PaymentStatus paymentStatus;
    private LocalDateTime createdAt;

    // Promotion fields
    private Double originalPrice;
    private Double discountAmount;
    private Double finalPrice;
    private Long appliedPromotionId;
    private String appliedPromotionTitle;
    private Boolean promotionAccepted;
}
