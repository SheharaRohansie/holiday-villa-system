package com.holidayVilla.holiday_villa_system.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class RevenueAnalyticsResponse {

    private Double totalRevenue;
    private Double totalAdvancePayments;
    private Double totalRemainingPayments;
    private Double totalFullPayments;

    private Long totalBookings;
    private Long totalCompletedBookings;
    private Long totalPendingPayments;   // PARTIALLY_PAID bookings count

    // Discount / promotion analytics
    private Double totalDiscountGiven;
    private Double revenueBeforeDiscount;
    private Double revenueAfterDiscount;
    private Long bookingsWithPromotion;
    private String mostUsedPromotion;

    private List<MonthlyRevenue> monthlyRevenue;

    @Data
    @Builder
    public static class MonthlyRevenue {
        private int year;
        private int month;
        private String monthLabel;   // e.g. "Jan 2026"
        private Double revenue;
    }
}
