package com.corporate.travel.service;

import com.corporate.travel.dto.ExpenseCreateDto;
import com.corporate.travel.dto.ExpenseResponseDto;
import com.corporate.travel.enums.ReimbursementStatus;

import java.util.List;

public interface ExpenseService {
    ExpenseResponseDto addExpense(Long travelRequestId, ExpenseCreateDto dto);
    List<ExpenseResponseDto> getExpensesByRequestId(Long travelRequestId);
    ExpenseResponseDto updateReimbursementStatus(Long expenseId, ReimbursementStatus newStatus);
}
