package com.holidayVilla.holiday_villa_system.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Data
@ConfigurationProperties(prefix = "app.mail")
public class AppMailProperties {

    private boolean enabled = false;

    private String host;

    private int port = 587;

    private String username;

    private String password;

    private boolean smtpAuth = true;

    private boolean starttlsEnable = true;

    private boolean starttlsRequired = true;

    private String sslTrust = "smtp.gmail.com";
}
