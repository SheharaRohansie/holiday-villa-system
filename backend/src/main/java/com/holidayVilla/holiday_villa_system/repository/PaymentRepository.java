package com.holidayVilla.holiday_villa_system.repository;

import com.holidayVilla.holiday_villa_system.entity.Payment;
import com.holidayVilla.holiday_villa_system.entity.PaymentTransactionStatus;
import com.holidayVilla.holiday_villa_system.entity.PaymentType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface PaymentRepository extends JpaRepository<Payment, Long> {

    List<Payment> findByUser_IdOrderByPaymentDateDesc(Long userId);

    void deleteByUser_Id(Long userId);

    List<Payment> findAllByOrderByPaymentDateDesc();

    boolean existsByBookingIdAndPaymentType(Long bookingId, PaymentType paymentType);

    boolean existsByBookingIdAndPaymentStatus(Long bookingId, PaymentTransactionStatus status);

    // ── Analytics ──────────────────────────────────────────────────────────────

            @Query("SELECT COALESCE(SUM(p.amount), 0) " +
                "FROM Payment p JOIN p.booking b " +
                "WHERE p.paymentStatus = com.holidayVilla.holiday_villa_system.entity.PaymentTransactionStatus.SUCCESS " +
                "AND b.status <> com.holidayVilla.holiday_villa_system.entity.BookingStatus.CANCELLED")
    Double getTotalRevenue();

            @Query("SELECT YEAR(p.paymentDate), MONTH(p.paymentDate), COALESCE(SUM(p.amount), 0) " +
                "FROM Payment p JOIN p.booking b " +
                "WHERE p.paymentStatus = com.holidayVilla.holiday_villa_system.entity.PaymentTransactionStatus.SUCCESS " +
                "AND b.status <> com.holidayVilla.holiday_villa_system.entity.BookingStatus.CANCELLED " +
           "GROUP BY YEAR(p.paymentDate), MONTH(p.paymentDate) " +
           "ORDER BY YEAR(p.paymentDate), MONTH(p.paymentDate)")
    List<Object[]> getMonthlyRevenue();

            @Query("SELECT COALESCE(SUM(p.amount), 0) " +
                "FROM Payment p JOIN p.booking b " +
                "WHERE p.paymentStatus = com.holidayVilla.holiday_villa_system.entity.PaymentTransactionStatus.SUCCESS " +
                "AND b.status <> com.holidayVilla.holiday_villa_system.entity.BookingStatus.CANCELLED " +
                "AND p.paymentType = :type")
    Double getTotalByPaymentType(@Param("type") PaymentType type);
}
