package com.holidayVilla.holiday_villa_system.service;

import com.holidayVilla.holiday_villa_system.entity.SystemSetting;
import com.holidayVilla.holiday_villa_system.repository.SystemSettingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class SystemSettingService {

    public static final String SESSION_TIMEOUT_MINUTES_KEY = "session.timeout.minutes";
    private static final int DEFAULT_SESSION_TIMEOUT_MINUTES = 15;

    private final SystemSettingRepository systemSettingRepository;

    public int getSessionTimeoutMinutes() {
        return systemSettingRepository.findById(SESSION_TIMEOUT_MINUTES_KEY)
                .map(SystemSetting::getValue)
                .map(this::safeParseInt)
                .filter(v -> v > 0)
                .orElse(DEFAULT_SESSION_TIMEOUT_MINUTES);
    }

    public int setSessionTimeoutMinutes(int minutes) {
        int safeMinutes = Math.max(1, Math.min(480, minutes));
        systemSettingRepository.save(SystemSetting.builder()
                .key(SESSION_TIMEOUT_MINUTES_KEY)
                .value(String.valueOf(safeMinutes))
                .build());
        return safeMinutes;
    }

    private int safeParseInt(String value) {
        try {
            return Integer.parseInt(value);
        } catch (Exception e) {
            return DEFAULT_SESSION_TIMEOUT_MINUTES;
        }
    }
}
