package com.holidayVilla.holiday_villa_system.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class PaymentProcessRequest {

    @NotNull(message = "Booking ID is required")
    private Long bookingId;

    @NotBlank(message = "Payment type is required")
    private String paymentType;   // ADVANCE | FULL | REMAINING

    @NotBlank(message = "Payment method is required")
    private String paymentMethod; // CARD | CASH | BANK_TRANSFER

    // Optional CARD details (validated on frontend; accepted here for simulation only)
    private String cardNumber;
    private String cardType;   // VISA | MASTERCARD
    private String expiryDate; // MM/YY
    private String cvv;
}
