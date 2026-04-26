package com.holidayVilla.holiday_villa_system.dto;

public class PredictRequest {
    private String chalet_name;
    private String year_month;

    public String getChalet_name() { return chalet_name; }
    public void setChalet_name(String chalet_name) { this.chalet_name = chalet_name; }

    public String getYear_month() { return year_month; }
    public void setYear_month(String year_month) { this.year_month = year_month; }
}