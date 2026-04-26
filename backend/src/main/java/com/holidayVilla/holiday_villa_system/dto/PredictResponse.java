package com.holidayVilla.holiday_villa_system.dto;

public class PredictResponse {
    private String chalet_name;
    private String year_month;
    private double predicted_occupancy_pct;
    private double ci_low;
    private double ci_high;
    private double predicted_revenue;

    public String getChalet_name() { return chalet_name; }
    public void setChalet_name(String chalet_name) { this.chalet_name = chalet_name; }
    public String getYear_month() { return year_month; }
    public void setYear_month(String year_month) { this.year_month = year_month; }
    public double getPredicted_occupancy_pct() { return predicted_occupancy_pct; }
    public void setPredicted_occupancy_pct(double v) { this.predicted_occupancy_pct = v; }
    public double getCi_low() { return ci_low; }
    public void setCi_low(double ci_low) { this.ci_low = ci_low; }
    public double getCi_high() { return ci_high; }
    public void setCi_high(double ci_high) { this.ci_high = ci_high; }
    public double getPredicted_revenue() { return predicted_revenue; }
    public void setPredicted_revenue(double v) { this.predicted_revenue = v; }
}
