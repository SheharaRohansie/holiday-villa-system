package com.holidayVilla.holiday_villa_system.service;

import com.holidayVilla.holiday_villa_system.dto.HistoryPoint;
import com.holidayVilla.holiday_villa_system.dto.PredictRequest;
import com.holidayVilla.holiday_villa_system.dto.PredictResponse;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.List;

@Service
public class MlPredictionService {

    private final WebClient mlWebClient;

    public MlPredictionService(WebClient mlWebClient) {
        this.mlWebClient = mlWebClient;
    }

    public PredictResponse predict(PredictRequest req) {
        return mlWebClient.post()
            .uri("/predict")
            .contentType(MediaType.APPLICATION_JSON)
            .bodyValue(req)
            .retrieve()
            .bodyToMono(PredictResponse.class)
            .block();
    }

    public List<HistoryPoint> history(String chalet) {
        return mlWebClient.get()
            .uri("/history/{chalet}", chalet)
            .retrieve()
            .bodyToFlux(HistoryPoint.class)
            .collectList()
            .block();
    }
}