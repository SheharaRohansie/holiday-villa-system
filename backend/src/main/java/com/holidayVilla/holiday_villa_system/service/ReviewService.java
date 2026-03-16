package com.holidayVilla.holiday_villa_system.service;

import com.holidayVilla.holiday_villa_system.dto.ReviewRequestDTO;
import com.holidayVilla.holiday_villa_system.dto.ReviewResponse;
import com.holidayVilla.holiday_villa_system.dto.ReviewUpdateDTO;
import com.holidayVilla.holiday_villa_system.entity.*;
import com.holidayVilla.holiday_villa_system.exception.ResourceNotFoundException;
import com.holidayVilla.holiday_villa_system.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ReviewService {

    private static final int EDIT_WINDOW_DAYS = 7;

    private final ReviewRepository reviewRepository;
    private final UserRepository userRepository;
    private final VillaRepository villaRepository;
    private final BookingRepository bookingRepository;

    // ── Submit a review ────────────────────────────────────────────────────────

    @Transactional
    public ReviewResponse submitReview(ReviewRequestDTO dto, String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Booking booking = bookingRepository.findById(dto.getBookingId())
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found with id: " + dto.getBookingId()));

        if (!booking.getUser().getId().equals(user.getId())) {
            throw new AccessDeniedException("You can only review your own bookings.");
        }

        if (booking.getStatus() != BookingStatus.COMPLETED) {
            throw new IllegalStateException("You can only review a villa after your stay is completed.");
        }

        if (reviewRepository.existsByBooking_Id(booking.getId())) {
            throw new IllegalStateException("You have already reviewed this stay.");
        }

        Villa villa = villaRepository.findById(dto.getVillaId())
                .orElseThrow(() -> new ResourceNotFoundException("Villa not found with id: " + dto.getVillaId()));

        if (!booking.getVilla().getId().equals(villa.getId())) {
            throw new IllegalArgumentException("The villa does not match the booking.");
        }

        Review review = Review.builder()
                .user(user)
                .villa(villa)
                .booking(booking)
                .rating(dto.getRating())
                .reviewText(dto.getReviewText())
                .isVisible(true)
                .build();

        return toResponse(reviewRepository.save(review));
    }

    // ── Guest: Edit a review ───────────────────────────────────────────────────

    @Transactional
    public ReviewResponse updateReview(Long reviewId, ReviewUpdateDTO dto, String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Review not found with id: " + reviewId));

        if (!review.getUser().getId().equals(user.getId())) {
            throw new AccessDeniedException("You can only edit your own reviews.");
        }

        if (!isWithinEditWindow(review.getCreatedAt())) {
            throw new IllegalStateException(
                    "Review can no longer be edited. The " + EDIT_WINDOW_DAYS + "-day edit window has passed.");
        }

        review.setRating(dto.getRating());
        review.setReviewText(dto.getReviewText());
        return toResponse(reviewRepository.save(review));
    }

    // ── Guest: Delete a review ─────────────────────────────────────────────────

    @Transactional
    public void deleteMyReview(Long reviewId, String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Review not found with id: " + reviewId));

        if (!review.getUser().getId().equals(user.getId())) {
            throw new AccessDeniedException("You can only delete your own reviews.");
        }

        if (!isWithinEditWindow(review.getCreatedAt())) {
            throw new IllegalStateException(
                    "Review can no longer be deleted. The " + EDIT_WINDOW_DAYS + "-day edit window has passed.");
        }

        reviewRepository.delete(review);
    }

    // ── Get visible villa reviews ──────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<ReviewResponse> getVillaReviews(Long villaId) {
        return reviewRepository.findByVilla_IdAndIsVisibleTrue(villaId)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    // ── Get all reviews for the authenticated guest ────────────────────────────

    @Transactional(readOnly = true)
    public List<ReviewResponse> getMyReviews(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return reviewRepository.findByUser_Id(user.getId())
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    // ── Admin: Get all reviews ─────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<ReviewResponse> getAllReviews() {
        return reviewRepository.findAll()
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    // ── Admin: Toggle review visibility ───────────────────────────────────────

    @Transactional
    public ReviewResponse toggleVisibility(Long reviewId) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Review not found with id: " + reviewId));
        review.setIsVisible(!review.getIsVisible());
        return toResponse(reviewRepository.save(review));
    }

    // ── Average rating helper ──────────────────────────────────────────────────

    public Double getVillaAverageRating(Long villaId) {
        return reviewRepository.findAverageRatingByVillaId(villaId).orElse(0.0);
    }

    // ── Private helpers ────────────────────────────────────────────────────────

    private boolean isWithinEditWindow(LocalDateTime createdAt) {
        return createdAt.isAfter(LocalDateTime.now().minusDays(EDIT_WINDOW_DAYS));
    }

    private ReviewResponse toResponse(Review review) {
        return ReviewResponse.builder()
                .id(review.getId())
                .userId(review.getUser().getId())
                .guestName(review.getUser().getFirstName() + " " + review.getUser().getLastName())
                .villaId(review.getVilla().getId())
                .villaName(review.getVilla().getName())
                .bookingId(review.getBooking().getId())
                .rating(review.getRating())
                .reviewText(review.getReviewText())
                .createdAt(review.getCreatedAt())
                .updatedAt(review.getUpdatedAt())
                .isVisible(review.getIsVisible())
                .canEdit(isWithinEditWindow(review.getCreatedAt()))
                .build();
    }
}
