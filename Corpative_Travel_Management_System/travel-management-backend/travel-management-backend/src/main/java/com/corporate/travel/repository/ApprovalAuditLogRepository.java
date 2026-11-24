package com.corporate.travel.repository;

import com.corporate.travel.entity.ApprovalAuditLog;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ApprovalAuditLogRepository extends JpaRepository<ApprovalAuditLog, Long> {
    @EntityGraph(attributePaths = {"actionBy"})
    List<ApprovalAuditLog> findByTravelRequestIdOrderByActionTimestampDesc(Long travelRequestId);
}
