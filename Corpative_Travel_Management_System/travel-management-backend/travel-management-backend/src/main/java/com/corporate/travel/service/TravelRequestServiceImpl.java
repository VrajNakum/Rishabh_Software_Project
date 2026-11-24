package com.corporate.travel.service;

import com.corporate.travel.dto.ApprovalActionDto;
import com.corporate.travel.dto.ApprovalAuditLogResponseDto;
import com.corporate.travel.dto.TravelRequestCreateDto;
import com.corporate.travel.dto.TravelRequestResponseDto;

import com.corporate.travel.entity.ApprovalAuditLog;
import com.corporate.travel.entity.Department;
import com.corporate.travel.entity.Expense;
import com.corporate.travel.entity.ItinerarySegment;
import com.corporate.travel.entity.TravelPolicy;
import com.corporate.travel.entity.TravelRequest;
import com.corporate.travel.entity.User;

import com.corporate.travel.enums.RequestStatus;
import com.corporate.travel.enums.Role;
import com.corporate.travel.enums.TravelClass;
import com.corporate.travel.exception.InvalidStateTransitionException;
import com.corporate.travel.exception.ResourceNotFoundException;
import com.corporate.travel.exception.UnauthorizedActionException;
import com.corporate.travel.repository.ApprovalAuditLogRepository;
import com.corporate.travel.repository.ExpenseRepository;
import com.corporate.travel.repository.ItinerarySegmentRepository;
import com.corporate.travel.repository.TravelPolicyRepository;
import com.corporate.travel.repository.TravelRequestRepository;
import com.corporate.travel.repository.UserRepository;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TravelRequestServiceImpl implements TravelRequestService {

    private final TravelRequestRepository travelRequestRepository;
    private final UserRepository userRepository;
    private final TravelPolicyRepository travelPolicyRepository;
    private final ApprovalAuditLogRepository approvalAuditLogRepository;
    private final ItinerarySegmentRepository itinerarySegmentRepository;
    private final ExpenseRepository expenseRepository;

    // Explicit constructor injection (SonarQube best practice)
    public TravelRequestServiceImpl(
            TravelRequestRepository travelRequestRepository,
            UserRepository userRepository,
            TravelPolicyRepository travelPolicyRepository,
            ApprovalAuditLogRepository approvalAuditLogRepository,
            ItinerarySegmentRepository itinerarySegmentRepository,
            ExpenseRepository expenseRepository) {
        this.travelRequestRepository = travelRequestRepository;
        this.userRepository = userRepository;
        this.travelPolicyRepository = travelPolicyRepository;
        this.approvalAuditLogRepository = approvalAuditLogRepository;
        this.itinerarySegmentRepository = itinerarySegmentRepository;
        this.expenseRepository = expenseRepository;
    }

    @Override
    @Transactional
    public TravelRequestResponseDto createTravelRequest(TravelRequestCreateDto dto) {
        User employee = userRepository.findById(dto.getEmployeeId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + dto.getEmployeeId()));

        if (dto.getEndDate().isBefore(dto.getStartDate())) {
            throw new IllegalArgumentException("End date cannot be earlier than start date");
        }

        RequestStatus initialStatus = dto.isDraft() ? RequestStatus.DRAFT : RequestStatus.PENDING_MANAGER;
        PolicyCheckResult policyResult = checkPolicy(employee.getDepartment(), dto);

        TravelRequest travelRequest = TravelRequest.builder()
                .employee(employee)
                .destination(dto.getDestination())
                .startDate(dto.getStartDate())
                .endDate(dto.getEndDate())
                .purpose(dto.getPurpose())
                .estimatedBudget(dto.getEstimatedBudget())
                .travelClass(dto.getTravelClass())
                .status(initialStatus)
                .policyViolated(policyResult.isViolated())
                .policyViolationReason(policyResult.getReason())
                .build();

        TravelRequest saved = travelRequestRepository.save(travelRequest);

        // Record Initial Audit Log
        ApprovalAuditLog initialLog = ApprovalAuditLog.builder()
                .travelRequest(saved)
                .actionBy(employee)
                .previousStatus(RequestStatus.DRAFT)
                .newStatus(initialStatus)
                .comments(dto.isDraft() ? "Saved as Draft" : "Submitted for Manager Approval")
                .build();
        approvalAuditLogRepository.save(initialLog);

        return mapToDto(saved);
    }

    @Override
    @Transactional
    public TravelRequestResponseDto updateTravelRequest(Long id, TravelRequestCreateDto dto) {
        TravelRequest request = travelRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Travel request not found with id: " + id));

        if (dto.getEndDate().isBefore(dto.getStartDate())) {
            throw new IllegalArgumentException("End date cannot be earlier than start date");
        }

        RequestStatus previousStatus = request.getStatus();
        RequestStatus newStatus;
        if (dto.isDraft()) {
            newStatus = RequestStatus.DRAFT;
        } else if (previousStatus == RequestStatus.DRAFT) {
            newStatus = RequestStatus.PENDING_MANAGER;
        } else {
            newStatus = previousStatus;
        }

        PolicyCheckResult policyResult = checkPolicy(request.getEmployee().getDepartment(), dto);

        request.setDestination(dto.getDestination());
        request.setStartDate(dto.getStartDate());
        request.setEndDate(dto.getEndDate());
        request.setPurpose(dto.getPurpose());
        request.setEstimatedBudget(dto.getEstimatedBudget());
        request.setTravelClass(dto.getTravelClass());
        request.setStatus(newStatus);
        request.setPolicyViolated(policyResult.isViolated());
        request.setPolicyViolationReason(policyResult.getReason());

        TravelRequest updated = travelRequestRepository.save(request);

        // Record Audit Log if submitted or updated
        ApprovalAuditLog log = ApprovalAuditLog.builder()
                .travelRequest(updated)
                .actionBy(request.getEmployee())
                .previousStatus(previousStatus)
                .newStatus(newStatus)
                .comments(dto.isDraft() ? "Draft updated" : "Request details & estimated budget updated")
                .build();
        approvalAuditLogRepository.save(log);

        return mapToDto(updated);
    }

    @Override
    @Transactional
    public void deleteTravelRequest(Long id) {
        deleteTravelRequest(id, null);
    }

    @Override
    @Transactional
    public void deleteTravelRequest(Long id, Long userId) {
        boolean isAdmin = false;
        if (userId != null) {
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));
            isAdmin = (user.getRole() == Role.ADMIN);
            if (!isAdmin) {
                throw new UnauthorizedActionException("Only administrators can perform delete actions to manage the internal database.");
            }
        } else {
            // Default internal execution (e.g. system/admin operations)
            isAdmin = true;
        }

        TravelRequest request = travelRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Travel request not found with id: " + id));

        // Admin has full unrestricted access to delete ANY request from the database
        // Non-admin callers are limited to DRAFT, APPROVED, and REJECTED statuses
        if (!isAdmin && request.getStatus() != RequestStatus.DRAFT
                && request.getStatus() != RequestStatus.APPROVED
                && request.getStatus() != RequestStatus.REJECTED) {
            throw new InvalidStateTransitionException("Only draft, approved, or rejected requests can be deleted. Pending requests in review cannot be removed.");
        }

        // Delete associated itinerary segments if any
        List<ItinerarySegment> segments = itinerarySegmentRepository.findByTravelRequestIdOrderByStartTimeAsc(id);
        if (segments != null && !segments.isEmpty()) {
            itinerarySegmentRepository.deleteAll(segments);
        }

        // Delete associated expenses if any
        List<Expense> expenses = expenseRepository.findByTravelRequestId(id);
        if (expenses != null && !expenses.isEmpty()) {
            expenseRepository.deleteAll(expenses);
        }

        // Delete approval audit logs
        List<ApprovalAuditLog> logs = approvalAuditLogRepository.findByTravelRequestIdOrderByActionTimestampDesc(id);
        if (logs != null && !logs.isEmpty()) {
            approvalAuditLogRepository.deleteAll(logs);
        }

        travelRequestRepository.delete(request);
    }

    @Override
    @Transactional(readOnly = true)
    public TravelRequestResponseDto getTravelRequestById(Long id) {
        TravelRequest request = travelRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Travel request not found with id: " + id));
        return mapToDto(request);
    }

    @Override
    @Transactional(readOnly = true)
    public List<TravelRequestResponseDto> getTravelRequestsByEmployee(Long employeeId) {
        return travelRequestRepository.findByEmployeeId(employeeId)
                .stream()
                .map(this::mapToDto)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<TravelRequestResponseDto> getAllTravelRequests() {
        return travelRequestRepository.findAll()
                .stream()
                .map(this::mapToDto)
                .toList();
    }

    // --- Approval State Machine Implementation ---
    @Override
    @Transactional
    public TravelRequestResponseDto processApprovalAction(Long requestId, ApprovalActionDto dto) {
        TravelRequest request = travelRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Travel request not found with id: " + requestId));

        User reviewer = userRepository.findById(dto.getReviewerUserId())
                .orElseThrow(() -> new ResourceNotFoundException("Reviewer not found with id: " + dto.getReviewerUserId()));

        RequestStatus currentStatus = request.getStatus();
        RequestStatus nextStatus;
        boolean isApproval = "APPROVE".equalsIgnoreCase(dto.getAction());
        boolean isRejection = "REJECT".equalsIgnoreCase(dto.getAction());

        if (!isApproval && !isRejection) {
            throw new IllegalArgumentException("Action must be either APPROVE or REJECT");
        }

        // State Machine Validations
        if (currentStatus == RequestStatus.PENDING_MANAGER) {
            // Verify Reviewer is a MANAGER or ADMIN
            if (reviewer.getRole() != Role.MANAGER && reviewer.getRole() != Role.ADMIN) {
                throw new UnauthorizedActionException("Only a Manager or Admin can review requests in PENDING_MANAGER status");
            }
            // Enforce Assigned Manager rule: only the assigned manager (or admin) can approve/reject
            if (reviewer.getRole() != Role.ADMIN && request.getEmployee() != null && request.getEmployee().getManager() != null) {
                if (!request.getEmployee().getManager().getId().equals(reviewer.getId())) {
                    throw new UnauthorizedActionException(String.format(
                        "Unauthorized: Only the assigned manager (%s) or an Administrator can review this request.",
                        request.getEmployee().getManager().getFullName()));
                }
            }
            nextStatus = isApproval ? RequestStatus.PENDING_FINANCE : RequestStatus.REJECTED;

        } else if (currentStatus == RequestStatus.PENDING_FINANCE) {
            // Verify Reviewer is FINANCE or ADMIN
            if (reviewer.getRole() != Role.FINANCE && reviewer.getRole() != Role.ADMIN) {
                throw new UnauthorizedActionException("Only a Finance officer or Admin can review requests in PENDING_FINANCE status");
            }
            // Enforce Assigned Finance rule: only the assigned finance officer (or admin) can approve/reject
            if (reviewer.getRole() != Role.ADMIN && request.getEmployee() != null && request.getEmployee().getFinance() != null) {
                if (!request.getEmployee().getFinance().getId().equals(reviewer.getId())) {
                    throw new UnauthorizedActionException(String.format(
                        "Unauthorized: Only the assigned Finance officer (%s) or an Administrator can review this request.",
                        request.getEmployee().getFinance().getFullName()));
                }
            }
            nextStatus = isApproval ? RequestStatus.APPROVED : RequestStatus.REJECTED;

        } else {
            throw new InvalidStateTransitionException(
                    String.format("Cannot %s request currently in status: %s", dto.getAction(), currentStatus));
        }

        // Apply Status Transition
        request.setStatus(nextStatus);
        if (isRejection) {
            String roleStr = reviewer.getRole() != null ? reviewer.getRole().name() : "REVIEWER";
            String reasonText = (dto.getComments() != null && !dto.getComments().trim().isEmpty())
                    ? dto.getComments().trim()
                    : "No specific rejection reason provided";
            request.setPolicyViolated(true);
            request.setPolicyViolationReason(String.format("Rejected by %s (%s): %s", roleStr, reviewer.getFullName(), reasonText));
        }
        TravelRequest updated = travelRequestRepository.save(request);

        // Record Audit Trail
        ApprovalAuditLog auditLog = ApprovalAuditLog.builder()
                .travelRequest(updated)
                .actionBy(reviewer)
                .previousStatus(currentStatus)
                .newStatus(nextStatus)
                .comments(dto.getComments())
                .build();
        approvalAuditLogRepository.save(auditLog);

        return mapToDto(updated);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ApprovalAuditLogResponseDto> getAuditLogsForRequest(Long requestId) {
        // Ensure request exists
        if (!travelRequestRepository.existsById(requestId)) {
            throw new ResourceNotFoundException("Travel request not found with id: " + requestId);
        }

        return approvalAuditLogRepository.findByTravelRequestIdOrderByActionTimestampDesc(requestId)
                .stream()
                .map(log -> ApprovalAuditLogResponseDto.builder()
                        .id(log.getId())
                        .travelRequestId(log.getTravelRequest().getId())
                        .actionByUserId(log.getActionBy().getId())
                        .actionByUserName(log.getActionBy().getFullName())
                        .previousStatus(log.getPreviousStatus())
                        .newStatus(log.getNewStatus())
                        .comments(log.getComments())
                        .actionTimestamp(log.getActionTimestamp())
                        .build())
                .toList();
    }

    // Policy Check Logic
    private PolicyCheckResult checkPolicy(Department department, TravelRequestCreateDto dto) {
        Optional<TravelPolicy> policyOpt = travelPolicyRepository.findByDepartmentId(department.getId());
        if (policyOpt.isEmpty()) {
            return new PolicyCheckResult(false, null);
        }

        TravelPolicy policy = policyOpt.get();
        List<String> violations = new ArrayList<>();

        if (dto.getEstimatedBudget().compareTo(policy.getMaxBudgetLimit()) > 0) {
            violations.add(String.format("Estimated budget ($%s) exceeds department limit ($%s)",
                    dto.getEstimatedBudget(), policy.getMaxBudgetLimit()));
        }

        if (isClassHigherThanAllowed(dto.getTravelClass(), policy.getAllowedTravelClass())) {
            violations.add(String.format("Requested travel class [%s] exceeds allowed class [%s]",
                    dto.getTravelClass(), policy.getAllowedTravelClass()));
        }

        if (!violations.isEmpty()) {
            return new PolicyCheckResult(true, String.join("; ", violations));
        }

        return new PolicyCheckResult(false, null);
    }

    private boolean isClassHigherThanAllowed(TravelClass requested, TravelClass allowed) {
        return requested.ordinal() > allowed.ordinal();
    }

    private TravelRequestResponseDto mapToDto(TravelRequest entity) {
        Long managerId = null;
        String managerName = null;
        if (entity.getEmployee() != null && entity.getEmployee().getManager() != null) {
            managerId = entity.getEmployee().getManager().getId();
            managerName = entity.getEmployee().getManager().getFullName();
        }

        Long financeId = null;
        String financeName = null;
        if (entity.getEmployee() != null && entity.getEmployee().getFinance() != null) {
            financeId = entity.getEmployee().getFinance().getId();
            financeName = entity.getEmployee().getFinance().getFullName();
        }

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
                .managerId(managerId)
                .managerName(managerName)
                .financeId(financeId)
                .financeName(financeName)
                .policyViolated(entity.getPolicyViolated())
                .policyViolationReason(entity.getPolicyViolationReason())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    private static class PolicyCheckResult {
        private final boolean violated;
        private final String reason;

        public PolicyCheckResult(boolean violated, String reason) {
            this.violated = violated;
            this.reason = reason;
        }

        public boolean isViolated() {
            return violated;
        }

        public String getReason() {
            return reason;
        }
    }
}
