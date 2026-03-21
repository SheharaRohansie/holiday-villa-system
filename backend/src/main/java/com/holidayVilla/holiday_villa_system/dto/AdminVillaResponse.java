package com.holidayVilla.holiday_villa_system.dto;

import lombok.*;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminVillaResponse {
    private VillaResponse villa;
    private List<VillaPricingResponseDTO> pricing;
}
