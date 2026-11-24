package com.corporate.travel.repository;

import com.corporate.travel.entity.TravelPolicy;
import org.springframework.data.jpa.repository.JpaRepository;


import java.util.Optional;

public interface TravelPolicyRepository extends JpaRepository<TravelPolicy, Long> {
    Optional<TravelPolicy> findByDepartmentId(Long departmentId);
}
