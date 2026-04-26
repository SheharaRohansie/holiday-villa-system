package com.holidayVilla.holiday_villa_system.controller;

import com.holidayVilla.holiday_villa_system.dto.HistoryPoint;
import com.holidayVilla.holiday_villa_system.dto.PredictRequest;
import com.holidayVilla.holiday_villa_system.dto.PredictResponse;
import com.holidayVilla.holiday_villa_system.service.MlPredictionService;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/ml")
@CrossOrigin(origins = "http://localhost:5173")
public class MlController {

    private final MlPredictionService service;

    public MlController(MlPredictionService service) {
        this.service = service;
    }

    @PostMapping("/predict")
    public PredictResponse predict(@RequestBody PredictRequest req) {
        return service.predict(req);
    }

    @GetMapping("/history/{chalet}")
    public List<HistoryPoint> history(@PathVariable String chalet) {
        return service.history(chalet);
    }
}