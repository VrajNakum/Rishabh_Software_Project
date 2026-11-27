package com.corporate.travel.service;

import com.corporate.travel.dto.ApprovalActionDto;
import com.corporate.travel.dto.ApprovalAuditLogResponseDto;
import com.corporate.travel.dto.TravelRequestCreateDto;
import com.corporate.travel.dto.TravelRequestResponseDto;

import java.util.List;
import java.util.Map;

public interface TravelRequestService {
    TravelRequestResponseDto createTravelRequest(TravelRequestCreateDto dto);
    TravelRequestResponseDto updateTravelRequest(Long id, TravelRequestCreateDto dto);
    TravelRequestResponseDto updatePriority(Long id, boolean priorityRequest);
    void deleteTravelRequest(Long id);
    void deleteTravelRequest(Long id, Long userId);
    TravelRequestResponseDto getTravelRequestById(Long id);
    List<TravelRequestResponseDto> getTravelRequestsByEmployee(Long employeeId);
    List<TravelRequestResponseDto> getAllTravelRequests();

    // State machine & audit log methods
    TravelRequestResponseDto processApprovalAction(Long requestId, ApprovalActionDto dto);
    List<ApprovalAuditLogResponseDto> getAuditLogsForRequest(Long requestId);
    List<Map<String, Object>> getPredefinedPolicies();
}
