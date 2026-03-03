package com.holidayVilla.holiday_villa_system.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "villas")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Villa {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Villa name is required")
    @Column(nullable = false)
    private String name;

    @NotBlank(message = "Description is required")
    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @NotNull(message = "Price per night is required")
    @Positive(message = "Price must be positive")
    @Column(nullable = false)
    private Double pricePerNight;

    @Column
    private Integer maxGuests;

    // Stored as comma-separated string, exposed as List<String>
    @Column(columnDefinition = "TEXT")
    private String amenities;

    // Stored as comma-separated URLs
    @Column(columnDefinition = "TEXT")
    private String imageUrls;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    // Transient helpers for list conversion
    @Transient
    public List<String> getAmenitiesList() {
        if (amenities == null || amenities.isBlank()) return List.of();
        return List.of(amenities.split(",")).stream()
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();
    }

    @Transient
    public List<String> getImageUrlsList() {
        if (imageUrls == null || imageUrls.isBlank()) return List.of();
        return List.of(imageUrls.split(",")).stream()
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();
    }
}
