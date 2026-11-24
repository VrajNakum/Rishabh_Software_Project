package com.corporate.travel.entity;


import com.corporate.travel.enums.SegmentType;

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
import jakarta.persistence.Table;

//import lombok.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "itinerary_segments", indexes = {
    @Index(name = "idx_segment_tr_id", columnList = "travel_request_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ItinerarySegment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "travel_request_id", nullable = false)
    private TravelRequest travelRequest;

    @Enumerated(EnumType.STRING)
    @Column(name = "segment_type", nullable = false, length = 30)
    private SegmentType segmentType;

    @Column(nullable = false, length = 150)
    private String title;

    @Column(nullable = false, length = 150)
    private String location;

    @Column(name = "start_time", nullable = false)
    private LocalDateTime startTime;

    @Column(name = "end_time", nullable = false)
    private LocalDateTime endTime;

    @Column(name = "purpose_of_work", length = 500)
    private String purposeOfWork;

    @Column(length = 500)
    private String notes;

    @Column(name = "proof_file_url", columnDefinition = "TEXT")
    private String proofFileUrl;

    @Column(name = "proof_file_name", length = 255)
    private String proofFileName;

}
