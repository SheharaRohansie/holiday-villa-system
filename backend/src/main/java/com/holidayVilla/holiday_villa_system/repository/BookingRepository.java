package com.holidayVilla.holiday_villa_system.repository;

import com.holidayVilla.holiday_villa_system.entity.Booking;
import com.holidayVilla.holiday_villa_system.entity.BookingStatus;
import com.holidayVilla.holiday_villa_system.entity.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface BookingRepository extends JpaRepository<Booking, Long> {

    List<Booking> findByUserIdOrderByCreatedAtDesc(Long userId);

    List<Booking> findAllByOrderByCreatedAtDesc();

    /**
     * Check for overlapping bookings on the same villa (excluding CANCELLED status).
     * Overlap condition: checkIn < existingCheckOut AND checkOut > existingCheckIn
     */
    @Query("SELECT COUNT(b) > 0 FROM Booking b " +
           "WHERE b.villa.id = :villaId " +
           "AND b.status != :cancelledStatus " +
           "AND :checkIn < b.checkOutDate " +
           "AND :checkOut > b.checkInDate")
    boolean existsOverlappingBooking(
            @Param("villaId") Long villaId,
            @Param("checkIn") LocalDate checkIn,
            @Param("checkOut") LocalDate checkOut,
            @Param("cancelledStatus") BookingStatus cancelledStatus
    );

    long countByStatus(BookingStatus status);

    long countByPaymentStatus(PaymentStatus paymentStatus);

    boolean existsByVilla_Id(Long villaId);
}
