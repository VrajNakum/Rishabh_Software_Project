package com.corporate.travel.service;

import com.corporate.travel.dto.ExpenseCreateDto;
import com.corporate.travel.dto.ExpenseResponseDto;
import com.corporate.travel.entity.Expense;
import com.corporate.travel.entity.TravelRequest;
import com.corporate.travel.enums.ReimbursementStatus;
import com.corporate.travel.enums.RequestStatus;
import com.corporate.travel.exception.InvalidStateTransitionException;
import com.corporate.travel.exception.ResourceNotFoundException;
import com.corporate.travel.repository.ExpenseRepository;
import com.corporate.travel.repository.TravelRequestRepository;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ExpenseServiceImpl implements ExpenseService{
    private final ExpenseRepository expenseRepository;
    private final TravelRequestRepository travelRequestRepository;

    public ExpenseServiceImpl(
            ExpenseRepository expenseRepository,
            TravelRequestRepository travelRequestRepository) {
        this.expenseRepository = expenseRepository;
        this.travelRequestRepository = travelRequestRepository;
    }

    @Override
    @Transactional
    public ExpenseResponseDto addExpense(Long travelRequestId, ExpenseCreateDto dto) {
        TravelRequest travelRequest = travelRequestRepository.findById(travelRequestId)
                .orElseThrow(() -> new ResourceNotFoundException("Travel request not found with id: " + travelRequestId));

        // Business Rule: Expenses can only be filed after Finance approval (APPROVED)
        if (travelRequest.getStatus() != RequestStatus.APPROVED) {
            throw new InvalidStateTransitionException(
                    "Expenses can only be submitted after Finance approval. Current status: " + travelRequest.getStatus());
        }

        String expensePurpose = (dto.getPurposeOfWork() != null && !dto.getPurposeOfWork().trim().isEmpty())
                ? dto.getPurposeOfWork().trim()
                : travelRequest.getPurpose();

        Expense expense = Expense.builder()
                .travelRequest(travelRequest)
                .category(dto.getCategory())
                .amount(dto.getAmount())
                .receiptFileUrl(dto.getReceiptFileUrl())
                .purposeOfWork(expensePurpose)
                .remarks(dto.getRemarks())
                .status(ReimbursementStatus.PENDING)
                .build();

        Expense saved = expenseRepository.save(expense);
        return mapToDto(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ExpenseResponseDto> getExpensesByRequestId(Long travelRequestId) {
        if (!travelRequestRepository.existsById(travelRequestId)) {
            throw new ResourceNotFoundException("Travel request not found with id: " + travelRequestId);
        }
        return expenseRepository.findByTravelRequestId(travelRequestId)
                .stream()
                .map(this::mapToDto)
                .toList();
    }

    @Override
    @Transactional
    public ExpenseResponseDto updateReimbursementStatus(Long expenseId, ReimbursementStatus newStatus) {
        Expense expense = expenseRepository.findById(expenseId)
                .orElseThrow(() -> new ResourceNotFoundException("Expense not found with id: " + expenseId));

        expense.setStatus(newStatus);
        Expense updated = expenseRepository.save(expense);
        return mapToDto(updated);
    }

    private ExpenseResponseDto mapToDto(Expense expense) {
        return ExpenseResponseDto.builder()
                .id(expense.getId())
                .travelRequestId(expense.getTravelRequest().getId())
                .category(expense.getCategory())
                .amount(expense.getAmount())
                .receiptFileUrl(expense.getReceiptFileUrl())
                .status(expense.getStatus())
                .purposeOfWork(expense.getPurposeOfWork())
                .remarks(expense.getRemarks())
                .createdAt(expense.getCreatedAt())
                .build();
    }
}
