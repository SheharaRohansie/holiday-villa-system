package com.holidayVilla.holiday_villa_system.service;

import com.holidayVilla.holiday_villa_system.entity.Otp;
import com.holidayVilla.holiday_villa_system.repository.OtpRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class OtpService {

    private static final int OTP_TTL_MINUTES = 5;
    private static final SecureRandom RNG = new SecureRandom();

    private final OtpRepository otpRepository;
    private final EmailService emailService;

    @Transactional
    public void sendOtp(String email) {
        invalidateExisting(email);
        String otp = generate6DigitOtp();

        Otp entity = Otp.builder()
                .email(email)
                .otp(otp)
                .expiryTime(LocalDateTime.now().plusMinutes(OTP_TTL_MINUTES))
                .used(false)
                .build();

        otpRepository.save(entity);
        emailService.sendVerificationCode(email, otp);
    }

    @Transactional
    public void verifyAndConsume(String email, String providedOtp) {
        Otp latest = otpRepository.findTopByEmailAndUsedFalseOrderByIdDesc(email)
                .orElseThrow(() -> new IllegalArgumentException("Invalid OTP"));

        if (latest.isUsed()) {
            throw new IllegalArgumentException("Invalid OTP");
        }
        if (latest.getExpiryTime() == null || latest.getExpiryTime().isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("OTP expired");
        }
        if (!latest.getOtp().equals(providedOtp)) {
            throw new IllegalArgumentException("Invalid OTP");
        }

        latest.setUsed(true);
        otpRepository.save(latest);
    }

    private String generate6DigitOtp() {
        int value = 100000 + RNG.nextInt(900000);
        return Integer.toString(value);
    }

    private void invalidateExisting(String email) {
        List<Otp> active = otpRepository.findByEmailAndUsedFalse(email);
        if (active.isEmpty()) return;
        for (Otp otp : active) {
            otp.setUsed(true);
        }
        otpRepository.saveAll(active);
    }
}
