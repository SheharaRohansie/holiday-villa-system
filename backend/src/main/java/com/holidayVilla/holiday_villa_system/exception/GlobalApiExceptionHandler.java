package com.holidayVilla.holiday_villa_system.exception;

import io.netty.handler.timeout.ReadTimeoutException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.reactive.function.client.WebClientRequestException;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeoutException;

@RestControllerAdvice
public class GlobalApiExceptionHandler {

    @ExceptionHandler(WebClientResponseException.class)
    public ResponseEntity<Map<String, String>> handleWebClient(WebClientResponseException e) {
        HttpStatus status = HttpStatus.resolve(e.getStatusCode().value());
        if (status == null) status = HttpStatus.BAD_GATEWAY;

        Map<String, String> body = new HashMap<>();
        body.put("message", "ML service error");
        body.put("details", e.getResponseBodyAsString());
        return ResponseEntity.status(status).body(body);
    }

    @ExceptionHandler(WebClientRequestException.class)
    public ResponseEntity<Map<String, String>> handleWebClientRequest(WebClientRequestException e) {
        Map<String, String> body = new HashMap<>();
        body.put("message", "ML service unavailable");
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(body);
    }

    @ExceptionHandler({TimeoutException.class, ReadTimeoutException.class})
    public ResponseEntity<Map<String, String>> handleTimeout(Exception e) {
        Map<String, String> body = new HashMap<>();
        body.put("message", "ML service timeout");
        return ResponseEntity.status(HttpStatus.GATEWAY_TIMEOUT).body(body);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> handleFallback(Exception e) {
        Map<String, String> body = new HashMap<>();
        body.put("message", "Unexpected server error");
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(body);
    }
}