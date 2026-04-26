package com.holidayVilla.holiday_villa_system.dto;

public class HistoryPoint {
    private String year_month;
    private double occupancy_pct;
    private double revenue;
    private int bookings;

    public String getYear_month() { return year_month; }
    public void setYear_month(String year_month) { this.year_month = year_month; }
    public double getOccupancy_pct() { return occupancy_pct; }
    public void setOccupancy_pct(double occupancy_pct) { this.occupancy_pct = occupancy_pct; }
    public double getRevenue() { return revenue; }
    public void setRevenue(double revenue) { this.revenue = revenue; }
    public int getBookings() { return bookings; }
    public void setBookings(int bookings) { this.bookings = bookings; }
}
