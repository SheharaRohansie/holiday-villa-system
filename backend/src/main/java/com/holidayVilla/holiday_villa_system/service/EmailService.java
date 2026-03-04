package com.holidayVilla.holiday_villa_system.service;

import com.holidayVilla.holiday_villa_system.entity.Payment;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.time.format.DateTimeFormatter;

@Service
@Slf4j
public class EmailService {

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${spring.mail.username:noreply@holidayvilla.lk}")
    private String fromEmail;

    @Value("${spring.mail.enabled:false}")
    private boolean emailEnabled;

    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("dd MMM yyyy HH:mm");

    public void sendPaymentConfirmation(Payment payment) {
        String guestName   = payment.getUser().getFirstName() + " " + payment.getUser().getLastName();
        String villaName   = payment.getBooking().getVilla().getName();
        String remaining   = String.format("LKR %,.2f", payment.getBooking().getRemainingAmount());
        String paid        = String.format("LKR %,.2f", payment.getAmount());
        String txRef       = payment.getTransactionReference();
        String bookStatus  = payment.getBooking().getStatus().toString();
        String payDate     = payment.getPaymentDate() != null
                             ? payment.getPaymentDate().format(FMT) : "N/A";

        String body = """
                Dear %s,

                Thank you for your payment at Holiday Villa Resort.

                ─────────────────────────────────────
                  PAYMENT CONFIRMATION
                ─────────────────────────────────────
                  Villa             : %s
                  Payment Amount    : %s
                  Transaction Ref   : %s
                  Payment Date      : %s
                  Booking Status    : %s
                  Remaining Balance : %s
                ─────────────────────────────────────

                Please keep this confirmation for your records.

                Warm regards,
                Holiday Villa Resort
                """.formatted(guestName, villaName, paid, txRef, payDate, bookStatus, remaining);

        if (emailEnabled && mailSender != null) {
            try {
                SimpleMailMessage msg = new SimpleMailMessage();
                msg.setFrom(fromEmail);
                msg.setTo(payment.getUser().getEmail());
                msg.setSubject("Payment Confirmation - Holiday Villa Resort");
                msg.setText(body);
                mailSender.send(msg);
                log.info("Payment confirmation email sent to {}", payment.getUser().getEmail());
            } catch (Exception e) {
                log.warn("Failed to send email ({}), falling back to console.", e.getMessage());
                logEmailToConsole(payment.getUser().getEmail(), body);
            }
        } else {
            logEmailToConsole(payment.getUser().getEmail(), body);
        }
    }

    private void logEmailToConsole(String toEmail, String body) {
        log.info("\n" + "=".repeat(60) +
                 "\n  [MOCK EMAIL] To: {}" +
                 "\n  Subject: Payment Confirmation - Holiday Villa Resort" +
                 "\n{}" +
                 "\n" + "=".repeat(60), toEmail, body);
    }
}
