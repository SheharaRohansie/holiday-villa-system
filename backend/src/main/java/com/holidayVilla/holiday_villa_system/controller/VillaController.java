package com.holidayVilla.holiday_villa_system.controller;

import com.holidayVilla.holiday_villa_system.dto.VillaRequestDTO;
import com.holidayVilla.holiday_villa_system.dto.VillaResponse;
import com.holidayVilla.holiday_villa_system.dto.AdminVillaResponse;
import com.holidayVilla.holiday_villa_system.dto.BookedDateRangeResponse;
import com.holidayVilla.holiday_villa_system.dto.MessageResponse;
import com.holidayVilla.holiday_villa_system.dto.VillaPriceResponse;
import com.holidayVilla.holiday_villa_system.service.BookingService;
import com.holidayVilla.holiday_villa_system.service.VillaService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class VillaController {

    private final VillaService villaService;
    private final BookingService bookingService;

    // ---- PUBLIC endpoints ----

    @GetMapping("/api/villas")
    public ResponseEntity<List<VillaResponse>> getAllVillas() {
        return ResponseEntity.ok(villaService.getAllVillas());
    }

    @GetMapping("/api/villas/{id}")
    public ResponseEntity<VillaResponse> getVillaById(@PathVariable Long id) {
        return ResponseEntity.ok(villaService.getVillaById(id));
    }

    @GetMapping("/api/villas/{id}/price")
    public ResponseEntity<VillaPriceResponse> getVillaPrice(
            @PathVariable Long id,
            @RequestParam int guests,
            @RequestParam String mealPlan) {
        return ResponseEntity.ok(villaService.getDynamicPrice(id, guests, mealPlan));
    }

    @GetMapping("/api/villas/{id}/booked-dates")
    public ResponseEntity<List<BookedDateRangeResponse>> getBookedDates(@PathVariable Long id) {
        return ResponseEntity.ok(bookingService.getBookedDateRanges(id));
    }

    // ---- ADMIN endpoints ----

    @GetMapping("/api/admin/villas")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<VillaResponse>> getAllAdminVillas() {
        return ResponseEntity.ok(villaService.getAllAdminVillas());
    }

    @PostMapping("/api/admin/villas")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<MessageResponse> addVilla(@Valid @RequestBody VillaRequestDTO request) {
        villaService.addVilla(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new MessageResponse("Villa created successfully"));
    }

    @GetMapping("/api/admin/villas/{id:\\d+}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AdminVillaResponse> getAdminVillaById(@PathVariable Long id) {
        return ResponseEntity.ok(villaService.getAdminVillaById(id));
    }

    @PutMapping("/api/admin/villas/{id:\\d+}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<MessageResponse> updateVilla(
            @PathVariable Long id,
            @Valid @RequestBody VillaRequestDTO request) {
        villaService.updateVilla(id, request);
        return ResponseEntity.ok(new MessageResponse("Villa updated successfully"));
    }

    @DeleteMapping("/api/admin/villas/{id:\\d+}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteVilla(@PathVariable Long id) {
        villaService.deleteVilla(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping(value = {"/api/admin/villas/upload-images", "/api/admin/villas/upload-images/"}, consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<String>> uploadVillaImages(
            @RequestPart("images") List<MultipartFile> images) throws IOException {

        if (images == null || images.isEmpty()) {
            throw new IllegalArgumentException("At least one image is required.");
        }

        int maxImages = 5;
        if (images.size() > maxImages) {
            throw new IllegalArgumentException("You can upload up to " + maxImages + " images per villa.");
        }

        long maxBytes = 5L * 1024L * 1024L;
        Path dir = Paths.get("uploads", "villas");
        Files.createDirectories(dir);

        List<String> storedPaths = new ArrayList<>();
        for (MultipartFile file : images) {
            if (file == null || file.isEmpty()) {
                throw new IllegalArgumentException("Image file must not be empty.");
            }
            if (file.getSize() > maxBytes) {
                throw new IllegalArgumentException("Each image must be 5MB or less.");
            }

            String originalName = (file.getOriginalFilename() == null) ? "" : file.getOriginalFilename().toLowerCase();
            boolean okExt = originalName.endsWith(".jpg") || originalName.endsWith(".jpeg") || originalName.endsWith(".png");
            if (!okExt) {
                throw new IllegalArgumentException("Only JPG, JPEG, or PNG images are allowed.");
            }

            String ext = originalName.contains(".") ? originalName.substring(originalName.lastIndexOf('.')) : "";
            String filename = "villa-" + UUID.randomUUID() + ext;
            Path target = dir.resolve(filename).normalize();
            Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);

            storedPaths.add(("/uploads/villas/" + filename).replace('\\', '/'));
        }

        return ResponseEntity.status(HttpStatus.CREATED).body(storedPaths);
    }
}
