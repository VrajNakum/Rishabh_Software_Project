import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  ExpenseCreateDto,
  ExpenseResponseDto,
  ItinerarySegmentRequestDto,
  ItinerarySegmentResponseDto
} from '../models/itinerary-expense.model';
import { ReimbursementStatus } from '../models/enums.model';

@Injectable({
  providedIn: 'root'
})
export class ItineraryExpenseService {
  private readonly itineraryUrl = 'http://localhost:8080/api/itineraries';
  private readonly expenseUrl = 'http://localhost:8080/api/expenses';

  constructor(private http: HttpClient) {}

  // Itinerary APIs
  getSegments(requestId: number): Observable<ItinerarySegmentResponseDto[]> {
    return this.http.get<ItinerarySegmentResponseDto[]>(`${this.itineraryUrl}/request/${requestId}`);
  }

  addSegment(requestId: number, dto: ItinerarySegmentRequestDto): Observable<ItinerarySegmentResponseDto> {
    return this.http.post<ItinerarySegmentResponseDto>(`${this.itineraryUrl}/request/${requestId}`, dto);
  }

  deleteSegment(segmentId: number): Observable<void> {
    return this.http.delete<void>(`${this.itineraryUrl}/${segmentId}`);
  }

  // Expense APIs
  getExpenses(requestId: number): Observable<ExpenseResponseDto[]> {
    return this.http.get<ExpenseResponseDto[]>(`${this.expenseUrl}/request/${requestId}`);
  }

  addExpense(requestId: number, dto: ExpenseCreateDto): Observable<ExpenseResponseDto> {
    return this.http.post<ExpenseResponseDto>(`${this.expenseUrl}/request/${requestId}`, dto);
  }

  updateReimbursementStatus(expenseId: number, status: ReimbursementStatus): Observable<ExpenseResponseDto> {
    return this.http.patch<ExpenseResponseDto>(
      `${this.expenseUrl}/${expenseId}/reimbursement-status?status=${status}`,
      {}
    );
  }
}