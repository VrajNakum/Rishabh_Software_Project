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
public class CostSummaryReportDto {
    private long totalRequests;
    private long approvedRequests;
    private long pendingRequests;
    private long rejectedRequests;
    private BigDecimal totalEstimatedBudget;
    private BigDecimal totalActualReimbursedSpend;
}
