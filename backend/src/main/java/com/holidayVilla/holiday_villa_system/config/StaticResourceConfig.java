package com.holidayVilla.holiday_villa_system.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Paths;

@Configuration
public class StaticResourceConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String uploadsDir = Paths.get("uploads", "villas").toAbsolutePath().normalize().toUri().toString();
        if (!uploadsDir.endsWith("/")) uploadsDir = uploadsDir + "/";

        registry.addResourceHandler("/uploads/villas/**")
                .addResourceLocations(uploadsDir);
    }
}
