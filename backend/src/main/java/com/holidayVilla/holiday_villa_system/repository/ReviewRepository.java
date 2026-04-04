package com.holidayVilla.holiday_villa_system.repository;

import com.holidayVilla.holiday_villa_system.entity.Review;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ReviewRepository extends JpaRepository<Review, Long> {

    /** All visible reviews for a specific villa */
    List<Review> findByVilla_IdAndIsVisibleTrue(Long villaId);

    /** All reviews (including hidden) for a specific villa */
    List<Review> findByVilla_Id(Long villaId);

    /** All reviews by a user */
    List<Review> findByUser_Id(Long userId);

    void deleteByUser_Id(Long userId);

    void deleteByVilla_Id(Long villaId);

    @Modifying
    @Query("DELETE FROM Review r WHERE r.booking.id IN :bookingIds")
    int deleteByBookingIds(@Param("bookingIds") List<Long> bookingIds);

    /** Check if a booking already has a review */
    boolean existsByBooking_Id(Long bookingId);

    /** Average rating for a villa */
    @Query("SELECT AVG(r.rating) FROM Review r WHERE r.villa.id = :villaId")
    Optional<Double> findAverageRatingByVillaId(@Param("villaId") Long villaId);

    /** Count of visible reviews for a villa */
    long countByVilla_IdAndIsVisibleTrue(Long villaId);

    /** Count of reviews for a villa */
    long countByVilla_Id(Long villaId);
}
