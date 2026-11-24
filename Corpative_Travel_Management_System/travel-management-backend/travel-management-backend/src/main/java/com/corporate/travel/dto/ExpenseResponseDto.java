package com.corporate.travel.dto;


import com.corporate.travel.enums.ExpenseCategory;
import com.corporate.travel.enums.ReimbursementStatus;
//import lombok.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExpenseResponseDto {
    private Long id;
    private Long travelRequestId;
    private ExpenseCategory category;
    private BigDecimal amount;
    private String receiptFileUrl;
    private ReimbursementStatus status;
    private String purposeOfWork;
    private String remarks;
    private LocalDateTime createdAt;
}
