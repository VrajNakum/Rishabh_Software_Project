package com.corporate.travel.entity;

//import com.corporate.travel.enums.travelClass;
//import jakarta.persistence.*;
//import lombok.*;

//import java.math.BigDecimal;



import com.corporate.travel.enums.TravelClass;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;


@Entity
@Table(name = "travel_policies")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TravelPolicy {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "department_id", nullable = false)
    private Department department;

    @Column(name = "max_budget_limit", nullable = false, precision = 12, scale = 2)
    private BigDecimal maxBudgetLimit;

    @Enumerated(EnumType.STRING)
    @Column(name = "allowed_travel_class", nullable = false, length = 30)
    private TravelClass allowedTravelClass;
}
