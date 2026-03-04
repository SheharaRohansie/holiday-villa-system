package com.holidayVilla.holiday_villa_system.controller;

import com.holidayVilla.holiday_villa_system.dto.BookingRequestDTO;
import com.holidayVilla.holiday_villa_system.dto.BookingResponse;
import com.holidayVilla.holiday_villa_system.dto.PaymentRequestDTO;
import com.holidayVilla.holiday_villa_system.service.BookingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class BookingController {

    private final BookingService bookingService;

    // ── GUEST endpoints ──────────────────────────────────────────────────────

    /**
     * Create a new booking (PENDING, UNPAID) for the authenticated guest.
     */
    @PostMapping("/api/bookings")
    @PreAuthorize("hasRole('GUEST')")
    public ResponseEntity<BookingResponse> createBooking(
            @Valid @RequestBody BookingRequestDTO dto,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(bookingService.createBooking(dto, userDetails.getUsername()));
    }

    /**
     * Simulate payment for a booking.
     * paymentType: "ADVANCE" (30%) or "FULL" (100%)
     */
    @PostMapping("/api/bookings/{id}/pay")
    @PreAuthorize("hasRole('GUEST')")
    public ResponseEntity<BookingResponse> processPayment(
            @PathVariable Long id,
            @Valid @RequestBody PaymentRequestDTO dto,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(bookingService.processPayment(id, dto, userDetails.getUsername()));
    }

    /**
     * Get all bookings belonging to the authenticated guest.
     */
    @GetMapping("/api/bookings/my")
    @PreAuthorize("hasRole('GUEST')")
    public ResponseEntity<List<BookingResponse>> getMyBookings(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(bookingService.getMyBookings(userDetails.getUsername()));
    }

    /**
     * Cancel a booking (guest can only cancel their own bookings).
     */
    @PutMapping("/api/bookings/{id}/cancel")
    @PreAuthorize("hasRole('GUEST')")
    public ResponseEntity<BookingResponse> cancelBooking(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(bookingService.cancelBooking(id, userDetails.getUsername()));
    }

    // ── ADMIN endpoints ───────────────────────────────────────────────────────

    /**
     * Get all bookings (admin view).
     */
    @GetMapping("/api/admin/bookings")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<BookingResponse>> getAllBookings() {
        return ResponseEntity.ok(bookingService.getAllBookings());
    }

    /**
     * Complete remaining payment at checkout and mark booking as COMPLETED.
     */
    @PutMapping("/api/admin/bookings/{id}/complete-payment")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<BookingResponse> completePayment(@PathVariable Long id) {
        return ResponseEntity.ok(bookingService.completePayment(id));
    }
}
