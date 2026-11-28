package com.corporate.travel.controller;

import com.corporate.travel.dto.ApprovalActionDto;
import com.corporate.travel.dto.ApprovalAuditLogResponseDto;
import com.corporate.travel.dto.TravelRequestCreateDto;
import com.corporate.travel.dto.TravelRequestResponseDto;
import com.corporate.travel.service.TravelRequestService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/travel-requests")
@PreAuthorize("isAuthenticated()")
public class TravelRequestController {

    private final TravelRequestService travelRequestService;

    public TravelRequestController(TravelRequestService travelRequestService) {
        this.travelRequestService = travelRequestService;
    }

    @PostMapping
    public ResponseEntity<TravelRequestResponseDto> createTravelRequest(@Valid @RequestBody TravelRequestCreateDto dto) {
        TravelRequestResponseDto created = travelRequestService.createTravelRequest(dto);
        return new ResponseEntity<>(created, HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<TravelRequestResponseDto> updateTravelRequest(
            @PathVariable Long id,
            @Valid @RequestBody TravelRequestCreateDto dto) {
        return ResponseEntity.ok(travelRequestService.updateTravelRequest(id, dto));
    }

    @PatchMapping("/{id}/priority")
    public ResponseEntity<TravelRequestResponseDto> updatePriority(
            @PathVariable Long id,
            @RequestBody Map<String, Boolean> body) {
        boolean priority = body != null && Boolean.TRUE.equals(body.get("priorityRequest"));
        return ResponseEntity.ok(travelRequestService.updatePriority(id, priority));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTravelRequest(
            @PathVariable Long id,
            @RequestParam(required = false) Long userId) {
        travelRequestService.deleteTravelRequest(id, userId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}")
    public ResponseEntity<TravelRequestResponseDto> getTravelRequestById(@PathVariable Long id) {
        return ResponseEntity.ok(travelRequestService.getTravelRequestById(id));
    }

    @GetMapping("/employee/{employeeId}")
    public ResponseEntity<List<TravelRequestResponseDto>> getTravelRequestsByEmployee(@PathVariable Long employeeId) {
        return ResponseEntity.ok(travelRequestService.getTravelRequestsByEmployee(employeeId));
    }

    @GetMapping
    public ResponseEntity<List<TravelRequestResponseDto>> getAllTravelRequests() {
        return ResponseEntity.ok(travelRequestService.getAllTravelRequests());
    }

    @GetMapping("/policies")
    public ResponseEntity<List<Map<String, Object>>> getPredefinedPolicies() {
        return ResponseEntity.ok(travelRequestService.getPredefinedPolicies());
    }

    @PostMapping("/{id}/actions")
    @PreAuthorize("hasAnyRole('MANAGER', 'FINANCE', 'ADMIN')")
    public ResponseEntity<TravelRequestResponseDto> processApprovalAction(
            @PathVariable Long id,
            @Valid @RequestBody ApprovalActionDto dto)
    {
        return ResponseEntity.ok(travelRequestService.processApprovalAction(id, dto));
    }

    @GetMapping("/{id}/audit-logs")
    public ResponseEntity<List<ApprovalAuditLogResponseDto>> getAuditLogs(@PathVariable Long id) {
        return ResponseEntity.ok(travelRequestService.getAuditLogsForRequest(id));
    }
}
