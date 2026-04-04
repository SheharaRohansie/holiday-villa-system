package com.holidayVilla.holiday_villa_system.service;

import com.holidayVilla.holiday_villa_system.dto.PaymentProcessRequest;
import com.holidayVilla.holiday_villa_system.dto.PaymentResponse;
import com.holidayVilla.holiday_villa_system.dto.RevenueAnalyticsResponse;
import com.holidayVilla.holiday_villa_system.entity.*;
import com.holidayVilla.holiday_villa_system.exception.ResourceNotFoundException;
import com.holidayVilla.holiday_villa_system.repository.BookingRepository;
import com.holidayVilla.holiday_villa_system.repository.PaymentRepository;
import com.holidayVilla.holiday_villa_system.repository.PromotionRepository;
import com.holidayVilla.holiday_villa_system.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Month;
import java.time.format.TextStyle;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final BookingRepository bookingRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;
    private final InvoiceService invoiceService;
    private final PromotionRepository promotionRepository;

    // ── GUEST: Process a payment ───────────────────────────────────────────────

    @Transactional
    public PaymentResponse processPayment(PaymentProcessRequest req, String email) {
        return processPayment(req, email, null);
    }

    @Transactional
    public PaymentResponse processPayment(PaymentProcessRequest req, String email, String bankTransferReceiptPath) {

        User user = getUserByEmail(email);
        Booking booking = getBookingById(req.getBookingId());

        // Ownership check
        if (!booking.getUser().getId().equals(user.getId())) {
            throw new AccessDeniedException("You are not authorised to pay for this booking.");
        }

        // State guards
        if (booking.getStatus() == BookingStatus.CANCELLED) {
            throw new IllegalStateException("Cannot pay for a cancelled booking.");
        }
        if (booking.getPaymentStatus() == PaymentStatus.FULLY_PAID) {
            throw new IllegalStateException("This booking is already fully paid.");
        }

        PaymentType paymentType = parsePaymentType(req.getPaymentType());
        PaymentMethod paymentMethod = parsePaymentMethod(req.getPaymentMethod());

        // Cash is checkout-only (remaining payment)
        if (paymentMethod == PaymentMethod.CASH && paymentType != PaymentType.REMAINING) {
            throw new IllegalArgumentException("Cash payment is only available for the remaining balance at checkout.");
        }

        double total     = booking.getTotalPrice();
        double amountDue;

        switch (paymentType) {
            case ADVANCE -> {
                if (booking.getPaymentStatus() != PaymentStatus.UNPAID) {
                    throw new IllegalStateException("Advance payment already made. Pay the remaining balance instead.");
                }
                amountDue = round(total * 0.30);
            }
            case FULL -> {
                if (booking.getPaymentStatus() != PaymentStatus.UNPAID) {
                    throw new IllegalStateException("Initial payment already made. Use REMAINING to settle the balance.");
                }
                amountDue = total;
            }
            case REMAINING -> {
                if (booking.getPaymentStatus() != PaymentStatus.PARTIALLY_PAID) {
                    throw new IllegalStateException("No remaining balance. Booking is either unpaid or fully paid.");
                }

                // Prevent duplicates if a cash payment is already awaiting admin confirmation
                if (paymentMethod == PaymentMethod.CASH
                        && paymentRepository.existsByBookingIdAndPaymentTypeAndPaymentStatus(
                        booking.getId(), PaymentType.REMAINING, PaymentTransactionStatus.PENDING)) {
                    throw new IllegalStateException("A cash payment is already pending admin confirmation for this booking.");
                }

                amountDue = booking.getRemainingAmount();
            }
            default -> throw new IllegalArgumentException("Invalid payment type.");
        }

        // Simulate payment
        String txRef = "TXN-" + UUID.randomUUID().toString().toUpperCase().replace("-", "").substring(0, 12);

        String cardLast4 = null;
        if (req.getCardNumber() != null) {
            String digits = req.getCardNumber().replaceAll("\\D", "");
            if (digits.length() >= 4) {
                cardLast4 = digits.substring(digits.length() - 4);
            }
        }

        PaymentTransactionStatus txStatus = (paymentMethod == PaymentMethod.CASH && paymentType == PaymentType.REMAINING)
            ? PaymentTransactionStatus.PENDING
            : PaymentTransactionStatus.SUCCESS;

        Payment payment = Payment.builder()
                .booking(booking)
                .user(user)
                .amount(amountDue)
                .paymentType(paymentType)
                .paymentMethod(paymentMethod)
            .paymentStatus(txStatus)
                .transactionReference(txRef)
                .cardType(req.getCardType())
                .cardLast4(cardLast4)
                .cardExpiryDate(req.getExpiryDate())
                .bankTransferReceiptPath(bankTransferReceiptPath)
                .build();

        payment = paymentRepository.save(payment);

        // Update booking financial state (only when payment is successful)
        if (txStatus == PaymentTransactionStatus.SUCCESS) {
            switch (paymentType) {
                case ADVANCE -> {
                    booking.setAmountPaid(round(amountDue));
                    booking.setRemainingAmount(round(total - amountDue));
                    booking.setPaymentStatus(PaymentStatus.PARTIALLY_PAID);
                    booking.setStatus(BookingStatus.CONFIRMED);
                }
                case FULL -> {
                    booking.setAmountPaid(total);
                    booking.setRemainingAmount(0.0);
                    booking.setPaymentStatus(PaymentStatus.FULLY_PAID);
                    booking.setStatus(BookingStatus.CONFIRMED);
                }
                case REMAINING -> {
                    booking.setAmountPaid(total);
                    booking.setRemainingAmount(0.0);
                    booking.setPaymentStatus(PaymentStatus.FULLY_PAID);
                    booking.setStatus(BookingStatus.COMPLETED);
                }
            }
            bookingRepository.save(booking);
        }

        // Send mock email confirmation
        if (txStatus == PaymentTransactionStatus.SUCCESS) {
            try {
                emailService.sendPaymentConfirmation(payment);
            } catch (Exception e) {
                log.warn("Email notification failed: {}", e.getMessage());
            }
        }

        return toResponse(payment);
    }

    // ── ADMIN: Confirm a pending CASH (checkout) payment ─────────────────────

    @Transactional
    public PaymentResponse markPendingCashPaymentAsPaid(Long paymentId) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new ResourceNotFoundException("Payment not found: " + paymentId));

        if (payment.getPaymentMethod() != PaymentMethod.CASH) {
            throw new IllegalArgumentException("Only CASH payments can be manually confirmed.");
        }
        if (payment.getPaymentType() != PaymentType.REMAINING) {
            throw new IllegalArgumentException("Only REMAINING payments can be manually confirmed.");
        }
        if (payment.getPaymentStatus() != PaymentTransactionStatus.PENDING) {
            throw new IllegalStateException("This payment is not pending confirmation.");
        }

        Booking booking = payment.getBooking();
        if (booking.getStatus() == BookingStatus.CANCELLED) {
            throw new IllegalStateException("Cannot confirm payment for a cancelled booking.");
        }
        if (booking.getPaymentStatus() != PaymentStatus.PARTIALLY_PAID) {
            throw new IllegalStateException("Booking is not in a partially paid state.");
        }

        payment.setPaymentStatus(PaymentTransactionStatus.SUCCESS);
        paymentRepository.save(payment);

        // Complete booking
        booking.setAmountPaid(booking.getTotalPrice());
        booking.setRemainingAmount(0.0);
        booking.setPaymentStatus(PaymentStatus.FULLY_PAID);
        booking.setStatus(BookingStatus.COMPLETED);
        bookingRepository.save(booking);

        try {
            emailService.sendPaymentConfirmation(payment);
        } catch (Exception e) {
            log.warn("Email notification failed: {}", e.getMessage());
        }

        return toResponse(payment);
    }

    // ── GUEST: My payment history ──────────────────────────────────────────────

    public List<PaymentResponse> getMyPayments(String email) {
        User user = getUserByEmail(email);
        return paymentRepository.findByUser_IdOrderByPaymentDateDesc(user.getId())
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    // ── Admin: All payments ────────────────────────────────────────────────────

    public List<PaymentResponse> getAllPayments() {
        return paymentRepository.findAllByOrderByPaymentDateDesc()
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    // ── Invoice generation ─────────────────────────────────────────────────────

    public byte[] getInvoicePdf(Long paymentId, String email) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new ResourceNotFoundException("Payment not found: " + paymentId));

        // Guests may only download their own invoices; admins can download any
        User requester = getUserByEmail(email);
        if (requester.getRole() == Role.GUEST
                && !payment.getUser().getId().equals(requester.getId())) {
            throw new AccessDeniedException("You may only download your own invoices.");
        }

        return invoiceService.generateInvoicePdf(payment);
    }

    // ── Revenue Analytics ───────────────────────────────────────────────────────

    public RevenueAnalyticsResponse getRevenueAnalytics() {
        Double totalRevenue   = paymentRepository.getTotalRevenue();
        Double totalAdvance   = paymentRepository.getTotalByPaymentType(PaymentType.ADVANCE);
        Double totalRemaining = paymentRepository.getTotalByPaymentType(PaymentType.REMAINING);
        Double totalFull      = paymentRepository.getTotalByPaymentType(PaymentType.FULL);

        Double outstandingBalance = bookingRepository.getTotalOutstandingBalance();

        long totalBookings     = bookingRepository.count();
        long completedBookings = bookingRepository.countByStatus(BookingStatus.COMPLETED);
        long pendingPayments   = bookingRepository.countByPaymentStatusAndStatusNot(PaymentStatus.PARTIALLY_PAID, BookingStatus.CANCELLED);

        // Discount / promotion analytics
        Double totalDiscountGiven  = promotionRepository.getTotalDiscountGiven();
        Long bookingsWithPromotion = promotionRepository.countBookingsWithPromotion();
        List<Object[]> mostUsed    = promotionRepository.getMostUsedPromotions();
        String mostUsedPromotion   = mostUsed.isEmpty() ? null : (String) mostUsed.get(0)[0];

        double revenueAfterDiscount  = totalRevenue  != null ? totalRevenue  : 0.0;
        double discount              = totalDiscountGiven != null ? totalDiscountGiven : 0.0;
        double revenueBeforeDiscount = revenueAfterDiscount + discount;

        List<Object[]> raw = paymentRepository.getMonthlyRevenue();
        List<RevenueAnalyticsResponse.MonthlyRevenue> monthly = raw.stream()
                .map(r -> {
                    int year  = ((Number) r[0]).intValue();
                    int month = ((Number) r[1]).intValue();
                    double rev = ((Number) r[2]).doubleValue();
                    String label = Month.of(month).getDisplayName(TextStyle.SHORT, Locale.ENGLISH)
                                   + " " + year;
                    return RevenueAnalyticsResponse.MonthlyRevenue.builder()
                            .year(year).month(month).monthLabel(label).revenue(rev).build();
                })
                .collect(Collectors.toList());

        return RevenueAnalyticsResponse.builder()
                .totalRevenue(totalRevenue)
                .totalAdvancePayments(totalAdvance)
                .totalRemainingPayments(totalRemaining)
                .totalFullPayments(totalFull)
            .totalOutstandingBalance(outstandingBalance)
                .totalBookings(totalBookings)
                .totalCompletedBookings(completedBookings)
                .totalPendingPayments(pendingPayments)
                .totalDiscountGiven(discount)
                .revenueBeforeDiscount(revenueBeforeDiscount)
                .revenueAfterDiscount(revenueAfterDiscount)
                .bookingsWithPromotion(bookingsWithPromotion)
                .mostUsedPromotion(mostUsedPromotion)
                .monthlyRevenue(monthly)
                .build();
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    private PaymentResponse toResponse(Payment p) {
        Booking b = p.getBooking();
        return PaymentResponse.builder()
                .id(p.getId())
                .bookingId(b.getId())
                .userId(p.getUser().getId())
                .guestName(p.getUser().getFirstName() + " " + p.getUser().getLastName())
                .guestEmail(p.getUser().getEmail())
                .villaName(b.getVilla().getName())
                .checkInDate(b.getCheckInDate().toString())
                .checkOutDate(b.getCheckOutDate().toString())
                .amount(p.getAmount())
                .totalPrice(b.getTotalPrice())
                .amountPaid(b.getAmountPaid())
                .remainingAmount(b.getRemainingAmount())
                .paymentType(p.getPaymentType().toString())
                .paymentMethod(p.getPaymentMethod().toString())
                .paymentStatus(p.getPaymentStatus().toString())
                .transactionReference(p.getTransactionReference())
                .paymentDate(p.getPaymentDate())
                .bookingStatus(b.getStatus().toString())
                .bookingPaymentStatus(b.getPaymentStatus().toString())
                .build();
    }

    private User getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + email));
    }

    private Booking getBookingById(Long id) {
        return bookingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found: " + id));
    }

    private PaymentType parsePaymentType(String type) {
        try { return PaymentType.valueOf(type.toUpperCase()); }
        catch (Exception e) { throw new IllegalArgumentException("Invalid payment type: " + type); }
    }

    private PaymentMethod parsePaymentMethod(String method) {
        try { return PaymentMethod.valueOf(method.toUpperCase()); }
        catch (Exception e) { throw new IllegalArgumentException("Invalid payment method: " + method); }
    }

    private double round(double val) {
        return Math.round(val * 100.0) / 100.0;
    }
}
