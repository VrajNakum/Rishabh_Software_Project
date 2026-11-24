package com.corporate.travel.dto;


import com.corporate.travel.enums.SegmentType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

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
public class ItinerarySegmentRequestDto {
    @NotNull(message = "Segment type is required (FLIGHT, TRAIN, HOTEL, CAB, BUS)")
    private SegmentType segmentType;

    @NotBlank(message = "Title is required (e.g., Flight AI-101, Marriott Hotel)")
    private String title;

    @NotBlank(message = "Location is required")
    private String location;

    @NotNull(message = "Start time is required")
    private LocalDateTime startTime;

    @NotNull(message = "End time is required")
    private LocalDateTime endTime;

    private String purposeOfWork;

    private String notes;

    private String proofFileUrl;

    private String proofFileName;
}
