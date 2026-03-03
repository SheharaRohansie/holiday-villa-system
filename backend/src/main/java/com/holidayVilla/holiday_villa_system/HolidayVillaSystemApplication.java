package com.holidayVilla.holiday_villa_system;

import com.holidayVilla.holiday_villa_system.entity.Role;
import com.holidayVilla.holiday_villa_system.entity.User;
import com.holidayVilla.holiday_villa_system.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.security.crypto.password.PasswordEncoder;

@SpringBootApplication
@RequiredArgsConstructor
public class HolidayVillaSystemApplication {

	public static void main(String[] args) {
		SpringApplication.run(HolidayVillaSystemApplication.class, args);
	}

	@Bean
	public CommandLineRunner seedAdminUser(UserRepository userRepository, PasswordEncoder passwordEncoder) {
		return args -> {
			String adminEmail = "admin@holidayvilla.com";
			if (!userRepository.existsByEmail(adminEmail)) {
				User admin = User.builder()
						.firstName("Admin")
						.lastName("Villa")
						.email(adminEmail)
						.password(passwordEncoder.encode("Admin@123"))
						.nationality("Sri Lanka")
						.nic("000000000V")
						.passportNumber(null)
						.phoneNumber("+94700000000")
						.role(Role.ADMIN)
						.build();
				userRepository.save(admin);
				System.out.println("✅ Default admin account created: " + adminEmail);
			} else {
				System.out.println("ℹ️  Admin account already exists, skipping seed.");
			}
		};
	}
}

