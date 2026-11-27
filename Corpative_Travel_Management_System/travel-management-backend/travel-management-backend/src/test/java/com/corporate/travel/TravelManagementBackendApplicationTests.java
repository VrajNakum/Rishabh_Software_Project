package com.corporate.travel;

import com.corporate.travel.dto.ApprovalActionDto;
import com.corporate.travel.dto.NotificationDto;
import com.corporate.travel.dto.TravelRequestCreateDto;
import com.corporate.travel.dto.TravelRequestResponseDto;
import com.corporate.travel.entity.User;
import com.corporate.travel.enums.RequestStatus;
import com.corporate.travel.enums.TravelClass;
import com.corporate.travel.exception.InvalidStateTransitionException;
import com.corporate.travel.repository.UserRepository;
import com.corporate.travel.service.AppNotificationService;
import com.corporate.travel.service.TravelRequestService;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class TravelManagementBackendApplicationTests {

	@Autowired
	private ApplicationContext applicationContext;

	@Autowired
	private TravelRequestService travelRequestService;

	@Autowired
	private UserRepository userRepository;

	@Autowired
	private AppNotificationService appNotificationService;

	@Test
	void contextLoads() {
		assertNotNull(applicationContext, "Application context should load successfully");
	}

	@Test
	@Transactional
	void shouldSeedPredefinedPoliciesAndFlagViolationsWhenBudgetOrClassExceedsLimit() {
		List<Map<String, Object>> policies = travelRequestService.getPredefinedPolicies();
		assertTrue(policies.size() >= 3, "Travel class policies (ECONOMY, PREMIUM_ECONOMY, BUSINESS) should be seeded");

		User employee = userRepository.findByEmail("vrajnakum@gmail.com").orElseThrow();

		// 1. Crosses ECONOMY max budget limit (₹2000) -> flagged as policy violation
		TravelRequestResponseDto overEconomyBudget = travelRequestService.createTravelRequest(
				TravelRequestCreateDto.builder()
						.employeeId(employee.getId())
						.destination("Zurich, Switzerland")
						.startDate(LocalDate.now().plusDays(10))
						.endDate(LocalDate.now().plusDays(14))
						.purpose("Client Workshop")
						.estimatedBudget(new BigDecimal("2500.00"))
						.travelClass(TravelClass.ECONOMY)
						.draft(false)
						.build()
		);
		assertTrue(overEconomyBudget.getPolicyViolated(), "Over-budget ECONOMY request must flag policy violation");
		assertNotNull(overEconomyBudget.getPolicyViolationReason());
		assertTrue(overEconomyBudget.getPolicyViolationReason().contains("exceeds ECONOMY travel class max budget limit"));

		// 2. Within BUSINESS max budget limit (₹5000) -> compliant
		TravelRequestResponseDto withinBusinessLimit = travelRequestService.createTravelRequest(
				TravelRequestCreateDto.builder()
						.employeeId(employee.getId())
						.destination("Mumbai, India")
						.startDate(LocalDate.now().plusDays(15))
						.endDate(LocalDate.now().plusDays(17))
						.purpose("Internal Summit")
						.estimatedBudget(new BigDecimal("5000.00"))
						.travelClass(TravelClass.BUSINESS)
						.draft(false)
						.build()
		);
		assertFalse(withinBusinessLimit.getPolicyViolated(), "Budget equal to BUSINESS max limit should be compliant");
		assertNull(withinBusinessLimit.getPolicyViolationReason());

		// 3. Crosses PREMIUM_ECONOMY max budget limit (₹3500) -> flagged as policy violation
		TravelRequestResponseDto overPremiumBudget = travelRequestService.createTravelRequest(
				TravelRequestCreateDto.builder()
						.employeeId(employee.getId())
						.destination("Pune, India")
						.startDate(LocalDate.now().plusDays(20))
						.endDate(LocalDate.now().plusDays(22))
						.purpose("Team Sync")
						.estimatedBudget(new BigDecimal("4000.00"))
						.travelClass(TravelClass.PREMIUM_ECONOMY)
						.draft(false)
						.build()
		);
		assertTrue(overPremiumBudget.getPolicyViolated(), "Over-budget PREMIUM_ECONOMY request must flag policy violation");
		assertTrue(overPremiumBudget.getPolicyViolationReason().contains("exceeds PREMIUM_ECONOMY travel class max budget limit"));
	}

	@Test
	@Transactional
	void shouldPersistNotificationsForEmployeeManagerFinanceAndAdminOnSubmitApproveAndReject() {
		User employee = userRepository.findByEmail("vrajnakum@gmail.com").orElseThrow();
		User manager = employee.getManager();
		User finance = employee.getFinance();
		User admin = userRepository.findByEmail("admin@gmail.com").orElseThrow();

		TravelRequestResponseDto created = travelRequestService.createTravelRequest(
				TravelRequestCreateDto.builder()
						.employeeId(employee.getId())
						.destination("Hyderabad, India")
						.startDate(LocalDate.now().plusDays(12))
						.endDate(LocalDate.now().plusDays(15))
						.purpose("Tech Conference")
						.estimatedBudget(new BigDecimal("1800.00"))
						.travelClass(TravelClass.ECONOMY)
						.draft(false)
						.build()
		);

		Long reqId = created.getId();
		assertTrue(appNotificationService.getForUser(employee.getId()).stream().anyMatch(n -> reqId.equals(n.getRequestId()) && "SUBMISSION".equals(n.getType())));
		assertTrue(appNotificationService.getForUser(manager.getId()).stream().anyMatch(n -> reqId.equals(n.getRequestId()) && "SUBMISSION".equals(n.getType())));
		assertTrue(appNotificationService.getForUser(finance.getId()).stream().anyMatch(n -> reqId.equals(n.getRequestId()) && "SUBMISSION".equals(n.getType())));
		assertTrue(appNotificationService.getForUser(admin.getId()).stream().anyMatch(n -> reqId.equals(n.getRequestId()) && "SUBMISSION".equals(n.getType())));

		// Manager approves -> APPROVAL notification persisted for Employee, Manager, Finance, Admin
		travelRequestService.processApprovalAction(reqId, ApprovalActionDto.builder()
				.reviewerUserId(manager.getId())
				.action("APPROVE")
				.comments("Looks good")
				.build());

		assertTrue(appNotificationService.getForUser(employee.getId()).stream().anyMatch(n -> reqId.equals(n.getRequestId()) && "APPROVAL".equals(n.getType())));
		assertTrue(appNotificationService.getForUser(finance.getId()).stream().anyMatch(n -> reqId.equals(n.getRequestId()) && "APPROVAL".equals(n.getType())));
		assertTrue(appNotificationService.getForUser(admin.getId()).stream().anyMatch(n -> reqId.equals(n.getRequestId()) && "APPROVAL".equals(n.getType())));

		// Finance rejects -> REJECTION notification persisted with reason for Employee, Manager, Finance, Admin
		travelRequestService.processApprovalAction(reqId, ApprovalActionDto.builder()
				.reviewerUserId(finance.getId())
				.action("REJECT")
				.comments("Quarter budget frozen")
				.build());

		List<NotificationDto> empNotifs = appNotificationService.getForUser(employee.getId());
		assertTrue(empNotifs.stream().anyMatch(n -> reqId.equals(n.getRequestId()) && "REJECTION".equals(n.getType()) && n.getMessage().contains("Quarter budget frozen")));
		assertTrue(appNotificationService.getForUser(manager.getId()).stream().anyMatch(n -> reqId.equals(n.getRequestId()) && "REJECTION".equals(n.getType())));
		assertTrue(appNotificationService.getForUser(admin.getId()).stream().anyMatch(n -> reqId.equals(n.getRequestId()) && "REJECTION".equals(n.getType())));
	}

	@Test
	@Transactional
	void shouldBlockApprovalAndAllowRejectionWhenStartDateReachedOrCrossed() {
		User employee = userRepository.findByEmail("vrajnakum@gmail.com").orElseThrow();
		User manager = employee.getManager();

		TravelRequestResponseDto sameDayRequest = travelRequestService.createTravelRequest(
				TravelRequestCreateDto.builder()
						.employeeId(employee.getId())
						.destination("Ahmedabad, India")
						.startDate(LocalDate.now())
						.endDate(LocalDate.now().plusDays(2))
						.purpose("Same-day cutoff check")
						.estimatedBudget(new BigDecimal("1500.00"))
						.travelClass(TravelClass.ECONOMY)
						.draft(false)
						.priorityRequest(true)
						.build()
		);
		assertTrue(Boolean.TRUE.equals(sameDayRequest.getPriorityRequest()));

		Long reqId = sameDayRequest.getId();
		TravelRequestResponseDto toggledOff = travelRequestService.updatePriority(reqId, false);
		assertFalse(Boolean.TRUE.equals(toggledOff.getPriorityRequest()));
		TravelRequestResponseDto toggledOn = travelRequestService.updatePriority(reqId, true);
		assertTrue(Boolean.TRUE.equals(toggledOn.getPriorityRequest()));

		InvalidStateTransitionException ex = assertThrows(
				InvalidStateTransitionException.class,
				() -> travelRequestService.processApprovalAction(reqId, ApprovalActionDto.builder()
						.reviewerUserId(manager.getId())
						.action("APPROVE")
						.comments("Late approval")
						.build())
		);
		assertTrue(ex.getMessage().contains("before the starting date"));

		TravelRequestResponseDto rejected = travelRequestService.processApprovalAction(reqId, ApprovalActionDto.builder()
				.reviewerUserId(manager.getId())
				.action("REJECT")
				.comments("Start date crossed")
				.build());
		assertEquals(RequestStatus.REJECTED, rejected.getStatus());

		TravelRequestResponseDto rejectedPriorityOff = travelRequestService.updatePriority(reqId, false);
		assertFalse(Boolean.TRUE.equals(rejectedPriorityOff.getPriorityRequest()));
	}

}
