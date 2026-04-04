package com.holidayVilla.holiday_villa_system.repository;

import com.holidayVilla.holiday_villa_system.entity.Promotion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface PromotionRepository extends JpaRepository<Promotion, Long> {

        List<Promotion> findAllByVilla_IsDeletedFalseOrderByCreatedAtDesc();
        List<Promotion> findAllByOrderByCreatedAtDesc();

        List<Promotion> findByIsActiveTrueAndVilla_IsDeletedFalseOrderByCreatedAtDesc();
        List<Promotion> findByIsActiveTrueOrderByCreatedAtDesc();

        boolean existsByVilla_Id(Long villaId);
        List<Promotion> findByVilla_IdOrderByCreatedAtDesc(Long villaId);
        void deleteByVilla_Id(Long villaId);

    /**
     * Find active promotions applicable to a given villa and stay window.
     * Applies only when:
     * - startDate <= checkIn
     * - stayEnd (last night) <= endDate
     * - isActive = true
     */
    @Query("SELECT p FROM Promotion p " +
           "WHERE p.villa.id = :villaId " +
                 "AND p.villa.isDeleted = false " +
           "AND p.isActive = true " +
           "AND :checkIn >= p.startDate " +
          "AND :stayEnd <= p.endDate " +
           "ORDER BY p.createdAt DESC")
    List<Promotion> findApplicablePromotions(
            @Param("villaId") Long villaId,
           @Param("checkIn") LocalDate checkIn,
           @Param("stayEnd") LocalDate stayEnd
    );

    // Analytics helpers
    @Query("SELECT COUNT(b) FROM Booking b " +
           "WHERE b.appliedPromotion IS NOT NULL " +
           "AND b.promotionAccepted = true " +
           "AND b.status <> 'CANCELLED'")
    Long countBookingsWithPromotion();

    @Query("SELECT COALESCE(SUM(COALESCE(b.discountAmount, 0)), 0) FROM Booking b " +
           "WHERE b.promotionAccepted = true " +
           "AND b.status <> 'CANCELLED'")
    Double getTotalDiscountGiven();

    @Query("SELECT b.appliedPromotion.title, COUNT(b) FROM Booking b " +
           "WHERE b.appliedPromotion IS NOT NULL AND b.promotionAccepted = true " +
           "AND b.status <> 'CANCELLED' " +
           "GROUP BY b.appliedPromotion.title ORDER BY COUNT(b) DESC")
    List<Object[]> getMostUsedPromotions();
}
