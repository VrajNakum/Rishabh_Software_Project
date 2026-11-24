package com.corporate.travel.service;


import com.corporate.travel.dto.CostSummaryReportDto;
import com.corporate.travel.dto.DepartmentSpendDto;
import com.corporate.travel.dto.EmployeeTravelHistoryDto;
import com.corporate.travel.dto.TravelRequestResponseDto;
import com.corporate.travel.entity.TravelRequest;
import com.corporate.travel.entity.User;
import com.corporate.travel.enums.ReimbursementStatus;
import com.corporate.travel.enums.RequestStatus;
import com.corporate.travel.exception.ResourceNotFoundException;
import com.corporate.travel.repository.ExpenseRepository;
import com.corporate.travel.repository.TravelRequestRepository;
import com.corporate.travel.repository.UserRepository;
// CORRECT SPRING IMPORT
import org.springframework.transaction.annotation.Transactional;
import org.springframework.stereotype.Service;


import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Service
public class ReportServiceImpl implements ReportService{
    private final TravelRequestRepository travelRequestRepository;
    private final ExpenseRepository expenseRepository;
    private final UserRepository userRepository;

    // Explicit constructor injection (SonarQube best practice)
    public ReportServiceImpl(
            TravelRequestRepository travelRequestRepository,
            ExpenseRepository expenseRepository,
            UserRepository userRepository) {
        this.travelRequestRepository = travelRequestRepository;
        this.expenseRepository = expenseRepository;
        this.userRepository = userRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public CostSummaryReportDto getCostSummaryReport() {
        long totalRequests = travelRequestRepository.count();
        long approvedRequests = travelRequestRepository.countByStatus(RequestStatus.APPROVED);
        long pendingRequests = travelRequestRepository.countByStatusIn(List.of(RequestStatus.PENDING_MANAGER, RequestStatus.PENDING_FINANCE));
        long rejectedRequests = travelRequestRepository.countByStatus(RequestStatus.REJECTED);
        BigDecimal totalEstimatedBudget = travelRequestRepository.sumTotalEstimatedBudget();
        BigDecimal totalActualReimbursedSpend = expenseRepository.sumAmountByStatus(ReimbursementStatus.REIMBURSED);

        return CostSummaryReportDto.builder()
                .totalRequests(totalRequests)
                .approvedRequests(approvedRequests)
                .pendingRequests(pendingRequests)
                .rejectedRequests(rejectedRequests)
                .totalEstimatedBudget(totalEstimatedBudget)
                .totalActualReimbursedSpend(totalActualReimbursedSpend != null ? totalActualReimbursedSpend : BigDecimal.ZERO)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<DepartmentSpendDto> getDepartmentSpendReport() {
        List<Object[]> queryResults = expenseRepository.getDepartmentSpendBreakdown(ReimbursementStatus.REIMBURSED);
        List<DepartmentSpendDto> result = new ArrayList<>();

        for (Object[] row : queryResults) {
            String departmentName = (String) row[0];
            Long totalTrips = ((Number) row[1]).longValue();
            BigDecimal totalSpend = (BigDecimal) row[2];

            result.add(DepartmentSpendDto.builder()
                    .departmentName(departmentName)
                    .totalTrips(totalTrips)
                    .totalReimbursedSpend(totalSpend)
                    .build());
        }
        return result;
    }

    @Override
    @Transactional(readOnly = true)
    public EmployeeTravelHistoryDto getEmployeeTravelHistory(Long employeeId) {
        User employee = userRepository.findById(employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found with id: " + employeeId));

        List<TravelRequest> requests = travelRequestRepository.findByEmployeeId(employeeId);
        BigDecimal totalReimbursed = expenseRepository.sumAmountByEmployeeIdAndStatus(employeeId, ReimbursementStatus.REIMBURSED);

        List<TravelRequestResponseDto> history = requests.stream()
                .map(this::mapToDto)
                .toList();

        return EmployeeTravelHistoryDto.builder()
                .employeeId(employee.getId())
                .employeeName(employee.getFullName())
                .departmentName(employee.getDepartment().getName())
                .totalTrips(requests.size())
                .totalReimbursedAmount(totalReimbursed != null ? totalReimbursed : BigDecimal.ZERO)
                .travelHistory(history)
                .build();
    }

    private TravelRequestResponseDto mapToDto(TravelRequest entity) {
        return TravelRequestResponseDto.builder()
                .id(entity.getId())
                .employeeId(entity.getEmployee().getId())
                .employeeName(entity.getEmployee().getFullName())
                .departmentName(entity.getEmployee().getDepartment().getName())
                .destination(entity.getDestination())
                .startDate(entity.getStartDate())
                .endDate(entity.getEndDate())
                .purpose(entity.getPurpose())
                .estimatedBudget(entity.getEstimatedBudget())
                .travelClass(entity.getTravelClass())
                .status(entity.getStatus())
                .policyViolated(entity.getPolicyViolated())
                .policyViolationReason(entity.getPolicyViolationReason())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
