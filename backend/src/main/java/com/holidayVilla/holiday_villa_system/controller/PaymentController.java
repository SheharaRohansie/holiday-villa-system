package com.holidayVilla.holiday_villa_system.controller;

import com.holidayVilla.holiday_villa_system.dto.PaymentProcessRequest;
import com.holidayVilla.holiday_villa_system.dto.PaymentResponse;
import com.holidayVilla.holiday_villa_system.dto.RevenueAnalyticsResponse;
import com.holidayVilla.holiday_villa_system.service.PaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    // ── GUEST: Make a payment ─────────────────────────────────────────────────

    @PostMapping("/api/payments/pay")
    @PreAuthorize("hasRole('GUEST')")
    public ResponseEntity<PaymentResponse> pay(
            @Valid @RequestBody PaymentProcessRequest req,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(paymentService.processPayment(req, userDetails.getUsername()));
    }

    // ── GUEST: View own payment history ───────────────────────────────────────

    @GetMapping("/api/payments/my")
    @PreAuthorize("hasRole('GUEST')")
    public ResponseEntity<List<PaymentResponse>> getMyPayments(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(paymentService.getMyPayments(userDetails.getUsername()));
    }

    // ── GUEST / ADMIN: Download invoice PDF ───────────────────────────────────

    @GetMapping("/api/payments/{paymentId}/invoice")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<byte[]> getInvoice(
            @PathVariable Long paymentId,
            @AuthenticationPrincipal UserDetails userDetails) {

        byte[] pdf = paymentService.getInvoicePdf(paymentId, userDetails.getUsername());

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData("attachment",
                "invoice-" + paymentId + ".pdf");
        headers.setContentLength(pdf.length);

        return new ResponseEntity<>(pdf, headers, HttpStatus.OK);
    }

    // ── ADMIN: View all payments ──────────────────────────────────────────────

    @GetMapping("/api/admin/payments")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<PaymentResponse>> getAllPayments() {
        return ResponseEntity.ok(paymentService.getAllPayments());
    }

    // ── ADMIN: Revenue Analytics ──────────────────────────────────────────────

    @GetMapping("/api/admin/analytics/revenue")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<RevenueAnalyticsResponse> getRevenueAnalytics() {
        return ResponseEntity.ok(paymentService.getRevenueAnalytics());
    }
}
