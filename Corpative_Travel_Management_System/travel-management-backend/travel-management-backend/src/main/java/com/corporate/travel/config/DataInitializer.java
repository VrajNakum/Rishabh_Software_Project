package com.corporate.travel.config;

import com.corporate.travel.entity.ApprovalAuditLog;
import com.corporate.travel.entity.Department;
import com.corporate.travel.entity.Expense;
import com.corporate.travel.entity.ItinerarySegment;
import com.corporate.travel.entity.TravelPolicy;
import com.corporate.travel.entity.TravelRequest;
import com.corporate.travel.entity.User;
import com.corporate.travel.enums.ExpenseCategory;
import com.corporate.travel.enums.ReimbursementStatus;
import com.corporate.travel.enums.RequestStatus;
import com.corporate.travel.enums.Role;
import com.corporate.travel.enums.SegmentType;
import com.corporate.travel.enums.TravelClass;
import com.corporate.travel.repository.ApprovalAuditLogRepository;
import com.corporate.travel.repository.DepartmentRepository;
import com.corporate.travel.repository.ExpenseRepository;
import com.corporate.travel.repository.ItinerarySegmentRepository;
import com.corporate.travel.repository.TravelPolicyRepository;
import com.corporate.travel.repository.TravelRequestRepository;
import com.corporate.travel.repository.UserRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {
    private final DepartmentRepository departmentRepository;
    private final UserRepository userRepository;
    private final TravelPolicyRepository travelPolicyRepository;
    private final TravelRequestRepository travelRequestRepository;
    private final ItinerarySegmentRepository itinerarySegmentRepository;
    private final ExpenseRepository expenseRepository;
    private final ApprovalAuditLogRepository approvalAuditLogRepository;

    @Override
    @Transactional
    public void run(String... args) {
        Department engineering;
        Department sales;
        Department financeDept;
        User financeMansukhlal;
        User managerPayalDee;
        User employeeVrajNakum;
        User adminUser;

        if (departmentRepository.count() > 0) {
            log.info("Database already seeded with departments. Verifying users...");
            userRepository.findAll().forEach(user -> {
                if (user.getPassword() == null || user.getPassword().trim().isEmpty()) {
                    if (user.getRole() == Role.MANAGER) {
                        user.setPassword("Payaldee@123");
                    } else if (user.getRole() == Role.FINANCE) {
                        user.setPassword("Mansukhlal@123");
                    } else if (user.getRole() == Role.ADMIN) {
                        user.setPassword("Admin@123");
                    } else {
                        user.setPassword("Vrajnakum@123");
                    }
                    userRepository.save(user);
                }
            });

            employeeVrajNakum = userRepository.findByEmail("vrajnakum@gmail.com").orElse(null);
            managerPayalDee = userRepository.findByEmail("payaldee@gmail.com").orElse(null);
            financeMansukhlal = userRepository.findByEmail("mansukhlal@gmail.com").orElse(null);
        } else {
            log.info("Seeding initial master data (departments, users, travel policies)...");

            // 1. Create Departments
            engineering = departmentRepository.save(
                    Department.builder().name("Engineering").build()
            );
            sales = departmentRepository.save(
                    Department.builder().name("Sales").build()
            );
            financeDept = departmentRepository.save(
                    Department.builder().name("Finance").build()
            );

            // 2. Create Users
            financeMansukhlal = userRepository.save(
                    User.builder()
                            .fullName("Mansukhlal")
                            .email("mansukhlal@gmail.com")
                            .password("Mansukhlal@123")
                            .role(Role.FINANCE)
                            .department(financeDept)
                            .manager(null)
                            .finance(null)
                            .build()
            );

            managerPayalDee = userRepository.save(
                    User.builder()
                            .fullName("Payal Dee")
                            .email("payaldee@gmail.com")
                            .password("Payaldee@123")
                            .role(Role.MANAGER)
                            .department(engineering)
                            .manager(null)
                            .finance(financeMansukhlal)
                            .build()
            );

            employeeVrajNakum = userRepository.save(
                    User.builder()
                            .fullName("Vraj Nakum")
                            .email("vrajnakum@gmail.com")
                            .password("Vrajnakum@123")
                            .role(Role.EMPLOYEE)
                            .department(engineering)
                            .manager(managerPayalDee)
                            .finance(financeMansukhlal)
                            .build()
            );

            adminUser = userRepository.save(
                    User.builder()
                            .fullName("Admin")
                            .email("admin@gmail.com")
                            .password("Admin@123")
                            .role(Role.ADMIN)
                            .department(financeDept)
                            .manager(null)
                            .finance(financeMansukhlal)
                            .build()
            );

            // 3. Create Travel Policies
            travelPolicyRepository.save(
                    TravelPolicy.builder()
                            .department(engineering)
                            .maxBudgetLimit(new BigDecimal("2000.00"))
                            .allowedTravelClass(TravelClass.ECONOMY)
                            .build()
            );

            travelPolicyRepository.save(
                    TravelPolicy.builder()
                            .department(sales)
                            .maxBudgetLimit(new BigDecimal("5000.00"))
                            .allowedTravelClass(TravelClass.BUSINESS)
                            .build()
            );
        }

        // 4. Seed Initial Operational Travel Requests & Work Segments/Expenses if empty
        if (travelRequestRepository.count() == 0 && employeeVrajNakum != null && managerPayalDee != null && financeMansukhlal != null) {
            log.info("Seeding realistic corporate travel requests, itinerary segments & expenses...");

            // TRIP 1: APPROVED trip with full Itinerary Segments & Expense Claims connected to Purpose of Work
            TravelRequest trip1 = travelRequestRepository.save(
                    TravelRequest.builder()
                            .employee(employeeVrajNakum)
                            .destination("San Francisco, CA")
                            .startDate(LocalDate.now().plusDays(3))
                            .endDate(LocalDate.now().plusDays(8))
                            .purpose("Attend AWS Cloud Architecture Summit and Enterprise Client Workshop")
                            .estimatedBudget(new BigDecimal("1850.00"))
                            .travelClass(TravelClass.ECONOMY)
                            .status(RequestStatus.APPROVED)
                            .policyViolated(false)
                            .build()
            );

            // Itinerary Segments for Trip 1
            itinerarySegmentRepository.save(
                    ItinerarySegment.builder()
                            .travelRequest(trip1)
                            .segmentType(SegmentType.FLIGHT)
                            .title("Air India AI-101 (Direct to SFO)")
                            .location("San Francisco, CA")
                            .startTime(LocalDateTime.now().plusDays(3).withHour(8).withMinute(0))
                            .endTime(LocalDateTime.now().plusDays(3).withHour(20).withMinute(30))
                            .purposeOfWork("Travel to annual engineering cloud summit & executive client briefing")
                            .notes("Ticket PNR: AI-849201")
                            .build()
            );

            itinerarySegmentRepository.save(
                    ItinerarySegment.builder()
                            .travelRequest(trip1)
                            .segmentType(SegmentType.HOTEL)
                            .title("Hilton San Francisco Union Square")
                            .location("San Francisco, CA")
                            .startTime(LocalDateTime.now().plusDays(3).withHour(21).withMinute(0))
                            .endTime(LocalDateTime.now().plusDays(8).withHour(11).withMinute(0))
                            .purposeOfWork("Accommodation during multi-day enterprise technical sessions")
                            .notes("Reservation: HIL-99214")
                            .build()
            );

            itinerarySegmentRepository.save(
                    ItinerarySegment.builder()
                            .travelRequest(trip1)
                            .segmentType(SegmentType.CAB)
                            .title("Airport & Conference Venue Taxi")
                            .location("San Francisco Airport to Hilton")
                            .startTime(LocalDateTime.now().plusDays(3).withHour(20).withMinute(45))
                            .endTime(LocalDateTime.now().plusDays(3).withHour(21).withMinute(30))
                            .purposeOfWork("Direct transit between SFO terminal and conference hotel")
                            .notes("Receipt attached in claim")
                            .build()
            );

            // Expenses for Trip 1
            expenseRepository.save(
                    Expense.builder()
                            .travelRequest(trip1)
                            .category(ExpenseCategory.STAY)
                            .amount(new BigDecimal("450.00"))
                            .purposeOfWork("Hotel accommodation charges for client architecture workshop")
                            .receiptFileUrl("receipt_hilton_hotel_sfo.pdf")
                            .status(ReimbursementStatus.REIMBURSED)
                            .remarks("Approved and reimbursed by Finance Officer Mansukhlal")
                            .build()
            );

            expenseRepository.save(
                    Expense.builder()
                            .travelRequest(trip1)
                            .category(ExpenseCategory.TRANSPORT)
                            .amount(new BigDecimal("75.00"))
                            .purposeOfWork("Airport to conference venue transit fare")
                            .receiptFileUrl("receipt_airport_taxi_sfo.pdf")
                            .status(ReimbursementStatus.APPROVED)
                            .remarks("Approved by Finance, pending final payout")
                            .build()
            );

            expenseRepository.save(
                    Expense.builder()
                            .travelRequest(trip1)
                            .category(ExpenseCategory.FOOD)
                            .amount(new BigDecimal("60.00"))
                            .purposeOfWork("Working dinner with client lead architect")
                            .receiptFileUrl("receipt_client_dinner_sfo.pdf")
                            .status(ReimbursementStatus.PENDING)
                            .remarks("Submitted by traveler for reimbursement")
                            .build()
            );

            // Audit Trail for Trip 1
            approvalAuditLogRepository.save(
                    ApprovalAuditLog.builder()
                            .travelRequest(trip1)
                            .actionBy(employeeVrajNakum)
                            .previousStatus(RequestStatus.DRAFT)
                            .newStatus(RequestStatus.PENDING_MANAGER)
                            .comments("Submitted request for Manager approval")
                            .build()
            );

            approvalAuditLogRepository.save(
                    ApprovalAuditLog.builder()
                            .travelRequest(trip1)
                            .actionBy(managerPayalDee)
                            .previousStatus(RequestStatus.PENDING_MANAGER)
                            .newStatus(RequestStatus.PENDING_FINANCE)
                            .comments("Approved: Travel is necessary for enterprise architecture deliverables.")
                            .build()
            );

            approvalAuditLogRepository.save(
                    ApprovalAuditLog.builder()
                            .travelRequest(trip1)
                            .actionBy(financeMansukhlal)
                            .previousStatus(RequestStatus.PENDING_FINANCE)
                            .newStatus(RequestStatus.APPROVED)
                            .comments("Budget verified within Engineering limit ($2000.00). Approved.")
                            .build()
            );

            // TRIP 2: PENDING_MANAGER (Manager Payal Dee can test APPROVE or REJECT)
            TravelRequest trip2 = travelRequestRepository.save(
                    TravelRequest.builder()
                            .employee(employeeVrajNakum)
                            .destination("London, UK")
                            .startDate(LocalDate.now().plusDays(14))
                            .endDate(LocalDate.now().plusDays(19))
                            .purpose("European Client Discovery & Enterprise Security Review")
                            .estimatedBudget(new BigDecimal("1600.00"))
                            .travelClass(TravelClass.ECONOMY)
                            .status(RequestStatus.PENDING_MANAGER)
                            .policyViolated(false)
                            .build()
            );

            approvalAuditLogRepository.save(
                    ApprovalAuditLog.builder()
                            .travelRequest(trip2)
                            .actionBy(employeeVrajNakum)
                            .previousStatus(RequestStatus.DRAFT)
                            .newStatus(RequestStatus.PENDING_MANAGER)
                            .comments("Submitted for Manager approval")
                            .build()
            );

            // TRIP 3: PENDING_FINANCE (Finance Mansukhlal can test APPROVE or REJECT)
            TravelRequest trip3 = travelRequestRepository.save(
                    TravelRequest.builder()
                            .employee(employeeVrajNakum)
                            .destination("Tokyo, Japan")
                            .startDate(LocalDate.now().plusDays(25))
                            .endDate(LocalDate.now().plusDays(30))
                            .purpose("APAC Regional Partner Integration & Deployment")
                            .estimatedBudget(new BigDecimal("1950.00"))
                            .travelClass(TravelClass.ECONOMY)
                            .status(RequestStatus.PENDING_FINANCE)
                            .policyViolated(false)
                            .build()
            );

            approvalAuditLogRepository.save(
                    ApprovalAuditLog.builder()
                            .travelRequest(trip3)
                            .actionBy(managerPayalDee)
                            .previousStatus(RequestStatus.PENDING_MANAGER)
                            .newStatus(RequestStatus.PENDING_FINANCE)
                            .comments("Approved by Manager. Routed to Finance for budget compliance.")
                            .build()
            );

            // TRIP 4: DRAFT (Vraj Nakum can edit, add segments, or submit)
            travelRequestRepository.save(
                    TravelRequest.builder()
                            .employee(employeeVrajNakum)
                            .destination("Bengaluru, India")
                            .startDate(LocalDate.now().plusDays(40))
                            .endDate(LocalDate.now().plusDays(43))
                            .purpose("Quarterly Tech Council Workshop")
                            .estimatedBudget(new BigDecimal("600.00"))
                            .travelClass(TravelClass.ECONOMY)
                            .status(RequestStatus.DRAFT)
                            .policyViolated(false)
                            .build()
            );

            log.info("Operational travel requests, itinerary segments & expenses seeded successfully!");
        }

        log.info("Data initialization check complete.");
    }
}
