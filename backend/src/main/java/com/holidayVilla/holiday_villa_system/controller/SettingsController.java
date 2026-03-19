package com.holidayVilla.holiday_villa_system.controller;

import com.holidayVilla.holiday_villa_system.dto.SessionTimeoutResponse;
import com.holidayVilla.holiday_villa_system.dto.SessionTimeoutUpdateRequest;
import com.holidayVilla.holiday_villa_system.service.SystemSettingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/settings")
@RequiredArgsConstructor
public class SettingsController {

    private final SystemSettingService systemSettingService;

    @GetMapping("/session-timeout")
    public ResponseEntity<SessionTimeoutResponse> getSessionTimeout() {
        return ResponseEntity.ok(SessionTimeoutResponse.builder()
                .minutes(systemSettingService.getSessionTimeoutMinutes())
                .build());
    }

    @PutMapping("/session-timeout")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SessionTimeoutResponse> updateSessionTimeout(@Valid @RequestBody SessionTimeoutUpdateRequest request) {
        int updated = systemSettingService.setSessionTimeoutMinutes(request.getMinutes());
        return ResponseEntity.ok(SessionTimeoutResponse.builder().minutes(updated).build());
    }
}
