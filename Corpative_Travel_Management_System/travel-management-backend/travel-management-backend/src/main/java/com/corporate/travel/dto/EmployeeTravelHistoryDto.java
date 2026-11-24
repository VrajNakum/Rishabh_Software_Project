package com.corporate.travel.dto;


//import lombok.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmployeeTravelHistoryDto {
    private Long employeeId;
    private String employeeName;
    private String departmentName;
    private int totalTrips;
    private BigDecimal totalReimbursedAmount;
    private List<TravelRequestResponseDto> travelHistory;
}
