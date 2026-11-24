package com.corporate.travel.service;

import com.corporate.travel.dto.ItinerarySegmentRequestDto;
import com.corporate.travel.dto.ItinerarySegmentResponseDto;

import java.util.List;

public interface ItineraryService {
    ItinerarySegmentResponseDto addSegment(Long travelRequestId, ItinerarySegmentRequestDto dto);
    List<ItinerarySegmentResponseDto> getSegmentsByRequestId(Long travelRequestId);
    void deleteSegment(Long segmentId);
}
