package com.corporate.travel.controller;


import com.corporate.travel.dto.ItinerarySegmentRequestDto;
import com.corporate.travel.dto.ItinerarySegmentResponseDto;
import com.corporate.travel.service.ItineraryService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/itineraries")
@PreAuthorize("isAuthenticated()")
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
