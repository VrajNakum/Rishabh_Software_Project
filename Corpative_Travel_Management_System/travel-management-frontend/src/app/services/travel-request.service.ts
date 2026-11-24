import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  ApprovalActionDto,
  ApprovalAuditLogDto,
  TravelRequestCreateDto,
  TravelRequestResponseDto
} from '../models/travel-request.model';

@Injectable({
  providedIn: 'root'
})
export class TravelRequestService {
  private readonly baseUrl = 'http://localhost:8080/api/travel-requests';

  constructor(private http: HttpClient) {}

  getAllRequests(): Observable<TravelRequestResponseDto[]> {
    return this.http.get<TravelRequestResponseDto[]>(this.baseUrl);
  }

  getRequestById(id: number): Observable<TravelRequestResponseDto> {
    return this.http.get<TravelRequestResponseDto>(`${this.baseUrl}/${id}`);
  }

  getRequestsByEmployee(employeeId: number): Observable<TravelRequestResponseDto[]> {
    return this.http.get<TravelRequestResponseDto[]>(`${this.baseUrl}/employee/${employeeId}`);
  }

  createRequest(dto: TravelRequestCreateDto): Observable<TravelRequestResponseDto> {
    return this.http.post<TravelRequestResponseDto>(this.baseUrl, dto);
  }

  updateRequest(id: number, dto: TravelRequestCreateDto): Observable<TravelRequestResponseDto> {
    return this.http.put<TravelRequestResponseDto>(`${this.baseUrl}/${id}`, dto);
  }

  deleteRequest(id: number, userId?: number): Observable<void> {
    const url = userId ? `${this.baseUrl}/${id}?userId=${userId}` : `${this.baseUrl}/${id}`;
    return this.http.delete<void>(url);
  }

  processApprovalAction(requestId: number, dto: ApprovalActionDto): Observable<TravelRequestResponseDto> {
    return this.http.post<TravelRequestResponseDto>(`${this.baseUrl}/${requestId}/actions`, dto);
  }

  getAuditLogs(requestId: number): Observable<ApprovalAuditLogDto[]> {
    return this.http.get<ApprovalAuditLogDto[]>(`${this.baseUrl}/${requestId}/audit-logs`);
  }
}
