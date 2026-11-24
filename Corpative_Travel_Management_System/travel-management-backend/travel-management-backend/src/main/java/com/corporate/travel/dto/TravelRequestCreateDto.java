package com.corporate.travel.dto;


import com.corporate.travel.enums.TravelClass;

//import jakarta.validation.constraints.*;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

//import lombok.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TravelRequestCreateDto {
    @NotNull(message = "Employee ID is required")
    private Long employeeId;

    @NotBlank(message = "Destination is required")
    @Size(max = 150, message = "Destination cannot exceed 150 characters")
    private String destination;

    @NotNull(message = "Start date is required")
    @FutureOrPresent(message = "Start date must be today or in the future")
    private LocalDate startDate;

    @NotNull(message = "End date is required")
    @FutureOrPresent(message = "End date must be today or in the future")
    private LocalDate endDate;

    @NotBlank(message = "Purpose is required")
    @Size(max = 500, message = "Purpose cannot exceed 500 characters")
    private String purpose;

    @NotNull(message = "Estimated budget is required")
    @DecimalMin(value = "0.01", message = "Estimated budget must be greater than zero")
    private BigDecimal estimatedBudget;

    @NotNull(message = "Travel class is required")
    private TravelClass travelClass;

    // If true, request is saved as DRAFT; if false, it is submitted directly (PENDING_MANAGER)
    private boolean draft;
}
