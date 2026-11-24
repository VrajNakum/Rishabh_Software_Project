package com.corporate.travel.entity;

import com.corporate.travel.enums.Role;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;


@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 150)
    private String email;

    @Column(nullable = false, length = 100)
    private String fullName;

    @Column(length = 100)
    private String password;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private Role role;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "department_id", nullable = false)
    private Department department;

    // Self-reference: Manager who approves this user's travel requests
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "manager_id")
    private User manager;

    // Assigned Finance officer who audits and approves this user's travel expenses
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "finance_id")
    private User finance;

    // Direct Reimbursement & Disbursement Bank Details
    @Column(name = "bank_name", length = 100)
    private String bankName;

    @Column(name = "bank_branch", length = 100)
    private String bankBranch;

    @Column(name = "ifsc_code", length = 50)
    private String ifscCode;

    @Column(name = "ifsc_name", length = 100)
    private String ifscName;

    @Column(name = "account_number", length = 50)
    private String accountNumber;

    @Column(name = "bank_proof_file_name", length = 255)
    private String bankProofFileName;

    @Column(name = "bank_proof_file_url", columnDefinition = "TEXT")
    private String bankProofFileUrl;
}
