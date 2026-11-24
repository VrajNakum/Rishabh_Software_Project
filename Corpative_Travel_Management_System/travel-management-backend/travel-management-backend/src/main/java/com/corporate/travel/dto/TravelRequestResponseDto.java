package com.corporate.travel.dto;


import com.corporate.travel.enums.RequestStatus;
import com.corporate.travel.enums.TravelClass;

//import lombok.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TravelRequestResponseDto {
    private Long id;
    private Long employeeId;
    private String employeeName;
    private String departmentName;
    private String destination;
    private LocalDate startDate;
    private LocalDate endDate;
    private String purpose;
    private BigDecimal estimatedBudget;
    private TravelClass travelClass;
    private RequestStatus status;
    private Long managerId;
    private String managerName;
    private Long financeId;
    private String financeName;
    private Boolean policyViolated;
    private String policyViolationReason;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
