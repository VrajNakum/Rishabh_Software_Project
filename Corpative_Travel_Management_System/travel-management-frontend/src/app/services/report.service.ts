import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CostSummaryReportDto, DepartmentSpendDto, EmployeeTravelHistoryDto } from '../models/reports.model';

@Injectable({
  providedIn: 'root'
})
export class ReportService {
  private readonly baseUrl = 'http://localhost:8080/api/reports';

  constructor(private http: HttpClient) {}

  getCostSummary(): Observable<CostSummaryReportDto> {
    return this.http.get<CostSummaryReportDto>(`${this.baseUrl}/cost-summary`);
  }

  getDepartmentSpend(): Observable<DepartmentSpendDto[]> {
    return this.http.get<DepartmentSpendDto[]>(`${this.baseUrl}/department-spend`);
  }

  getEmployeeHistory(employeeId: number): Observable<EmployeeTravelHistoryDto> {
    return this.http.get<EmployeeTravelHistoryDto>(`${this.baseUrl}/employee-history/${employeeId}`);
  }
}