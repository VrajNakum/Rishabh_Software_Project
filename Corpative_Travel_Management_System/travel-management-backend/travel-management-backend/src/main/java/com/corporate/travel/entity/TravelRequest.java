package com.corporate.travel.entity;


import com.corporate.travel.enums.RequestStatus;
import com.corporate.travel.enums.TravelClass;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;


@Entity
@Table(name = "travel_requests", indexes = {
    @Index(name = "idx_tr_employee_id", columnList = "employee_id"),
    @Index(name = "idx_tr_status", columnList = "status"),
    @Index(name = "idx_tr_created_at", columnList = "created_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TravelRequest {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    private User employee;

    @Column(nullable = false, length = 150)
    private String destination;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Column(nullable = false, length = 500)
    private String purpose;

    @Column(name = "estimated_budget", nullable = false, precision = 12, scale = 2)
    private BigDecimal estimatedBudget;

    @Enumerated(EnumType.STRING)
    @Column(name = "travel_class", nullable = false, length = 30)
    private TravelClass travelClass;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private RequestStatus status;

    // Policy compliance flag
    @Column(name = "policy_violated", nullable = false)
    @Builder.Default
    private Boolean policyViolated = false;

    @Column(name = "policy_violation_reason", length = 500)
    private String policyViolationReason;

    @Column(name = "priority_request", nullable = false, columnDefinition = "boolean default false")
    @Builder.Default
    private Boolean priorityRequest = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        if (this.status == null) {
            this.status = RequestStatus.DRAFT;
        }
        if (this.priorityRequest == null) {
            this.priorityRequest = false;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
        if (this.priorityRequest == null) {
            this.priorityRequest = false;
        }
    }
}
