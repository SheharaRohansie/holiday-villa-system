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
import java.util.Optional;
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

        Villa villa = villaRepository.findByIdAndIsDeletedFalse(dto.getVillaId())
            .orElseThrow(() -> new ResourceNotFoundException("Villa not found with id: " + dto.getVillaId()));

        if (!booking.getVilla().getId().equals(villa.getId())) {
            throw new IllegalArgumentException("The villa does not match the booking.");
        }

        Review review = Review.builder()
                .user(user)
                .villa(villa)
            .villaName(villa.getName())
                .booking(booking)
                .rating(dto.getRating())
                .reviewText(dto.getReviewText())
                .isVisible(true)
                .build();

        return toResponse(reviewRepository.save(review), user.getId());
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
        return toResponse(reviewRepository.save(review), user.getId());
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

    // ── Get villa reviews ─────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<ReviewResponse> getVillaReviews(Long villaId) {
        return getVillaReviews(villaId, null);
    }

    @Transactional(readOnly = true)
    public List<ReviewResponse> getVillaReviews(Long villaId, String viewerEmailOrNull) {
        Long viewerUserId = Optional.ofNullable(viewerEmailOrNull)
                .flatMap(userRepository::findByEmail)
                .map(User::getId)
                .orElse(null);

        return reviewRepository.findByVilla_Id(villaId)
                .stream()
                .map(r -> toResponse(r, viewerUserId))
                .collect(Collectors.toList());
    }

    // ── Get all reviews for the authenticated guest ────────────────────────────

    @Transactional(readOnly = true)
    public List<ReviewResponse> getMyReviews(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return reviewRepository.findByUser_Id(user.getId())
                .stream()
            .map(r -> toResponse(r, user.getId()))
                .collect(Collectors.toList());
    }

    // ── Admin: Get all reviews ─────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<ReviewResponse> getAllReviews() {
        return reviewRepository.findAll()
                .stream()
                .map(r -> toResponse(r, null))
                .collect(Collectors.toList());
    }

    // ── Average rating helper ──────────────────────────────────────────────────

    public Double getVillaAverageRating(Long villaId) {
        return reviewRepository.findAverageRatingByVillaId(villaId).orElse(0.0);
    }

    // ── Private helpers ────────────────────────────────────────────────────────

    private boolean isWithinEditWindow(LocalDateTime createdAt) {
        return createdAt.isAfter(LocalDateTime.now().minusDays(EDIT_WINDOW_DAYS));
    }

    private ReviewResponse toResponse(Review review, Long viewerUserId) {
        boolean canEdit = viewerUserId != null
                && review.getUser() != null
                && viewerUserId.equals(review.getUser().getId())
                && isWithinEditWindow(review.getCreatedAt());

        return ReviewResponse.builder()
                .id(review.getId())
                .userId(review.getUser().getId())
                .guestName(review.getUser().getFirstName() + " " + review.getUser().getLastName())
                .villaId(review.getVilla() != null ? review.getVilla().getId() : null)
                .villaName(review.getVilla() != null ? review.getVilla().getName() : review.getVillaName())
                .bookingId(review.getBooking().getId())
                .rating(review.getRating())
                .reviewText(review.getReviewText())
                .createdAt(review.getCreatedAt())
                .updatedAt(review.getUpdatedAt())
                .isVisible(review.getIsVisible())
                .canEdit(canEdit)
                .build();
    }

    private ReviewResponse toResponse(Review review) {
        return toResponse(review, null);
    }
}
