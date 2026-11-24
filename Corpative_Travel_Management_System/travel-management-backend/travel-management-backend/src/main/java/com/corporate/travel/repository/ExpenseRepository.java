package com.corporate.travel.repository;

import com.corporate.travel.entity.Expense;
import com.corporate.travel.enums.ReimbursementStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;

public interface ExpenseRepository extends JpaRepository<Expense, Long> {
    List<Expense> findByTravelRequestId(Long travelRequestId);

    // Calculate total reimbursed amount across the company
    @Query("SELECT COALESCE(SUM(e.amount), 0) FROM Expense e WHERE e.status = :status")
    BigDecimal sumAmountByStatus(@Param("status") ReimbursementStatus status);

    // Calculate total reimbursed expenses for a specific employee
    @Query("SELECT COALESCE(SUM(e.amount), 0) FROM Expense e " +
            "WHERE e.travelRequest.employee.id = :employeeId AND e.status = :status")
    BigDecimal sumAmountByEmployeeIdAndStatus(@Param("employeeId") Long employeeId,
                                              @Param("status") ReimbursementStatus status);

    // Aggregates spend grouped by department
    @Query("SELECT e.travelRequest.employee.department.name, COUNT(DISTINCT e.travelRequest.id), COALESCE(SUM(e.amount), 0) " +
            "FROM Expense e WHERE e.status = :status " +
            "GROUP BY e.travelRequest.employee.department.name")
    List<Object[]> getDepartmentSpendBreakdown(@Param("status") ReimbursementStatus status);
}
