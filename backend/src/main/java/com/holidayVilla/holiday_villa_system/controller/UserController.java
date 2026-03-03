package com.holidayVilla.holiday_villa_system.controller;

import com.holidayVilla.holiday_villa_system.dto.CreateStaffRequest;
import com.holidayVilla.holiday_villa_system.dto.UpdateProfileRequest;
import com.holidayVilla.holiday_villa_system.dto.UserResponse;
import com.holidayVilla.holiday_villa_system.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    // ---- ADMIN endpoints ----

    @PostMapping("/admin/staff")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserResponse> createStaff(@Valid @RequestBody CreateStaffRequest request) {
        return ResponseEntity.ok(userService.createStaff(request));
    }

    @GetMapping("/admin/users")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<UserResponse>> getAllUsers() {
        return ResponseEntity.ok(userService.getAllUsers());
    }

    @GetMapping("/admin/staff")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<UserResponse>> getAllStaff() {
        return ResponseEntity.ok(userService.getAllStaff());
    }

    @GetMapping("/admin/guests")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<UserResponse>> getAllGuests() {
        return ResponseEntity.ok(userService.getAllGuests());
    }

    @DeleteMapping("/admin/users/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        userService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }

    // ---- Shared authenticated endpoints ----

    @GetMapping("/user/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<UserResponse> getUserById(@PathVariable Long id) {
        return ResponseEntity.ok(userService.getUserById(id));
    }

    @PutMapping("/user/{id}/profile")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<UserResponse> updateProfile(
            @PathVariable Long id,
            @Valid @RequestBody UpdateProfileRequest request) {
        return ResponseEntity.ok(userService.updateProfile(id, request));
    }
}
