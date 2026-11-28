package com.corporate.travel.dto;


import com.corporate.travel.enums.ExpenseCategory;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExpenseCreateDto {
    @NotNull(message = "Expense category is required (FOOD, STAY, TRANSPORT, OTHER)")
    private ExpenseCategory category;

    @NotNull(message = "Amount is required")
    @DecimalMin(value = "0.01", message = "Expense amount must be greater than zero")
    private BigDecimal amount;

    // Simulated file storage URL (e.g. "uploads/receipts/flight_ticket_101.pdf")
    private String receiptFileUrl;

    private String purposeOfWork;

    private String remarks;
}
