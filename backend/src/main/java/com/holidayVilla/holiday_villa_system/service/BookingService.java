package com.holidayVilla.holiday_villa_system.service;

import com.holidayVilla.holiday_villa_system.dto.BookingRequestDTO;
import com.holidayVilla.holiday_villa_system.dto.BookingResponse;
import com.holidayVilla.holiday_villa_system.dto.BookedDateRangeResponse;
import com.holidayVilla.holiday_villa_system.dto.PaymentRequestDTO;
import com.holidayVilla.holiday_villa_system.entity.*;
import com.holidayVilla.holiday_villa_system.exception.ResourceNotFoundException;
import com.holidayVilla.holiday_villa_system.repository.BookingRepository;
import com.holidayVilla.holiday_villa_system.repository.PromotionRepository;
import com.holidayVilla.holiday_villa_system.repository.UserRepository;
import com.holidayVilla.holiday_villa_system.repository.VillaRepository;
import com.holidayVilla.holiday_villa_system.repository.VillaPricingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BookingService {

    private final BookingRepository bookingRepository;
    private final UserRepository userRepository;
    private final VillaRepository villaRepository;
    private final PromotionRepository promotionRepository;
    private final VillaPricingRepository villaPricingRepository;

    // ── GUEST: Create a PENDING booking ──────────────────────────────────────

    @Transactional
    public BookingResponse createBooking(BookingRequestDTO dto, String email) {
        User user = getUserByEmail(email);
        Villa villa = getVillaById(dto.getVillaId());

        validateDates(dto.getCheckInDate(), dto.getCheckOutDate());
        checkAvailability(villa.getId(), dto.getCheckInDate(), dto.getCheckOutDate());

        MealPlan mealPlan = parseMealPlan(dto.getMealPlan());
        validateGuestCountAgainstType(villa.getType(), dto.getGuestCount());
        VillaPricing pricing = villaPricingRepository
            .findByVillaIdAndGuestCountAndMealPlan(villa.getId(), dto.getGuestCount(), mealPlan)
            .orElseThrow(() -> new ResourceNotFoundException(
                "Pricing not found for selected guests/meal plan."));

        long nights = ChronoUnit.DAYS.between(dto.getCheckInDate(), dto.getCheckOutDate());
        double pricePerNight = pricing.getPrice();
        double originalPrice = nights * pricePerNight;

        // ── Promotion resolution ───────────────────────────────────────────────
        Promotion appliedPromotion = null;
        boolean promotionAccepted = false;
        double discountAmount = 0.0;
        double finalPrice = originalPrice;

        if (dto.getAppliedPromotionId() != null && Boolean.TRUE.equals(dto.getPromotionAccepted())) {
            Promotion promo = promotionRepository.findById(dto.getAppliedPromotionId()).orElse(null);
            if (promo != null && promo.getIsActive()
                    && !dto.getCheckInDate().isBefore(promo.getStartDate())
                    && !dto.getCheckInDate().isAfter(promo.getEndDate())) {
                if (promo.getDiscountType() == DiscountType.PERCENTAGE) {
                    discountAmount = round(originalPrice * promo.getDiscountValue() / 100.0);
                } else {
                    discountAmount = Math.min(originalPrice, promo.getDiscountValue());
                }
                discountAmount = round(discountAmount);
                finalPrice = Math.max(0, round(originalPrice - discountAmount));
                appliedPromotion = promo;
                promotionAccepted = true;
            }
        }

        double effectiveTotal = finalPrice; // payment calcs use this

        Booking booking = Booking.builder()
                .user(user)
                .villa(villa)
            .villaName(villa.getName())
            .guestCount(dto.getGuestCount())
            .mealPlan(mealPlan)
            .pricePerNight(pricePerNight)
                .checkInDate(dto.getCheckInDate())
                .checkOutDate(dto.getCheckOutDate())
                .totalPrice(effectiveTotal)
                .amountPaid(0.0)
                .remainingAmount(effectiveTotal)
                .status(BookingStatus.PENDING)
                .paymentStatus(PaymentStatus.UNPAID)
                .originalPrice(round(originalPrice))
                .discountAmount(discountAmount)
                .finalPrice(round(finalPrice))
                .appliedPromotion(appliedPromotion)
                .promotionAccepted(promotionAccepted)
                .build();

        return toResponse(bookingRepository.save(booking));
    }

    // ── GUEST: Simulate payment ───────────────────────────────────────────────

    @Transactional
    public BookingResponse processPayment(Long bookingId, PaymentRequestDTO dto, String email) {
        Booking booking = getBookingById(bookingId);
        assertOwner(booking, email);

        if (booking.getStatus() == BookingStatus.CANCELLED) {
            throw new IllegalStateException("Cannot pay for a cancelled booking.");
        }
        if (booking.getPaymentStatus() == PaymentStatus.FULLY_PAID) {
            throw new IllegalStateException("Booking is already fully paid.");
        }

        double total = booking.getTotalPrice();

        if ("ADVANCE".equalsIgnoreCase(dto.getPaymentType())) {
            double advance = Math.round(total * 0.30 * 100.0) / 100.0;
            booking.setAmountPaid(advance);
            booking.setRemainingAmount(Math.round((total - advance) * 100.0) / 100.0);
            booking.setPaymentStatus(PaymentStatus.PARTIALLY_PAID);
        } else if ("FULL".equalsIgnoreCase(dto.getPaymentType())) {
            booking.setAmountPaid(total);
            booking.setRemainingAmount(0.0);
            booking.setPaymentStatus(PaymentStatus.FULLY_PAID);
        } else {
            throw new IllegalArgumentException("Invalid payment type. Use ADVANCE or FULL.");
        }

        booking.setStatus(BookingStatus.CONFIRMED);
        return toResponse(bookingRepository.save(booking));
    }

    // ── GUEST: View own bookings ──────────────────────────────────────────────

    public List<BookingResponse> getMyBookings(String email) {
        User user = getUserByEmail(email);
        return bookingRepository.findByUser_IdOrderByCreatedAtDesc(user.getId())
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    // ── GUEST: Get single booking by ID ───────────────────────────────────────

    public BookingResponse getMyBookingById(Long bookingId, String email) {
        Booking booking = getBookingById(bookingId);
        assertOwner(booking, email);
        return toResponse(booking);
    }

    // ── GUEST: Cancel booking ─────────────────────────────────────────────────

    @Transactional
    public BookingResponse cancelBooking(Long bookingId, String email) {
        Booking booking = getBookingById(bookingId);
        assertOwner(booking, email);

        if (booking.getStatus() == BookingStatus.CANCELLED) {
            throw new IllegalStateException("Booking is already cancelled.");
        }
        if (booking.getStatus() == BookingStatus.COMPLETED) {
            throw new IllegalStateException("Cannot cancel a completed booking.");
        }

        booking.setStatus(BookingStatus.CANCELLED);
        return toResponse(bookingRepository.save(booking));
    }

    // ── ADMIN: View all bookings ──────────────────────────────────────────────

    public List<BookingResponse> getAllBookings() {
        return bookingRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    // ── PUBLIC: Villa booked dates ───────────────────────────────────────────

    public List<BookedDateRangeResponse> getBookedDateRanges(Long villaId) {
        // Ensure villa exists (helps return 404 vs empty list on invalid id)
        getVillaById(villaId);

        // Keep this aligned with checkAvailability(): any status except CANCELLED should block dates.
        // Including COMPLETED also avoids a mismatch if a booking is marked COMPLETED early.
        List<BookingStatus> statuses = Arrays.asList(
            BookingStatus.PENDING,
            BookingStatus.CONFIRMED,
            BookingStatus.COMPLETED
        );
        return bookingRepository.findByVilla_IdAndStatusInOrderByCheckInDateAsc(villaId, statuses)
                .stream()
                .map(b -> new BookedDateRangeResponse(b.getCheckInDate(), b.getCheckOutDate()))
                .collect(Collectors.toList());
    }

    // ── ADMIN: Complete remaining payment at checkout ─────────────────────────

    @Transactional
    public BookingResponse completePayment(Long bookingId) {
        Booking booking = getBookingById(bookingId);

        if (booking.getPaymentStatus() == PaymentStatus.FULLY_PAID) {
            throw new IllegalStateException("Payment is already fully completed.");
        }
        if (booking.getStatus() == BookingStatus.CANCELLED) {
            throw new IllegalStateException("Cannot complete payment for a cancelled booking.");
        }

        booking.setAmountPaid(booking.getTotalPrice());
        booking.setRemainingAmount(0.0);
        booking.setPaymentStatus(PaymentStatus.FULLY_PAID);
        booking.setStatus(BookingStatus.COMPLETED);
        return toResponse(bookingRepository.save(booking));
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private void validateDates(LocalDate checkIn, LocalDate checkOut) {
        if (!checkIn.isBefore(checkOut)) {
            throw new IllegalArgumentException("Check-out date must be after check-in date.");
        }
        if (checkIn.isBefore(LocalDate.now())) {
            throw new IllegalArgumentException("Check-in date cannot be in the past.");
        }
    }

    private void checkAvailability(Long villaId, LocalDate checkIn, LocalDate checkOut) {
        boolean overlaps = bookingRepository.existsOverlappingBooking(
                villaId, checkIn, checkOut, BookingStatus.CANCELLED);
        if (overlaps) {
            throw new IllegalStateException("Selected dates are not available");
        }
    }

    private void assertOwner(Booking booking, String email) {
        if (!booking.getUser().getEmail().equals(email)) {
            throw new AccessDeniedException("You are not authorized to modify this booking.");
        }
    }

    private User getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + email));
    }

    private Villa getVillaById(Long id) {
        return villaRepository.findByIdAndIsDeletedFalse(id)
            .orElseThrow(() -> new ResourceNotFoundException("Villa not found with id: " + id));
    }

    private Booking getBookingById(Long id) {
        return bookingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found with id: " + id));
    }

    public BookingResponse toResponse(Booking b) {
        long nights = ChronoUnit.DAYS.between(b.getCheckInDate(), b.getCheckOutDate());
        return BookingResponse.builder()
                .id(b.getId())
                .userId(b.getUser().getId())
                .guestName(b.getUser().getFirstName() + " " + b.getUser().getLastName())
                .guestEmail(b.getUser().getEmail())
                .villaId(b.getVilla() != null ? b.getVilla().getId() : null)
                .villaName(b.getVilla() != null ? b.getVilla().getName() : b.getVillaName())
                .guestCount(b.getGuestCount())
                .mealPlan(b.getMealPlan() != null ? b.getMealPlan().name() : null)
                .checkInDate(b.getCheckInDate())
                .checkOutDate(b.getCheckOutDate())
                .nights((int) nights)
                .pricePerNight(b.getPricePerNight())
                .totalPrice(b.getTotalPrice())
                .amountPaid(b.getAmountPaid())
                .remainingAmount(b.getRemainingAmount())
                .status(b.getStatus())
                .paymentStatus(b.getPaymentStatus())
                .createdAt(b.getCreatedAt())
                .originalPrice(b.getOriginalPrice())
                .discountAmount(b.getDiscountAmount())
                .finalPrice(b.getFinalPrice())
                .appliedPromotionId(b.getAppliedPromotion() != null ? b.getAppliedPromotion().getId() : null)
                .appliedPromotionTitle(b.getAppliedPromotion() != null ? b.getAppliedPromotion().getTitle() : null)
                .promotionAccepted(b.getPromotionAccepted())
                .build();
    }

    private MealPlan parseMealPlan(String raw) {
        try {
            return MealPlan.valueOf(raw.trim().toUpperCase());
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid meal plan.");
        }
    }

    private void validateGuestCountAgainstType(VillaType type, int guests) {
        if (type == null) return; // legacy villas without type
        boolean ok = switch (type) {
            case DELUXE -> guests == 2 || guests == 3;
            case SUPERIOR -> guests >= 2 && guests <= 6;
        };
        if (!ok) {
            throw new IllegalArgumentException("Guest count does not match villa type.");
        }
    }

    private double round(double v) { return Math.round(v * 100.0) / 100.0; }
}
