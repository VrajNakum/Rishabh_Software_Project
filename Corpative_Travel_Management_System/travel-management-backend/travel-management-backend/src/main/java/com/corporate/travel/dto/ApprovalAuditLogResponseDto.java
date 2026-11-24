package com.corporate.travel.dto;


import com.corporate.travel.enums.RequestStatus;

//import lombok.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.Builder;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
//To display the audit timeline
public class ApprovalAuditLogResponseDto {
    private Long id;
    private Long travelRequestId;
    private Long actionByUserId;
    private String actionByUserName;
    private RequestStatus previousStatus;
    private RequestStatus newStatus;
    private String comments;
    private LocalDateTime actionTimestamp;
}
