package com.holidayVilla.holiday_villa_system.config;

import com.holidayVilla.holiday_villa_system.security.JwtAuthenticationFilter;
import com.holidayVilla.holiday_villa_system.security.RestAccessDeniedHandler;
import com.holidayVilla.holiday_villa_system.security.RestAuthenticationEntryPoint;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthFilter;
    private final UserDetailsService userDetailsService;
    private final RestAuthenticationEntryPoint restAuthenticationEntryPoint;
    private final RestAccessDeniedHandler restAccessDeniedHandler;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(cors -> cors.configure(http))
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint(restAuthenticationEntryPoint)
                .accessDeniedHandler(restAccessDeniedHandler)
            )
            .authorizeHttpRequests(auth -> auth
                // Public endpoints
                .requestMatchers(HttpMethod.POST, "/api/auth/send-otp").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/auth/register").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/auth/login").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/auth/forgot-password/send-otp").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/auth/forgot-password/reset").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/public/**").permitAll()
                // Public villa read-only access (guests and unauthenticated users)
                .requestMatchers(HttpMethod.GET, "/api/villas").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/villas/**").permitAll()
                // Public promotion endpoints
                .requestMatchers(HttpMethod.GET, "/api/promotions/active").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/promotions/applicable").permitAll()
                // Public review read endpoints
                .requestMatchers(HttpMethod.GET, "/api/reviews/villa/**").permitAll()
                // Guest review write endpoints
                .requestMatchers(HttpMethod.POST, "/api/reviews").hasRole("GUEST")
                .requestMatchers(HttpMethod.PUT, "/api/reviews/**").hasRole("GUEST")
                .requestMatchers(HttpMethod.DELETE, "/api/reviews/**").hasRole("GUEST")
                // Admin only
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                // Staff
                .requestMatchers("/api/staff/**").hasAnyRole("ADMIN", "STAFF")
                // Guest booking endpoints
                .requestMatchers("/api/bookings/**").hasRole("GUEST")
                // Guest self-service
                .requestMatchers(HttpMethod.DELETE, "/api/users/me").hasRole("GUEST")
                // Guest payment endpoints
                .requestMatchers(HttpMethod.POST, "/api/payments/pay").hasRole("GUEST")
                .requestMatchers(HttpMethod.GET, "/api/payments/my").hasRole("GUEST")
                // Invoice download – any authenticated user (guests own + admins all)
                .requestMatchers(HttpMethod.GET, "/api/payments/*/invoice").authenticated()
                // Authenticated users
                .requestMatchers("/api/user/**").authenticated()
                .anyRequest().authenticated()
            )
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )
            .authenticationProvider(authenticationProvider())
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder());
        return provider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
