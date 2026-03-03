package com.holidayVilla.holiday_villa_system.controller;

import com.holidayVilla.holiday_villa_system.dto.VillaRequestDTO;
import com.holidayVilla.holiday_villa_system.dto.VillaResponse;
import com.holidayVilla.holiday_villa_system.service.VillaService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class VillaController {

    private final VillaService villaService;

    // ---- PUBLIC endpoints ----

    @GetMapping("/api/villas")
    public ResponseEntity<List<VillaResponse>> getAllVillas() {
        return ResponseEntity.ok(villaService.getAllVillas());
    }

    @GetMapping("/api/villas/{id}")
    public ResponseEntity<VillaResponse> getVillaById(@PathVariable Long id) {
        return ResponseEntity.ok(villaService.getVillaById(id));
    }

    // ---- ADMIN endpoints ----

    @PostMapping("/api/admin/villas")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<VillaResponse> addVilla(@Valid @RequestBody VillaRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(villaService.addVilla(request));
    }

    @PutMapping("/api/admin/villas/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<VillaResponse> updateVilla(
            @PathVariable Long id,
            @Valid @RequestBody VillaRequestDTO request) {
        return ResponseEntity.ok(villaService.updateVilla(id, request));
    }

    @DeleteMapping("/api/admin/villas/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteVilla(@PathVariable Long id) {
        villaService.deleteVilla(id);
        return ResponseEntity.noContent().build();
    }
}
