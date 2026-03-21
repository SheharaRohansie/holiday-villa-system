package com.holidayVilla.holiday_villa_system.repository;

import com.holidayVilla.holiday_villa_system.entity.MealPlan;
import com.holidayVilla.holiday_villa_system.entity.VillaPricing;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface VillaPricingRepository extends JpaRepository<VillaPricing, Long> {

    Optional<VillaPricing> findByVillaIdAndGuestCountAndMealPlan(Long villaId, Integer guestCount, MealPlan mealPlan);

    Optional<VillaPricing> findTopByVillaIdOrderByPriceAscGuestCountAscMealPlanAsc(Long villaId);

    List<VillaPricing> findByVillaIdOrderByGuestCountAscMealPlanAsc(Long villaId);

    void deleteByVillaId(Long villaId);
}
