package com.corporate.travel.repository;

import com.corporate.travel.entity.TravelRequest;
import com.corporate.travel.enums.RequestStatus;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface TravelRequestRepository extends JpaRepository<TravelRequest, Long> {

    @Override
    @EntityGraph(attributePaths = {"employee", "employee.department"})
    List<TravelRequest> findAll();

    @Override
    @EntityGraph(attributePaths = {"employee", "employee.department"})
    Optional<TravelRequest> findById(Long id);

    @EntityGraph(attributePaths = {"employee", "employee.department"})
    List<TravelRequest> findByEmployeeId(Long employeeId);

    @EntityGraph(attributePaths = {"employee", "employee.department"})
    List<TravelRequest> findByStatus(RequestStatus status);

    long countByStatus(RequestStatus status);

    @Query("SELECT COUNT(t) FROM TravelRequest t WHERE t.status IN :statuses")
    long countByStatusIn(@Param("statuses") Collection<RequestStatus> statuses);

    @Query("SELECT COALESCE(SUM(t.estimatedBudget), 0) FROM TravelRequest t")
    BigDecimal sumTotalEstimatedBudget();
}
