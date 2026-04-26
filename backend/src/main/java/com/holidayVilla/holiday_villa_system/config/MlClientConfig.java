package com.holidayVilla.holiday_villa_system.config;

import io.netty.channel.ChannelOption;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.netty.http.client.HttpClient;

import java.time.Duration;

@Configuration
public class MlClientConfig {

    @Bean
    WebClient mlWebClient(
            WebClient.Builder builder,
            @Value("${ml.api.base-url}") String baseUrl,
            @Value("${ml.api.connect-timeout-ms}") int connectTimeoutMs,
            @Value("${ml.api.read-timeout-ms}") long readTimeoutMs) {

        HttpClient httpClient = HttpClient.create()
            .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, connectTimeoutMs)
            .responseTimeout(Duration.ofMillis(readTimeoutMs));

        return builder
            .baseUrl(baseUrl)
            .clientConnector(new ReactorClientHttpConnector(httpClient))
            .build();
    }
}