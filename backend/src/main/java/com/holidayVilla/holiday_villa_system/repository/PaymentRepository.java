package com.holidayVilla.holiday_villa_system.repository;

import com.holidayVilla.holiday_villa_system.entity.Payment;
import com.holidayVilla.holiday_villa_system.entity.PaymentTransactionStatus;
import com.holidayVilla.holiday_villa_system.entity.PaymentType;
import com.holidayVilla.holiday_villa_system.entity.BookingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface PaymentRepository extends JpaRepository<Payment, Long> {

    List<Payment> findByUser_IdOrderByPaymentDateDesc(Long userId);

    void deleteByUser_Id(Long userId);

    List<Payment> findAllByOrderByPaymentDateDesc();

    boolean existsByBookingIdAndPaymentType(Long bookingId, PaymentType paymentType);

    boolean existsByBookingIdAndPaymentStatus(Long bookingId, PaymentTransactionStatus status);

    boolean existsByBookingIdAndPaymentTypeAndPaymentStatus(Long bookingId, PaymentType paymentType, PaymentTransactionStatus status);

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

    @Modifying
    @Query("DELETE FROM Payment p WHERE p.booking.villa.id = :villaId AND (p.booking.status = :cancelled OR p.booking.checkOutDate < :today)")
    int deletePastOrCancelledByVillaId(@Param("villaId") Long villaId, @Param("today") LocalDate today, @Param("cancelled") BookingStatus cancelled);

    @Modifying
    @Query("DELETE FROM Payment p WHERE p.booking.id IN :bookingIds")
    int deleteByBookingIds(@Param("bookingIds") List<Long> bookingIds);
}
