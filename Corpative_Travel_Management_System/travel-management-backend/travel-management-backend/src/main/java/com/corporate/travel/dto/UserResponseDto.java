package com.corporate.travel.dto;

import com.corporate.travel.enums.Role;
import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserResponseDto {
    private Long id;
    private String fullName;
    private String email;
    @JsonIgnore
    private String password;
    private Role role;
    private String departmentName;
    private Long departmentId;
    private Long managerId;
    private String managerName;
    private Long financeId;
    private String financeName;

    // Direct Reimbursement & Disbursement Bank Details
    private String bankName;
    private String bankBranch;
    private String ifscCode;
    private String ifscName;
    private String accountNumber;
    private String bankProofFileName;
    private String bankProofFileUrl;
}
