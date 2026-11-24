package com.corporate.travel.dto;


//import lombok.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DepartmentSpendDto {
    private String departmentName;
    private Long totalTrips;
    private BigDecimal totalReimbursedSpend;
}
