package com.holidayVilla.holiday_villa_system.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;

import java.util.Properties;

@Configuration
@EnableConfigurationProperties(AppMailProperties.class)
public class MailConfig {

    @Bean
    public JavaMailSender javaMailSender(AppMailProperties props) {
        JavaMailSenderImpl sender = new JavaMailSenderImpl();
        sender.setHost(props.getHost());
        sender.setPort(props.getPort());
        sender.setUsername(props.getUsername());
        sender.setPassword(props.getPassword());

        Properties javaProps = sender.getJavaMailProperties();
        javaProps.put("mail.smtp.auth", Boolean.toString(props.isSmtpAuth()));
        javaProps.put("mail.smtp.starttls.enable", Boolean.toString(props.isStarttlsEnable()));
        javaProps.put("mail.smtp.starttls.required", Boolean.toString(props.isStarttlsRequired()));
        if (props.getSslTrust() != null && !props.getSslTrust().isBlank()) {
            javaProps.put("mail.smtp.ssl.trust", props.getSslTrust());
        }

        return sender;
    }
}
