package com.corporate.travel.repository;

import com.corporate.travel.entity.TravelPolicy;
import com.corporate.travel.enums.TravelClass;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TravelPolicyRepository extends JpaRepository<TravelPolicy, Long> {
    @Override
    @EntityGraph(attributePaths = {"department"})
    List<TravelPolicy> findAll();

    @EntityGraph(attributePaths = {"department"})
    Optional<TravelPolicy> findByDepartmentId(Long departmentId);

    @EntityGraph(attributePaths = {"department"})
    Optional<TravelPolicy> findFirstByAllowedTravelClassOrderByIdAsc(TravelClass allowedTravelClass);
}
