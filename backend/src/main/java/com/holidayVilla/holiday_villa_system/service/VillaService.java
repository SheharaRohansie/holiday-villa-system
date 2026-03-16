package com.holidayVilla.holiday_villa_system.service;

import com.holidayVilla.holiday_villa_system.dto.VillaRequestDTO;
import com.holidayVilla.holiday_villa_system.dto.VillaResponse;
import com.holidayVilla.holiday_villa_system.entity.Villa;
import com.holidayVilla.holiday_villa_system.exception.ResourceNotFoundException;
import com.holidayVilla.holiday_villa_system.repository.ReviewRepository;
import com.holidayVilla.holiday_villa_system.repository.VillaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class VillaService {

    private final VillaRepository villaRepository;
    private final ReviewRepository reviewRepository;

    public VillaResponse addVilla(VillaRequestDTO dto) {
        Villa villa = Villa.builder()
                .name(dto.getName())
                .description(dto.getDescription())
                .pricePerNight(dto.getPricePerNight())
                .maxGuests(dto.getMaxGuests())
                .amenities(joinList(dto.getAmenities()))
                .imageUrls(joinList(dto.getImageUrls()))
                .build();
        return toResponse(villaRepository.save(villa));
    }

    public VillaResponse updateVilla(Long id, VillaRequestDTO dto) {
        Villa villa = villaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Villa not found with id: " + id));

        villa.setName(dto.getName());
        villa.setDescription(dto.getDescription());
        villa.setPricePerNight(dto.getPricePerNight());
        villa.setMaxGuests(dto.getMaxGuests());
        villa.setAmenities(joinList(dto.getAmenities()));
        villa.setImageUrls(joinList(dto.getImageUrls()));

        return toResponse(villaRepository.save(villa));
    }

    public void deleteVilla(Long id) {
        Villa villa = villaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Villa not found with id: " + id));
        villaRepository.delete(villa);
    }

    public List<VillaResponse> getAllVillas() {
        return villaRepository.findAll().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public VillaResponse getVillaById(Long id) {
        Villa villa = villaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Villa not found with id: " + id));
        return toResponse(villa);
    }

    private String joinList(List<String> list) {
        if (list == null || list.isEmpty()) return "";
        return String.join(",", list);
    }

    public VillaResponse toResponse(Villa villa) {
        Double avg = reviewRepository.findAverageRatingByVillaId(villa.getId()).orElse(0.0);
        long count = reviewRepository.countByVilla_IdAndIsVisibleTrue(villa.getId());
        return VillaResponse.builder()
                .id(villa.getId())
                .name(villa.getName())
                .description(villa.getDescription())
                .pricePerNight(villa.getPricePerNight())
                .maxGuests(villa.getMaxGuests())
                .amenities(villa.getAmenitiesList())
                .imageUrls(villa.getImageUrlsList())
                .createdAt(villa.getCreatedAt())
                .updatedAt(villa.getUpdatedAt())
                .averageRating(Math.round(avg * 10.0) / 10.0)
                .reviewCount(count)
                .build();
    }
}
