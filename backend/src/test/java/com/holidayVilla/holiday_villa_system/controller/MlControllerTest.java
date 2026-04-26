package com.holidayVilla.holiday_villa_system.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.holidayVilla.holiday_villa_system.dto.PredictRequest;
import com.holidayVilla.holiday_villa_system.dto.PredictResponse;
import com.holidayVilla.holiday_villa_system.service.MlPredictionService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc(addFilters = false)
@WebMvcTest(MlController.class)
class MlControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private MlPredictionService mlPredictionService;

    @Test
    void predictReturnsResponse() throws Exception {
        PredictRequest request = new PredictRequest();
        request.setChalet_name("Cinnamon");
        request.setYear_month("2026-05");

        PredictResponse response = new PredictResponse();
        response.setChalet_name("Cinnamon");
        response.setYear_month("2026-05");
        response.setPredicted_occupancy_pct(82.5);
        response.setCi_low(75.2);
        response.setCi_high(88.9);
        response.setPredicted_revenue(1250000.0);

        when(mlPredictionService.predict(any(PredictRequest.class))).thenReturn(response);

        mockMvc.perform(post("/api/ml/predict")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.chalet_name").value("Cinnamon"))
            .andExpect(jsonPath("$.year_month").value("2026-05"))
            .andExpect(jsonPath("$.predicted_occupancy_pct").value(82.5));
    }
}
