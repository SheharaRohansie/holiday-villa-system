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
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    // ── GUEST: Make a payment ─────────────────────────────────────────────────

    @PostMapping(value = "/api/payments/pay", consumes = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("hasRole('GUEST')")
    public ResponseEntity<PaymentResponse> pay(
            @Valid @RequestBody PaymentProcessRequest req,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(paymentService.processPayment(req, userDetails.getUsername()));
    }

    @PostMapping(value = "/api/payments/pay", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('GUEST')")
    public ResponseEntity<PaymentResponse> payWithReceipt(
            @Valid @ModelAttribute PaymentProcessRequest req,
            @RequestPart("file") MultipartFile file,
            @AuthenticationPrincipal UserDetails userDetails) throws IOException {

        if (req.getPaymentMethod() == null || !"BANK_TRANSFER".equalsIgnoreCase(req.getPaymentMethod())) {
            throw new IllegalArgumentException("Receipt upload is only supported for BANK_TRANSFER payments.");
        }
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Receipt file is required for bank transfer payments.");
        }

        // Validate size (5MB)
        long maxBytes = 5L * 1024L * 1024L;
        if (file.getSize() > maxBytes) {
            throw new IllegalArgumentException("Receipt file must be 5MB or less.");
        }

        // Validate type
        String originalName = (file.getOriginalFilename() == null) ? "" : file.getOriginalFilename().toLowerCase();
        boolean okExt = originalName.endsWith(".jpg") || originalName.endsWith(".jpeg") || originalName.endsWith(".png") || originalName.endsWith(".pdf");
        if (!okExt) {
            throw new IllegalArgumentException("Only JPG, PNG, or PDF files are allowed.");
        }

        Path dir = Paths.get("uploads", "payments");
        Files.createDirectories(dir);

        String ext = originalName.contains(".") ? originalName.substring(originalName.lastIndexOf('.')) : "";
        String filename = "payment-" + req.getBookingId() + "-" + UUID.randomUUID() + ext;
        Path target = dir.resolve(filename).normalize();
        Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);

        String storedPath = Paths.get("uploads", "payments", filename).toString().replace('\\', '/');

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(paymentService.processPayment(req, userDetails.getUsername(), storedPath));
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
