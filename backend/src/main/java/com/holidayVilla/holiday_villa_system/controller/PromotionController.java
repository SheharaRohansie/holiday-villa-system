package com.holidayVilla.holiday_villa_system.controller;

import com.holidayVilla.holiday_villa_system.dto.ApplicablePromotionResponse;
import com.holidayVilla.holiday_villa_system.dto.PromotionRequestDTO;
import com.holidayVilla.holiday_villa_system.dto.PromotionResponse;
import com.holidayVilla.holiday_villa_system.service.PromotionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequiredArgsConstructor
public class PromotionController {

    private final PromotionService promotionService;

    // ── ADMIN endpoints ───────────────────────────────────────────────────────

    /** Create a new promotion */
    @PostMapping("/api/admin/promotions")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PromotionResponse> createPromotion(
            @Valid @RequestBody PromotionRequestDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(promotionService.createPromotion(dto));
    }

    /** Update an existing promotion */
    @PutMapping("/api/admin/promotions/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PromotionResponse> updatePromotion(
            @PathVariable Long id,
            @Valid @RequestBody PromotionRequestDTO dto) {
        return ResponseEntity.ok(promotionService.updatePromotion(id, dto));
    }

    /** Delete a promotion */
    @DeleteMapping("/api/admin/promotions/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deletePromotion(@PathVariable Long id) {
        promotionService.deletePromotion(id);
        return ResponseEntity.noContent().build();
    }

    /** Get all promotions (admin view, includes inactive) */
    @GetMapping("/api/admin/promotions")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<PromotionResponse>> getAllPromotions() {
        return ResponseEntity.ok(promotionService.getAllPromotions());
    }

    // ── PUBLIC endpoints ──────────────────────────────────────────────────────

    /** Get all currently active promotions (for homepage offers section) */
    @GetMapping("/api/promotions/active")
    public ResponseEntity<List<PromotionResponse>> getActivePromotions() {
        return ResponseEntity.ok(promotionService.getActivePromotions());
    }

    /**
     * Check if an applicable promotion exists for a villa + dates combo.
     * Returns promotion details + calculated prices, or 204 No Content if none.
     */
    @GetMapping("/api/promotions/applicable")
    public ResponseEntity<ApplicablePromotionResponse> getApplicablePromotion(
            @RequestParam Long villaId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkIn,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkOut,
            @RequestParam(required = false) Integer guests,
            @RequestParam(required = false) String mealPlan) {
        ApplicablePromotionResponse response =
                promotionService.getApplicablePromotion(villaId, checkIn, checkOut, guests, mealPlan);
        if (response == null) return ResponseEntity.noContent().build();
        return ResponseEntity.ok(response);
    }
}
