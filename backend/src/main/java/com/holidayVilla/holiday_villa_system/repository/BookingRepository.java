package com.holidayVilla.holiday_villa_system.repository;

import com.holidayVilla.holiday_villa_system.entity.Booking;
import com.holidayVilla.holiday_villa_system.entity.BookingStatus;
import com.holidayVilla.holiday_villa_system.entity.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;

@Repository
public interface BookingRepository extends JpaRepository<Booking, Long> {

    List<Booking> findByUser_IdOrderByCreatedAtDesc(Long userId);

    void deleteByUser_Id(Long userId);

    List<Booking> findAllByOrderByCreatedAtDesc();

    List<Booking> findByVilla_IdAndStatusInOrderByCheckInDateAsc(Long villaId, Collection<BookingStatus> statuses);

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

    long countByPaymentStatusAndStatusNot(PaymentStatus paymentStatus, BookingStatus status);

    boolean existsByVilla_Id(Long villaId);

    @Query("SELECT DISTINCT b.villa.id FROM Booking b")
    List<Long> findDistinctVillaIdsWithBookings();

    boolean existsByVilla_IdAndStatusNotAndCheckOutDateGreaterThanEqual(Long villaId, BookingStatus status, LocalDate date);

    @Query("SELECT DISTINCT b.villa.id FROM Booking b WHERE b.status <> :cancelled AND b.checkOutDate >= :today")
    List<Long> findDistinctVillaIdsWithActiveOrUpcomingBookings(@Param("today") LocalDate today, @Param("cancelled") BookingStatus cancelled);

    @Modifying
    @Query("DELETE FROM Booking b WHERE b.villa.id = :villaId AND (b.status = :cancelled OR b.checkOutDate < :today)")
    int deletePastOrCancelledByVillaId(@Param("villaId") Long villaId, @Param("today") LocalDate today, @Param("cancelled") BookingStatus cancelled);

    @Query("SELECT b.id FROM Booking b WHERE (b.villa.id = :villaId) OR (b.appliedPromotion IS NOT NULL AND b.appliedPromotion.villa.id = :villaId) OR (b.villa IS NULL AND b.villaName = :villaName)")
    List<Long> findBookingIdsForVillaPurge(@Param("villaId") Long villaId, @Param("villaName") String villaName);

    @Modifying
    @Query("DELETE FROM Booking b WHERE b.id IN :bookingIds")
    int deleteByBookingIds(@Param("bookingIds") List<Long> bookingIds);

    @Query("SELECT b FROM Booking b WHERE b.villa.id = :villaId AND (b.status = :cancelled OR b.checkOutDate < :today)")
    List<Booking> findPastOrCancelledByVillaId(@Param("villaId") Long villaId, @Param("today") LocalDate today, @Param("cancelled") BookingStatus cancelled);
}
