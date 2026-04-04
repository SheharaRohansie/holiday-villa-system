package com.holidayVilla.holiday_villa_system.service;

import com.holidayVilla.holiday_villa_system.dto.*;
import com.holidayVilla.holiday_villa_system.entity.*;
import com.holidayVilla.holiday_villa_system.exception.ResourceNotFoundException;
import com.holidayVilla.holiday_villa_system.repository.BookingRepository;
import com.holidayVilla.holiday_villa_system.repository.PaymentRepository;
import com.holidayVilla.holiday_villa_system.repository.PromotionRepository;
import com.holidayVilla.holiday_villa_system.repository.ReviewRepository;
import com.holidayVilla.holiday_villa_system.repository.VillaRepository;
import com.holidayVilla.holiday_villa_system.repository.VillaPricingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.HashSet;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class VillaService {

    private final VillaRepository villaRepository;
    private final ReviewRepository reviewRepository;
    private final VillaPricingRepository villaPricingRepository;
    private final BookingRepository bookingRepository;
    private final PaymentRepository paymentRepository;
    private final PromotionRepository promotionRepository;

    @Transactional
    public VillaResponse addVilla(VillaRequestDTO dto) {
        VillaType type = parseVillaType(dto.getType());
        validatePricingMatrix(type, dto.getPricing());

        double minPrice = dto.getPricing().stream().mapToDouble(VillaPricingRequestDTO::getPrice).min().orElseThrow();

        Villa villa = Villa.builder()
                .name(dto.getName())
                .description(dto.getDescription())
                .type(type)
                .pricePerNight(minPrice)
                .maxGuests(maxAllowedGuests(type))
                .amenities(joinList(dto.getAmenities()))
                .imageUrls(joinList(dto.getImageUrls()))
            .isDeleted(false)
                .build();

        Villa saved = villaRepository.save(villa);
        savePricing(saved, dto.getPricing());
        return toResponse(saved);
    }

    @Transactional
    public VillaResponse updateVilla(Long id, VillaRequestDTO dto) {
        Villa villa = villaRepository.findByIdAndIsDeletedFalse(id)
            .orElseThrow(() -> new ResourceNotFoundException("Villa not found with id: " + id));

        VillaType type = parseVillaType(dto.getType());
        validatePricingMatrix(type, dto.getPricing());
        double minPrice = dto.getPricing().stream().mapToDouble(VillaPricingRequestDTO::getPrice).min().orElseThrow();

        villa.setName(dto.getName());
        villa.setDescription(dto.getDescription());
        villa.setType(type);
        villa.setPricePerNight(minPrice);
        villa.setMaxGuests(maxAllowedGuests(type));
        villa.setAmenities(joinList(dto.getAmenities()));
        villa.setImageUrls(joinList(dto.getImageUrls()));

        Villa saved = villaRepository.save(villa);
        villaPricingRepository.deleteByVillaId(saved.getId());
        villaPricingRepository.flush();
        savePricing(saved, dto.getPricing());
        return toResponse(saved);
    }

    @Transactional
    public void deleteVilla(Long id) {
        Villa villa = villaRepository.findByIdAndIsDeletedFalse(id)
            .orElseThrow(() -> new ResourceNotFoundException("Villa not found with id: " + id));

        LocalDate today = LocalDate.now();
        boolean hasActiveOrUpcoming = bookingRepository
                .existsByVilla_IdAndStatusNotAndCheckOutDateGreaterThanEqual(villa.getId(), BookingStatus.CANCELLED, today);
        if (hasActiveOrUpcoming) {
            throw new IllegalStateException("Cannot delete villa because it has a booking today or in the future.");
        }

        Long villaId = villa.getId();

        // PURGE delete: remove ALL data related to this villa (including past data)
        // Order matters due to FKs: Review -> Booking, Payment -> Booking, Booking -> Villa/Promotion, Promotion -> Villa
        List<Long> bookingIds = bookingRepository.findBookingIdsForVillaPurge(villaId, villa.getName());
        if (!bookingIds.isEmpty()) {
            reviewRepository.deleteByBookingIds(bookingIds);
            reviewRepository.flush();

            paymentRepository.deleteByBookingIds(bookingIds);
            paymentRepository.flush();

            bookingRepository.deleteByBookingIds(bookingIds);
            bookingRepository.flush();
        }

        // Promotions must be deleted AFTER any bookings that reference them are removed
        promotionRepository.deleteByVilla_Id(villaId);
        promotionRepository.flush();

        villaPricingRepository.deleteByVillaId(villaId);
        villaPricingRepository.flush();

        villaRepository.delete(villa);
    }

    public List<VillaResponse> getAllVillas() {
        return villaRepository.findAllByIsDeletedFalse().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public List<VillaResponse> getAllAdminVillas() {
        List<Villa> villas = villaRepository.findAllByIsDeletedFalse();
        LocalDate today = LocalDate.now();
        Set<Long> villaIdsWithBookings = new HashSet<>(
                bookingRepository.findDistinctVillaIdsWithActiveOrUpcomingBookings(today, BookingStatus.CANCELLED)
        );
        return villas.stream().map(v -> {
            VillaResponse resp = toResponse(v);
            resp.setHasBookings(villaIdsWithBookings.contains(v.getId()));
            return resp;
        }).toList();
    }

    public VillaResponse getVillaById(Long id) {
        Villa villa = villaRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Villa not found with id: " + id));
        return toResponse(villa);
    }

        public AdminVillaResponse getAdminVillaById(Long id) {
        Villa villa = villaRepository.findByIdAndIsDeletedFalse(id)
            .orElseThrow(() -> new ResourceNotFoundException("Villa not found with id: " + id));
        var pricing = villaPricingRepository.findByVillaIdOrderByGuestCountAscMealPlanAsc(id)
            .stream()
            .map(p -> VillaPricingResponseDTO.builder()
                .id(p.getId())
                .guestCount(p.getGuestCount())
                .mealPlan(p.getMealPlan().name())
                .price(p.getPrice())
                .build())
            .toList();

        return AdminVillaResponse.builder()
            .villa(toResponse(villa))
            .pricing(pricing)
            .build();
        }

        public VillaPriceResponse getDynamicPrice(Long villaId, int guests, String mealPlanRaw) {
        MealPlan mealPlan = parseMealPlan(mealPlanRaw);
        Villa villa = villaRepository.findByIdAndIsDeletedFalse(villaId)
            .orElseThrow(() -> new ResourceNotFoundException("Villa not found with id: " + villaId));

        validateGuestCountAgainstType(villa.getType(), guests);

        VillaPricing pricing = villaPricingRepository
            .findByVillaIdAndGuestCountAndMealPlan(villaId, guests, mealPlan)
            .orElseThrow(() -> new ResourceNotFoundException(
                "Pricing not found for villaId=" + villaId + ", guests=" + guests + ", mealPlan=" + mealPlan));

        return VillaPriceResponse.builder()
            .villaId(villaId)
            .guestCount(guests)
            .mealPlan(mealPlan.name())
            .pricePerNight(pricing.getPrice())
            .build();
        }

    private String joinList(List<String> list) {
        if (list == null || list.isEmpty()) return "";
        return String.join(",", list);
    }

    public VillaResponse toResponse(Villa villa) {
        Double avg = reviewRepository.findAverageRatingByVillaId(villa.getId()).orElse(0.0);
        long count = reviewRepository.countByVilla_Id(villa.getId());

        Double minPrice = null;
        Integer minGuests = null;
        String minMealPlan = null;
        var min = villaPricingRepository.findTopByVillaIdOrderByPriceAscGuestCountAscMealPlanAsc(villa.getId());
        if (min.isPresent()) {
            minPrice = min.get().getPrice();
            minGuests = min.get().getGuestCount();
            minMealPlan = min.get().getMealPlan().name();
        }

        List<Integer> allowed = allowedGuestCounts(villa.getType());
        return VillaResponse.builder()
                .id(villa.getId())
                .name(villa.getName())
                .description(villa.getDescription())
                .type(villa.getType() != null ? villa.getType().name() : null)
                .pricePerNight(minPrice != null ? minPrice : villa.getPricePerNight())
                .maxGuests(villa.getMaxGuests())
                .amenities(villa.getAmenitiesList())
                .imageUrls(villa.getImageUrlsList())
                .createdAt(villa.getCreatedAt())
                .updatedAt(villa.getUpdatedAt())
                .averageRating(Math.round(avg * 10.0) / 10.0)
                .reviewCount(count)
                .minPrice(minPrice)
                .minPriceGuestCount(minGuests)
                .minPriceMealPlan(minMealPlan)
                .allowedGuestCounts(allowed)
                .build();
    }

    private void savePricing(Villa villa, List<VillaPricingRequestDTO> pricing) {
        if (pricing == null) return;
        List<VillaPricing> rows = pricing.stream()
                .map(p -> VillaPricing.builder()
                        .villa(villa)
                        .guestCount(p.getGuestCount())
                        .mealPlan(parseMealPlan(p.getMealPlan()))
                        .price(p.getPrice())
                        .build())
                .toList();
        villaPricingRepository.saveAll(rows);
    }

    private VillaType parseVillaType(String raw) {
        try {
            return VillaType.valueOf(raw.trim().toUpperCase());
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid villa type. Use DELUXE or SUPERIOR.");
        }
    }

    private MealPlan parseMealPlan(String raw) {
        try {
            return MealPlan.valueOf(raw.trim().toUpperCase());
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid meal plan.");
        }
    }

    private List<Integer> allowedGuestCounts(VillaType type) {
        if (type == null) return List.of();
        return switch (type) {
            case DELUXE -> List.of(2, 3);
            case SUPERIOR -> List.of(2, 3, 4, 5, 6);
        };
    }

    private int maxAllowedGuests(VillaType type) {
        return allowedGuestCounts(type).stream().mapToInt(Integer::intValue).max().orElse(0);
    }

    private void validateGuestCountAgainstType(VillaType type, int guests) {
        if (type == null) return; // legacy villas without type
        if (!allowedGuestCounts(type).contains(guests)) {
            throw new IllegalArgumentException(
                    "Guest count " + guests + " is not allowed for villa type " + type);
        }
    }

    private void validatePricingMatrix(VillaType type, List<VillaPricingRequestDTO> pricing) {
        if (pricing == null || pricing.isEmpty()) {
            throw new IllegalArgumentException("Pricing is required.");
        }

        List<Integer> allowedGuests = allowedGuestCounts(type);
        List<MealPlan> mealPlans = List.of(MealPlan.ROOM_ONLY, MealPlan.BED_AND_BREAKFAST, MealPlan.HALF_BOARD, MealPlan.FULL_BOARD);

        record Key(int guests, MealPlan mealPlan) {}

        java.util.Set<Key> seen = new java.util.HashSet<>();
        java.util.Map<Key, Double> priceMap = new java.util.HashMap<>();
        for (VillaPricingRequestDTO row : pricing) {
            if (row.getGuestCount() == null || row.getGuestCount() < 1) {
                throw new IllegalArgumentException("Invalid guestCount in pricing.");
            }
            if (!allowedGuests.contains(row.getGuestCount())) {
                throw new IllegalArgumentException(
                        "Guest count " + row.getGuestCount() + " is not allowed for villa type " + type);
            }
            MealPlan mp = parseMealPlan(row.getMealPlan());
            if (row.getPrice() == null || row.getPrice() <= 0) {
                throw new IllegalArgumentException("Price must be positive.");
            }
            Key key = new Key(row.getGuestCount(), mp);
            if (!seen.add(key)) {
                throw new IllegalArgumentException("Duplicate pricing entry for guests=" + row.getGuestCount() + ", mealPlan=" + mp);
            }
            priceMap.put(key, row.getPrice());
        }

        java.util.List<String> missing = new java.util.ArrayList<>();
        for (Integer guests : allowedGuests) {
            for (MealPlan mp : mealPlans) {
                if (!seen.contains(new Key(guests, mp))) {
                    missing.add(guests + "-" + mp.name());
                }
            }
        }
        if (!missing.isEmpty()) {
            throw new IllegalArgumentException(
                    "Pricing matrix incomplete. Missing entries: " + String.join(", ", missing));
        }

        // Strict increasing validation:
        // - If guest count increases (same meal plan), price must strictly increase
        // - If meal plan increases (same guest count), price must strictly increase
        for (MealPlan mp : mealPlans) {
            for (int i = 1; i < allowedGuests.size(); i++) {
                int prevG = allowedGuests.get(i - 1);
                int nextG = allowedGuests.get(i);
                double prev = priceMap.get(new Key(prevG, mp));
                double next = priceMap.get(new Key(nextG, mp));
                if (next <= prev) {
                    throw new IllegalArgumentException(
                            "Invalid pricing: for mealPlan=" + mp.name() + ", guests=" + nextG + " price must be greater than guests=" + prevG + ".");
                }
            }
        }

        for (Integer guests : allowedGuests) {
            for (int i = 1; i < mealPlans.size(); i++) {
                MealPlan prevMp = mealPlans.get(i - 1);
                MealPlan nextMp = mealPlans.get(i);
                double prev = priceMap.get(new Key(guests, prevMp));
                double next = priceMap.get(new Key(guests, nextMp));
                if (next <= prev) {
                    throw new IllegalArgumentException(
                            "Invalid pricing: for guests=" + guests + ", mealPlan=" + nextMp.name() + " price must be greater than mealPlan=" + prevMp.name() + ".");
                }
            }
        }
    }
}
