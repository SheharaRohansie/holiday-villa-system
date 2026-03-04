package com.holidayVilla.holiday_villa_system.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class PaymentRequestDTO {

    @NotBlank(message = "Payment type is required")
    @Pattern(regexp = "ADVANCE|FULL", message = "Payment type must be ADVANCE or FULL")
    private String paymentType;
}
