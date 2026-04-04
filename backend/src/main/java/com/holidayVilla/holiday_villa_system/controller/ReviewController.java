package com.holidayVilla.holiday_villa_system.controller;

import com.holidayVilla.holiday_villa_system.dto.ReviewRequestDTO;
import com.holidayVilla.holiday_villa_system.dto.ReviewResponse;
import com.holidayVilla.holiday_villa_system.dto.ReviewUpdateDTO;
import com.holidayVilla.holiday_villa_system.service.ReviewService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class ReviewController {

    private final ReviewService reviewService;

    // ── GUEST: Submit a review ─────────────────────────────────────────────────

    @PostMapping("/api/reviews")
    @PreAuthorize("hasRole('GUEST')")
    public ResponseEntity<ReviewResponse> submitReview(
            @Valid @RequestBody ReviewRequestDTO dto,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(reviewService.submitReview(dto, userDetails.getUsername()));
    }

    // ── GUEST: Edit a review (within 7-day window) ─────────────────────────────

    @PutMapping("/api/reviews/{reviewId}")
    @PreAuthorize("hasRole('GUEST')")
    public ResponseEntity<ReviewResponse> updateReview(
            @PathVariable Long reviewId,
            @Valid @RequestBody ReviewUpdateDTO dto,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(reviewService.updateReview(reviewId, dto, userDetails.getUsername()));
    }

    // ── GUEST: Delete own review (within 7-day window) ─────────────────────────

    @DeleteMapping("/api/reviews/{reviewId}")
    @PreAuthorize("hasRole('GUEST')")
    public ResponseEntity<Void> deleteMyReview(
            @PathVariable Long reviewId,
            @AuthenticationPrincipal UserDetails userDetails) {
        reviewService.deleteMyReview(reviewId, userDetails.getUsername());
        return ResponseEntity.noContent().build();
    }

    // ── PUBLIC: Get villa reviews ──────────────────────────────────────────────

    @GetMapping("/api/reviews/villa/{villaId}")
    public ResponseEntity<Map<String, Object>> getVillaReviews(
            @PathVariable Long villaId,
            @AuthenticationPrincipal UserDetails userDetails) {
        List<ReviewResponse> reviews = reviewService.getVillaReviews(villaId, userDetails != null ? userDetails.getUsername() : null);
        Double avg = reviewService.getVillaAverageRating(villaId);
        return ResponseEntity.ok(Map.of(
                "reviews", reviews,
                "averageRating", Math.round(avg * 10.0) / 10.0,
                "totalReviews", reviews.size()
        ));
    }

    // ── GUEST: Get my reviews ──────────────────────────────────────────────────

    @GetMapping("/api/reviews/my")
    @PreAuthorize("hasRole('GUEST')")
    public ResponseEntity<List<ReviewResponse>> getMyReviews(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(reviewService.getMyReviews(userDetails.getUsername()));
    }

    // ── ADMIN: View all reviews (read-only) ────────────────────────────────────

    @GetMapping("/api/admin/reviews")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<ReviewResponse>> getAllReviews() {
        return ResponseEntity.ok(reviewService.getAllReviews());
    }
}
