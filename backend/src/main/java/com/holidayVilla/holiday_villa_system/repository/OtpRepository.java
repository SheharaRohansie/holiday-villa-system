package com.holidayVilla.holiday_villa_system.repository;

import com.holidayVilla.holiday_villa_system.entity.Otp;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface OtpRepository extends JpaRepository<Otp, Long> {

    Optional<Otp> findTopByEmailAndUsedFalseOrderByIdDesc(String email);

    List<Otp> findByEmailAndUsedFalse(String email);
}
