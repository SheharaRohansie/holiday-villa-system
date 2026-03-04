package com.holidayVilla.holiday_villa_system.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class PaymentResponse {
    private Long id;
    private Long bookingId;
    private Long userId;
    private String guestName;
    private String guestEmail;
    private String villaName;
    private String checkInDate;
    private String checkOutDate;
    private Double amount;
    private Double totalPrice;
    private Double amountPaid;
    private Double remainingAmount;
    private String paymentType;
    private String paymentMethod;
    private String paymentStatus;
    private String transactionReference;
    private LocalDateTime paymentDate;
    private String bookingStatus;
    private String bookingPaymentStatus;
}
