package com.corporate.travel.controller;


import com.corporate.travel.dto.ItinerarySegmentRequestDto;
import com.corporate.travel.dto.ItinerarySegmentResponseDto;
import com.corporate.travel.service.ItineraryService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

//import org.springframework.web.bind.annotation.*;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/itineraries")
public class ItineraryController {
    private final ItineraryService itineraryService;

    public ItineraryController(ItineraryService itineraryService) {
        this.itineraryService = itineraryService;
    }

    @PostMapping("/request/{travelRequestId}")
    public ResponseEntity<ItinerarySegmentResponseDto> addSegment(
            @PathVariable Long travelRequestId,
            @Valid @RequestBody ItinerarySegmentRequestDto dto) {
        ItinerarySegmentResponseDto created = itineraryService.addSegment(travelRequestId, dto);
        return new ResponseEntity<>(created, HttpStatus.CREATED);
    }

    @GetMapping("/request/{travelRequestId}")
    public ResponseEntity<List<ItinerarySegmentResponseDto>> getSegmentsByRequestId(@PathVariable Long travelRequestId) {
        return ResponseEntity.ok(itineraryService.getSegmentsByRequestId(travelRequestId));
    }

    @DeleteMapping("/{segmentId}")
    public ResponseEntity<Void> deleteSegment(@PathVariable Long segmentId) {
        itineraryService.deleteSegment(segmentId);
        return ResponseEntity.noContent().build();
    }
}
