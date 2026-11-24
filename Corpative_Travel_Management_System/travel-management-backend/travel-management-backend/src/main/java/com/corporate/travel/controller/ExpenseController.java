package com.corporate.travel.controller;


import com.corporate.travel.dto.ExpenseCreateDto;
import com.corporate.travel.dto.ExpenseResponseDto;
import com.corporate.travel.enums.ReimbursementStatus;
import com.corporate.travel.service.ExpenseService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
//import org.springframework.web.bind.annotation.*;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/expenses")
public class ExpenseController {
    private final ExpenseService expenseService;

    public ExpenseController(ExpenseService expenseService) {
        this.expenseService = expenseService;
    }

    @PostMapping("/request/{travelRequestId}")
    public ResponseEntity<ExpenseResponseDto> addExpense(
            @PathVariable Long travelRequestId,
            @Valid @RequestBody ExpenseCreateDto dto) {
        ExpenseResponseDto created = expenseService.addExpense(travelRequestId, dto);
        return new ResponseEntity<>(created, HttpStatus.CREATED);
    }

    @GetMapping("/request/{travelRequestId}")
    public ResponseEntity<List<ExpenseResponseDto>> getExpensesByRequestId(@PathVariable Long travelRequestId) {
        return ResponseEntity.ok(expenseService.getExpensesByRequestId(travelRequestId));
    }

    @PatchMapping("/{expenseId}/reimbursement-status")
    public ResponseEntity<ExpenseResponseDto> updateReimbursementStatus(
            @PathVariable Long expenseId,
            @RequestParam ReimbursementStatus status) {
        return ResponseEntity.ok(expenseService.updateReimbursementStatus(expenseId, status));
    }
}
