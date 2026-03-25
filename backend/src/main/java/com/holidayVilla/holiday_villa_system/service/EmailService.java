package com.holidayVilla.holiday_villa_system.service;

import com.holidayVilla.holiday_villa_system.entity.Payment;
import com.holidayVilla.holiday_villa_system.config.AppMailProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.time.format.DateTimeFormatter;

@Service
@Slf4j
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;
    private final AppMailProperties mailProperties;

    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("dd MMM yyyy HH:mm");

    @PostConstruct
    void logMailConfig() {
        log.info("Mail config: enabled={}, app.mail.username={}", mailProperties.isEnabled(), mailProperties.getUsername());
    }

    public void sendVerificationCode(String toEmail, String otp) {
        String body = "Your OTP code is: %s. It will expire in 5 minutes.".formatted(otp);

        if (mailProperties.isEnabled()) {
            try {
                String fromEmail = mailProperties.getUsername();
                log.info("Sending verification email FROM {} TO {}", fromEmail, toEmail);
                SimpleMailMessage msg = new SimpleMailMessage();
                msg.setFrom(fromEmail);
                msg.setTo(toEmail);
                msg.setSubject("Verification Code");
                msg.setText(body);
                mailSender.send(msg);
                log.info("Verification code email sent to {}", toEmail);
            } catch (Exception e) {
                log.error("Failed to send verification email to {}: {}", toEmail, e.getMessage());
                throw new IllegalStateException("Failed to send OTP email. Please check SMTP settings.");
            }
        } else {
            logEmailToConsole(toEmail, "Verification Code", body);
        }
    }

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

        if (mailProperties.isEnabled()) {
            try {
                String fromEmail = mailProperties.getUsername();
                SimpleMailMessage msg = new SimpleMailMessage();
                msg.setFrom(fromEmail);
                msg.setTo(payment.getUser().getEmail());
                msg.setSubject("Payment Confirmation - Holiday Villa Resort");
                msg.setText(body);
                mailSender.send(msg);
                log.info("Payment confirmation email sent to {}", payment.getUser().getEmail());
            } catch (Exception e) {
                log.error("Failed to send payment email to {}: {}", payment.getUser().getEmail(), e.getMessage());
                throw new IllegalStateException("Failed to send payment email. Please check SMTP settings.");
            }
        } else {
            logEmailToConsole(payment.getUser().getEmail(), "Payment Confirmation - Holiday Villa Resort", body);
        }
    }

    private void logEmailToConsole(String toEmail, String subject, String body) {
        log.info("\n" + "=".repeat(60) +
                 "\n  [MOCK EMAIL] To: {}" +
                 "\n  Subject: {}" +
                 "\n{}" +
                 "\n" + "=".repeat(60), toEmail, subject, body);
    }
}

