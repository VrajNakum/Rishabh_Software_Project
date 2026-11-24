package com.corporate.travel.service;

import com.corporate.travel.dto.CostSummaryReportDto;
import com.corporate.travel.dto.DepartmentSpendDto;
import com.corporate.travel.dto.EmployeeTravelHistoryDto;

import java.util.List;

public interface ReportService {
    CostSummaryReportDto getCostSummaryReport();
    List<DepartmentSpendDto> getDepartmentSpendReport();
    EmployeeTravelHistoryDto getEmployeeTravelHistory(Long employeeId);
}
