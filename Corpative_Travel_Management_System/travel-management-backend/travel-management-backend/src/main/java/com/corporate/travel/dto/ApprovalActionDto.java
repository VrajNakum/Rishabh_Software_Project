package com.corporate.travel.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.Builder;

//import lombok.*;


@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder

//Payload sent by Manager/Finance when approving or rejecting
public class ApprovalActionDto {
    @NotNull(message = "Reviewer User ID is required")
    private Long reviewerUserId;

    @NotBlank(message = "Action is required (APPROVE or REJECT)")
    // "APPROVE" or "REJECT"
    private String action;

    private String comments;
}
