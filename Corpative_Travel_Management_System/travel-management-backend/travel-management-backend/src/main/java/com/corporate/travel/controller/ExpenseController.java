package com.corporate.travel.controller;


import com.corporate.travel.dto.ExpenseCreateDto;
import com.corporate.travel.dto.ExpenseResponseDto;
import com.corporate.travel.enums.ReimbursementStatus;
import com.corporate.travel.service.ExpenseService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/expenses")
@PreAuthorize("isAuthenticated()")
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
    @PreAuthorize("hasAnyRole('FINANCE', 'ADMIN')")
    public ResponseEntity<ExpenseResponseDto> updateReimbursementStatus(
            @PathVariable Long expenseId,
            @RequestParam ReimbursementStatus status) {
        return ResponseEntity.ok(expenseService.updateReimbursementStatus(expenseId, status));
    }
}
