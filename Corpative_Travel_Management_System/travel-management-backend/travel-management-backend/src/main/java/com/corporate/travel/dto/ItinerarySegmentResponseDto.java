package com.corporate.travel.dto;


import com.corporate.travel.enums.SegmentType;
//import lombok.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ItinerarySegmentResponseDto {
    private Long id;
    private Long travelRequestId;
    private SegmentType segmentType;
    private String title;
    private String location;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private String purposeOfWork;
    private String notes;
    private String proofFileUrl;
    private String proofFileName;
}
