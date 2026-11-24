package com.corporate.travel.controller;

import com.corporate.travel.dto.CostSummaryReportDto;
import com.corporate.travel.dto.DepartmentSpendDto;
import com.corporate.travel.dto.EmployeeTravelHistoryDto;
import com.corporate.travel.service.ReportService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/reports")
public class ReportController {
    private final ReportService reportService;

    public ReportController(ReportService reportService) {
        this.reportService = reportService;
    }

    @GetMapping("/cost-summary")
    public ResponseEntity<CostSummaryReportDto> getCostSummary() {
        return ResponseEntity.ok(reportService.getCostSummaryReport());
    }

    @GetMapping("/department-spend")
    public ResponseEntity<List<DepartmentSpendDto>> getDepartmentSpend() {
        return ResponseEntity.ok(reportService.getDepartmentSpendReport());
    }

    @GetMapping("/employee-history/{employeeId}")
    public ResponseEntity<EmployeeTravelHistoryDto> getEmployeeHistory(@PathVariable Long employeeId) {
        return ResponseEntity.ok(reportService.getEmployeeTravelHistory(employeeId));
    }
}
