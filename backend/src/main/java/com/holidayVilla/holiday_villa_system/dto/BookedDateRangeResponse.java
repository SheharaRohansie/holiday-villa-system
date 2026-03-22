package com.holidayVilla.holiday_villa_system.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDate;

@Data
@AllArgsConstructor
public class BookedDateRangeResponse {
    private LocalDate checkInDate;
    private LocalDate checkOutDate;
}
