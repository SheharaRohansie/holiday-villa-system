package com.holidayVilla.holiday_villa_system.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.*;

@Entity
@Table(
        name = "villa_pricing",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_villa_guest_meal", columnNames = {"villa_id", "guest_count", "meal_plan"})
        },
        indexes = {
                @Index(name = "idx_villa_pricing_villa", columnList = "villa_id"),
                @Index(name = "idx_villa_pricing_price", columnList = "price")
        }
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VillaPricing {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "villa_id", nullable = false)
    private Villa villa;

    @NotNull
    @Min(1)
    @Column(name = "guest_count", nullable = false)
    private Integer guestCount;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "meal_plan", nullable = false)
    private MealPlan mealPlan;

    @NotNull
    @Positive
    @Column(nullable = false)
    private Double price;
}
