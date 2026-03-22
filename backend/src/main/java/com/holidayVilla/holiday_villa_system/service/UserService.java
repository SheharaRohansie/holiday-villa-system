package com.holidayVilla.holiday_villa_system.service;

import com.holidayVilla.holiday_villa_system.dto.CreateStaffRequest;
import com.holidayVilla.holiday_villa_system.dto.UpdateProfileRequest;
import com.holidayVilla.holiday_villa_system.dto.UserResponse;
import com.holidayVilla.holiday_villa_system.entity.Role;
import com.holidayVilla.holiday_villa_system.entity.User;
import com.holidayVilla.holiday_villa_system.exception.EmailAlreadyExistsException;
import com.holidayVilla.holiday_villa_system.exception.ResourceNotFoundException;
import com.holidayVilla.holiday_villa_system.repository.BookingRepository;
import com.holidayVilla.holiday_villa_system.repository.PaymentRepository;
import com.holidayVilla.holiday_villa_system.repository.ReviewRepository;
import com.holidayVilla.holiday_villa_system.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final BookingRepository bookingRepository;
    private final ReviewRepository reviewRepository;
    private final PaymentRepository paymentRepository;

    // Admin: create staff account
    public UserResponse createStaff(CreateStaffRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new EmailAlreadyExistsException("Email already in use: " + request.getEmail());
        }

        validateIdentityDocument(request.getNationality(), request.getNic(), request.getPassportNumber());

        User user = User.builder()
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .nationality(request.getNationality())
                .nic(request.getNic())
                .passportNumber(request.getPassportNumber())
                .phoneNumber(request.getPhoneNumber())
                .role(Role.STAFF)
                .build();

        return toResponse(userRepository.save(user));
    }

    // Admin: get all users
    public List<UserResponse> getAllUsers() {
        return userRepository.findAll().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    // Admin: get all staff
    public List<UserResponse> getAllStaff() {
        return userRepository.findAll().stream()
                .filter(u -> u.getRole() == Role.STAFF)
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    // Admin: get all guests
    public List<UserResponse> getAllGuests() {
        return userRepository.findAll().stream()
                .filter(u -> u.getRole() == Role.GUEST)
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    // Admin: delete user
    public void deleteUser(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));
        userRepository.delete(user);
    }

    /**
     * Guest: delete own account.
     *
     * Deletion order matters due to foreign keys:
     * payments -> reviews -> bookings -> user
     */
    @Transactional
    public void deleteMyAccount(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + email));

        Long userId = user.getId();
        paymentRepository.deleteByUserId(userId);
        reviewRepository.deleteByUserId(userId);
        bookingRepository.deleteByUserId(userId);
        userRepository.delete(user);
    }

    // Get user by ID
    public UserResponse getUserById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));
        return toResponse(user);
    }

    // Update profile (admin can update email/password, any user their own profile)
    public UserResponse updateProfile(Long id, UpdateProfileRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));

        if (request.getEmail() != null && !request.getEmail().isBlank()) {
            if (!request.getEmail().equals(user.getEmail()) && userRepository.existsByEmail(request.getEmail())) {
                throw new EmailAlreadyExistsException("Email already in use: " + request.getEmail());
            }
            user.setEmail(request.getEmail());
        }

        if (request.getNewPassword() != null && !request.getNewPassword().isBlank()) {
            if (request.getCurrentPassword() == null || request.getCurrentPassword().isBlank()) {
                throw new IllegalArgumentException("Current password is required to set a new password");
            }
            if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
                throw new IllegalArgumentException("Current password is incorrect");
            }
            user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        }

        return toResponse(userRepository.save(user));
    }

    private void validateIdentityDocument(String nationality, String nic, String passportNumber) {
        if ("Sri Lanka".equalsIgnoreCase(nationality)) {
            if (nic == null || nic.isBlank()) {
                throw new IllegalArgumentException("NIC is required for Sri Lankan nationals");
            }
        } else {
            if (passportNumber == null || passportNumber.isBlank()) {
                throw new IllegalArgumentException("Passport number is required for non-Sri Lankan nationals");
            }
        }
    }

    public UserResponse toResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .email(user.getEmail())
                .phoneNumber(user.getPhoneNumber())
                .nationality(user.getNationality())
                .nic(user.getNic())
                .passportNumber(user.getPassportNumber())
                .role(user.getRole())
                .createdAt(user.getCreatedAt())
                .build();
    }
}
