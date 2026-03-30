package com.holidayVilla.holiday_villa_system.service;

import com.holidayVilla.holiday_villa_system.dto.ApplicablePromotionResponse;
import com.holidayVilla.holiday_villa_system.dto.PromotionRequestDTO;
import com.holidayVilla.holiday_villa_system.dto.PromotionResponse;
import com.holidayVilla.holiday_villa_system.entity.DiscountType;
import com.holidayVilla.holiday_villa_system.entity.MealPlan;
import com.holidayVilla.holiday_villa_system.entity.Promotion;
import com.holidayVilla.holiday_villa_system.entity.Villa;
import com.holidayVilla.holiday_villa_system.entity.VillaPricing;
import com.holidayVilla.holiday_villa_system.exception.ResourceNotFoundException;
import com.holidayVilla.holiday_villa_system.repository.PromotionRepository;
import com.holidayVilla.holiday_villa_system.repository.VillaRepository;
import com.holidayVilla.holiday_villa_system.repository.VillaPricingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PromotionService {

    private final PromotionRepository promotionRepository;
    private final VillaRepository villaRepository;
    private final VillaPricingRepository villaPricingRepository;

    // ── ADMIN: Create promotion ────────────────────────────────────────────────

    @Transactional
    public PromotionResponse createPromotion(PromotionRequestDTO dto) {
        validate(dto);
        Villa villa = getVilla(dto.getVillaId());
        Promotion promotion = Promotion.builder()
                .villa(villa)
                .title(dto.getTitle())
                .description(dto.getDescription())
                .discountType(DiscountType.valueOf(dto.getDiscountType()))
                .discountValue(dto.getDiscountValue())
                .startDate(dto.getStartDate())
                .endDate(dto.getEndDate())
                .isActive(dto.getIsActive() != null ? dto.getIsActive() : true)
                .build();
        return toResponse(promotionRepository.save(promotion));
    }

    // ── ADMIN: Update promotion ────────────────────────────────────────────────

    @Transactional
    public PromotionResponse updatePromotion(Long id, PromotionRequestDTO dto) {
        Promotion promotion = getPromotion(id);
        validate(dto);
        Villa villa = getVilla(dto.getVillaId());
        promotion.setVilla(villa);
        promotion.setTitle(dto.getTitle());
        promotion.setDescription(dto.getDescription());
        promotion.setDiscountType(DiscountType.valueOf(dto.getDiscountType()));
        promotion.setDiscountValue(dto.getDiscountValue());
        promotion.setStartDate(dto.getStartDate());
        promotion.setEndDate(dto.getEndDate());
        if (dto.getIsActive() != null) promotion.setIsActive(dto.getIsActive());
        return toResponse(promotionRepository.save(promotion));
    }

    // ── ADMIN: Delete promotion ────────────────────────────────────────────────

    @Transactional
    public void deletePromotion(Long id) {
        Promotion promotion = getPromotion(id);
        promotionRepository.delete(promotion);
    }

    // ── ADMIN: Get all promotions ──────────────────────────────────────────────

    public List<PromotionResponse> getAllPromotions() {
        return promotionRepository.findAllByVilla_IsDeletedFalseOrderByCreatedAtDesc()
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    // ── PUBLIC: Get active promotions for homepage ─────────────────────────────

    public List<PromotionResponse> getActivePromotions() {
        return promotionRepository.findByIsActiveTrueAndVilla_IsDeletedFalseOrderByCreatedAtDesc()
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    // ── PUBLIC: Check applicable promotion ────────────────────────────────────

    public ApplicablePromotionResponse getApplicablePromotion(Long villaId, LocalDate checkIn, LocalDate checkOut,
                                                             Integer guests, String mealPlanRaw) {
        Villa villa = getVilla(villaId);
        long nights = ChronoUnit.DAYS.between(checkIn, checkOut);

        double pricePerNight = villa.getPricePerNight();
        if (guests != null && mealPlanRaw != null && !mealPlanRaw.isBlank()) {
            MealPlan mealPlan = parseMealPlan(mealPlanRaw);
            VillaPricing pricing = villaPricingRepository
                    .findByVillaIdAndGuestCountAndMealPlan(villaId, guests, mealPlan)
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Pricing not found for selected guests/meal plan."));
            pricePerNight = pricing.getPrice();
        }

        double originalPrice = nights * pricePerNight;

        List<Promotion> applicable = promotionRepository.findApplicablePromotions(villaId, checkIn);
        if (applicable.isEmpty()) return null;

        Promotion promo = applicable.get(0);
        double discount = calculateDiscount(promo, originalPrice);
        double finalPrice = Math.max(0, originalPrice - discount);

        return ApplicablePromotionResponse.builder()
                .promotionId(promo.getId())
                .title(promo.getTitle())
                .description(promo.getDescription())
                .discountType(promo.getDiscountType().name())
                .discountValue(promo.getDiscountValue())
                .endDate(promo.getEndDate())
                .originalPrice(round(originalPrice))
                .discountAmount(round(discount))
                .finalPrice(round(finalPrice))
                .build();
    }

    private MealPlan parseMealPlan(String raw) {
        try {
            return MealPlan.valueOf(raw.trim().toUpperCase());
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid meal plan.");
        }
    }

    // ── Helper: compute discount amount ───────────────────────────────────────

    public double calculateDiscount(Promotion promo, double originalPrice) {
        if (promo.getDiscountType() == DiscountType.PERCENTAGE) {
            return Math.min(originalPrice, round(originalPrice * promo.getDiscountValue() / 100.0));
        } else {
            return Math.min(originalPrice, promo.getDiscountValue());
        }
    }

    // ── Internal helpers ───────────────────────────────────────────────────────

    private void validate(PromotionRequestDTO dto) {
        if (dto.getEndDate() != null && dto.getStartDate() != null
                && !dto.getEndDate().isAfter(dto.getStartDate())) {
            throw new IllegalArgumentException("End date must be after start date.");
        }
        try { DiscountType.valueOf(dto.getDiscountType()); }
        catch (Exception e) { throw new IllegalArgumentException("Invalid discount type. Use PERCENTAGE or FIXED_AMOUNT."); }
        if (dto.getDiscountValue() != null && dto.getDiscountValue() <= 0) {
            throw new IllegalArgumentException("Discount value must be positive.");
        }
    }

    private Promotion getPromotion(Long id) {
        return promotionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Promotion not found: " + id));
    }

    private Villa getVilla(Long id) {
        return villaRepository.findByIdAndIsDeletedFalse(id)
            .orElseThrow(() -> new ResourceNotFoundException("Villa not found: " + id));
    }

    private double round(double v) { return Math.round(v * 100.0) / 100.0; }

    public PromotionResponse toResponse(Promotion p) {
        return PromotionResponse.builder()
                .id(p.getId())
                .villaId(p.getVilla().getId())
                .villaName(p.getVilla().getName())
                .title(p.getTitle())
                .description(p.getDescription())
                .discountType(p.getDiscountType().name())
                .discountValue(p.getDiscountValue())
                .startDate(p.getStartDate())
                .endDate(p.getEndDate())
                .isActive(p.getIsActive())
                .createdAt(p.getCreatedAt())
                .build();
    }
}
