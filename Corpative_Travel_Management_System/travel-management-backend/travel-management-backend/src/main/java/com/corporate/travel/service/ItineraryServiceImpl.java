package com.corporate.travel.service;

import com.corporate.travel.dto.ItinerarySegmentRequestDto;
import com.corporate.travel.dto.ItinerarySegmentResponseDto;
import com.corporate.travel.entity.ItinerarySegment;
import com.corporate.travel.entity.TravelRequest;
import com.corporate.travel.enums.RequestStatus;
import com.corporate.travel.exception.InvalidStateTransitionException;
import com.corporate.travel.exception.ResourceNotFoundException;
import com.corporate.travel.repository.ItinerarySegmentRepository;
import com.corporate.travel.repository.TravelRequestRepository;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;



@Service
public class ItineraryServiceImpl implements ItineraryService{
    private final ItinerarySegmentRepository itinerarySegmentRepository;
    private final TravelRequestRepository travelRequestRepository;

    public ItineraryServiceImpl(
            ItinerarySegmentRepository itinerarySegmentRepository,
            TravelRequestRepository travelRequestRepository) {
        this.itinerarySegmentRepository = itinerarySegmentRepository;
        this.travelRequestRepository = travelRequestRepository;
    }

    @Override
    @Transactional
    public ItinerarySegmentResponseDto addSegment(Long travelRequestId, ItinerarySegmentRequestDto dto) {
        TravelRequest travelRequest = travelRequestRepository.findById(travelRequestId)
                .orElseThrow(() -> new ResourceNotFoundException("Travel request not found with id: " + travelRequestId));

        // Business Rule: Itinerary segments can only be added after Manager approval (PENDING_FINANCE or APPROVED)
        if (travelRequest.getStatus() != RequestStatus.APPROVED && travelRequest.getStatus() != RequestStatus.PENDING_FINANCE) {
            throw new InvalidStateTransitionException(
                    "Itinerary segments can only be added after Manager approval. Current status: " + travelRequest.getStatus());
        }

        if (dto.getEndTime().isBefore(dto.getStartTime())) {
            throw new IllegalArgumentException("Segment end time cannot be earlier than start time");
        }

        String segmentPurpose = (dto.getPurposeOfWork() != null && !dto.getPurposeOfWork().trim().isEmpty())
                ? dto.getPurposeOfWork().trim()
                : travelRequest.getPurpose();

        ItinerarySegment segment = ItinerarySegment.builder()
                .travelRequest(travelRequest)
                .segmentType(dto.getSegmentType())
                .title(dto.getTitle())
                .location(dto.getLocation())
                .startTime(dto.getStartTime())
                .endTime(dto.getEndTime())
                .purposeOfWork(segmentPurpose)
                .notes(dto.getNotes())
                .proofFileUrl(dto.getProofFileUrl())
                .proofFileName(dto.getProofFileName())
                .build();

        ItinerarySegment saved = itinerarySegmentRepository.save(segment);
        return mapToDto(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ItinerarySegmentResponseDto> getSegmentsByRequestId(Long travelRequestId) {
        if (!travelRequestRepository.existsById(travelRequestId)) {
            throw new ResourceNotFoundException("Travel request not found with id: " + travelRequestId);
        }
        return itinerarySegmentRepository.findByTravelRequestIdOrderByStartTimeAsc(travelRequestId)
                .stream()
                .map(this::mapToDto)
                .toList();
    }

    @Override
    @Transactional
    public void deleteSegment(Long segmentId) {
        if (!itinerarySegmentRepository.existsById(segmentId)) {
            throw new ResourceNotFoundException("Itinerary segment not found with id: " + segmentId);
        }
        itinerarySegmentRepository.deleteById(segmentId);
    }

    private ItinerarySegmentResponseDto mapToDto(ItinerarySegment segment) {
        return ItinerarySegmentResponseDto.builder()
                .id(segment.getId())
                .travelRequestId(segment.getTravelRequest().getId())
                .segmentType(segment.getSegmentType())
                .title(segment.getTitle())
                .location(segment.getLocation())
                .startTime(segment.getStartTime())
                .endTime(segment.getEndTime())
                .purposeOfWork(segment.getPurposeOfWork())
                .notes(segment.getNotes())
                .proofFileUrl(segment.getProofFileUrl())
                .proofFileName(segment.getProofFileName())
                .build();
    }
}
