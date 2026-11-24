package com.corporate.travel.entity;


import com.corporate.travel.enums.RequestStatus;

//import jakarta.persistence.*;
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
import jakarta.persistence.Table;

//import lombok.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "approval_audit_logs", indexes = {
    @Index(name = "idx_audit_tr_id", columnList = "travel_request_id"),
    @Index(name = "idx_audit_timestamp", columnList = "action_timestamp")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApprovalAuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "travel_request_id", nullable = false)
    private TravelRequest travelRequest;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "action_by_user_id", nullable = false)
    private User actionBy;

    @Enumerated(EnumType.STRING)
    @Column(name = "previous_status", nullable = false, length = 30)
    private RequestStatus previousStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "new_status", nullable = false, length = 30)
    private RequestStatus newStatus;

    @Column(length = 1000)
    private String comments;

    @Column(name = "action_timestamp", nullable = false, updatable = false)
    private LocalDateTime actionTimestamp;

    @PrePersist
    protected void onCreate() {
        this.actionTimestamp = LocalDateTime.now();
    }
}
