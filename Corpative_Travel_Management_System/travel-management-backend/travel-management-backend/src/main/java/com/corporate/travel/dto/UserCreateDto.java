package com.corporate.travel.dto;

import com.corporate.travel.enums.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
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
public class UserCreateDto {
    @NotBlank(message = "Full name is required")
    @Size(max = 100, message = "Full name cannot exceed 100 characters")
    private String fullName;

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    @Size(max = 150, message = "Email cannot exceed 150 characters")
    private String email;

    @NotBlank(message = "Password is required")
    @Size(min = 4, max = 100, message = "Password must be at least 4 characters")
    private String password;

    @NotNull(message = "Role is required (EMPLOYEE, MANAGER, FINANCE, ADMIN)")
    private Role role;

    @NotBlank(message = "Department name is required")
    private String departmentName;

    private Long managerId;

    private Long financeId;

    @Size(max = 100, message = "Bank name cannot exceed 100 characters")
    private String bankName;

    @Size(max = 100, message = "Bank branch cannot exceed 100 characters")
    private String bankBranch;

    @Size(max = 50, message = "IFSC code cannot exceed 50 characters")
    private String ifscCode;

    @Size(max = 100, message = "IFSC name cannot exceed 100 characters")
    private String ifscName;

    @Size(max = 50, message = "Account number cannot exceed 50 characters")
    private String accountNumber;

    private String bankProofFileName;

    private String bankProofFileUrl;
}
