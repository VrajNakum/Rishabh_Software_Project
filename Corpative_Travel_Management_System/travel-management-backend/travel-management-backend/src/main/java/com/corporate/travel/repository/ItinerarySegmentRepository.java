package com.corporate.travel.repository;

import com.corporate.travel.entity.ItinerarySegment;
import org.springframework.data.jpa.repository.JpaRepository;


import java.util.List;

public interface ItinerarySegmentRepository extends JpaRepository<ItinerarySegment, Long> {
    List<ItinerarySegment> findByTravelRequestIdOrderByStartTimeAsc(Long travelRequestId);
}
