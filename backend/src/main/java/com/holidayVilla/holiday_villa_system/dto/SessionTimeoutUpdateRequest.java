package com.holidayVilla.holiday_villa_system.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SessionTimeoutUpdateRequest {

    @Min(1)
    @Max(480)
    private int minutes;
}
