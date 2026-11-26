package com.corporate.travel.service;

import com.corporate.travel.dto.NotificationDto;
import com.corporate.travel.entity.Notification;
import com.corporate.travel.entity.TravelRequest;
import com.corporate.travel.entity.User;
import com.corporate.travel.enums.RequestStatus;
import com.corporate.travel.enums.Role;
import com.corporate.travel.exception.ResourceNotFoundException;
import com.corporate.travel.repository.NotificationRepository;
import com.corporate.travel.repository.UserRepository;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Persists and dispatches notifications across Employees, Managers, Finance Officers, and Admins.
 */
@Service
public class AppNotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    public AppNotificationService(NotificationRepository notificationRepository, UserRepository userRepository) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<NotificationDto> getForUser(Long userId) {
        return notificationRepository.findByRecipientUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public NotificationDto createNotification(NotificationDto dto) {
        Notification saved = notificationRepository.save(Notification.builder()
                .recipientUserId(dto.getRecipientUserId())
                .senderUserId(dto.getSenderUserId())
                .senderName(dto.getSenderName() != null && !dto.getSenderName().isBlank() ? dto.getSenderName().trim() : "System")
                .title(dto.getTitle().trim())
                .message(dto.getMessage().trim())
                .requestId(dto.getRequestId())
                .type(dto.getType().trim().toUpperCase())
                .isRead(Boolean.TRUE.equals(dto.getIsRead()))
                .createdAt(dto.getCreatedAt())
                .build());
        return toDto(saved);
    }

    @Transactional
    public NotificationDto updateReadStatus(Long id, boolean read) {
        Notification notif = notificationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found with id: " + id));
        notif.setIsRead(read);
        return toDto(notificationRepository.save(notif));
    }

    @Transactional
    public void markAllAsReadForUser(Long userId) {
        List<Notification> list = notificationRepository.findByRecipientUserIdOrderByCreatedAtDesc(userId);
        list.forEach(n -> n.setIsRead(true));
        notificationRepository.saveAll(list);
    }

    @Transactional
    public void deleteNotification(Long id) {
        if (notificationRepository.existsById(id)) {
            notificationRepository.deleteById(id);
        }
    }

    @Transactional
    public void clearAllForUser(Long userId) {
        notificationRepository.deleteByRecipientUserId(userId);
    }

    @Transactional
    public void deleteByRequestId(Long requestId) {
        notificationRepository.deleteByRequestId(requestId);
    }

    @Transactional
    public void notifyTravelRequestSubmitted(TravelRequest request) {
        if (request == null || request.getEmployee() == null) {
            return;
        }
        User emp = request.getEmployee();
        User mgr = emp.getManager();
        User fin = emp.getFinance();
        String dest = request.getDestination() != null ? request.getDestination() : "Business Destination";
        String budget = request.getEstimatedBudget() != null ? "₹" + request.getEstimatedBudget() : "";

        Set<Long> notified = new LinkedHashSet<>();

        // 1. Assigned Manager
        if (mgr != null && notified.add(mgr.getId())) {
            saveInternal(mgr.getId(), emp.getId(), emp.getFullName(),
                    "New Travel Request #" + request.getId() + " Awaiting Review",
                    String.format("%s submitted Travel Request #%d to %s (%s) awaiting your manager approval.",
                            emp.getFullName(), request.getId(), dest, budget),
                    request.getId(), "SUBMISSION");
        }

        // 2. Assigned Finance Officer
        if (fin != null && notified.add(fin.getId())) {
            saveInternal(fin.getId(), emp.getId(), emp.getFullName(),
                    "Travel Request #" + request.getId() + " Submitted for " + emp.getFullName(),
                    String.format("%s submitted Travel Request #%d to %s (%s). Queued for financial audit upon manager approval.",
                            emp.getFullName(), request.getId(), dest, budget),
                    request.getId(), "SUBMISSION");
        }

        // 3. Employee confirmation
        if (notified.add(emp.getId())) {
            String mgrName = mgr != null ? mgr.getFullName() : "Assigned Manager";
            saveInternal(emp.getId(), emp.getId(), "System",
                    "Travel Request #" + request.getId() + " Submitted Successfully",
                    String.format("Your travel request to %s (%s) has been submitted to %s for approval.",
                            dest, budget, mgrName),
                    request.getId(), "SUBMISSION");
        }

        // 4. All System Admins
        for (User admin : userRepository.findByRole(Role.ADMIN)) {
            if (notified.add(admin.getId())) {
                saveInternal(admin.getId(), emp.getId(), emp.getFullName(),
                        "New Travel Request #" + request.getId() + " Submitted",
                        String.format("%s submitted Travel Request #%d to %s (%s).",
                                emp.getFullName(), request.getId(), dest, budget),
                        request.getId(), "SUBMISSION");
            }
        }

        // 5. Policy Violation alert to all stakeholders
        if (Boolean.TRUE.equals(request.getPolicyViolated())) {
            String reason = request.getPolicyViolationReason() != null
                    ? request.getPolicyViolationReason()
                    : "Exceeds predefined travel class max budget limit.";
            Set<Long> alertRecipients = new LinkedHashSet<>();
            alertRecipients.add(emp.getId());
            if (mgr != null) alertRecipients.add(mgr.getId());
            if (fin != null) alertRecipients.add(fin.getId());
            userRepository.findByRole(Role.ADMIN).forEach(a -> alertRecipients.add(a.getId()));

            for (Long uid : alertRecipients) {
                saveInternal(uid, emp.getId(), "Policy System",
                        "Policy Violation Flagged: Request #" + request.getId(),
                        String.format("%s's request to %s (%s) flagged a policy violation: %s",
                                emp.getFullName(), dest, budget, reason),
                        request.getId(), "POLICY_ALERT");
            }
        }
    }

    @Transactional
    public void notifyTravelRequestReviewed(TravelRequest request, User reviewer, boolean isApproval, String comments) {
        if (request == null || request.getEmployee() == null || reviewer == null) {
            return;
        }
        User emp = request.getEmployee();
        User mgr = emp.getManager();
        User fin = emp.getFinance();
        String dest = request.getDestination() != null ? request.getDestination() : "Destination";
        String feedback = (comments != null && !comments.trim().isEmpty())
                ? " Feedback: \"" + comments.trim() + "\""
                : "";
        String roleLabel = reviewer.getRole() == Role.ADMIN
                ? "Administrator"
                : (reviewer.getRole() == Role.FINANCE ? "Finance Officer" : "Manager");

        Set<Long> recipients = new LinkedHashSet<>();
        recipients.add(emp.getId());
        if (mgr != null) recipients.add(mgr.getId());
        if (fin != null) recipients.add(fin.getId());
        userRepository.findByRole(Role.ADMIN).forEach(a -> recipients.add(a.getId()));

        if (isApproval) {
            boolean finalApproved = request.getStatus() == RequestStatus.APPROVED;
            String title = finalApproved
                    ? "Travel Request #" + request.getId() + " Approved by " + roleLabel + "!"
                    : "Travel Request #" + request.getId() + " Approved by " + roleLabel;

            for (Long uid : recipients) {
                String msg;
                if (uid.equals(emp.getId())) {
                    msg = finalApproved
                            ? String.format("%s %s approved your Travel Request #%d to %s! Your corporate travel is fully authorized.%s",
                                    roleLabel, reviewer.getFullName(), request.getId(), dest, feedback)
                            : String.format("%s %s approved your Travel Request #%d to %s. Forwarded to Finance for final audit.%s",
                                    roleLabel, reviewer.getFullName(), request.getId(), dest, feedback);
                } else {
                    msg = finalApproved
                            ? String.format("Travel Request #%d for %s to %s received final approval from %s %s.%s",
                                    request.getId(), emp.getFullName(), dest, roleLabel, reviewer.getFullName(), feedback)
                            : String.format("Travel Request #%d for %s to %s was approved by %s %s and forwarded to Finance.%s",
                                    request.getId(), emp.getFullName(), dest, roleLabel, reviewer.getFullName(), feedback);
                }
                saveInternal(uid, reviewer.getId(), reviewer.getFullName(), title, msg, request.getId(), "APPROVAL");
            }
        } else {
            String reasonText = !feedback.isEmpty() ? feedback : " Feedback: \"Rejected during review\"";
            String title = "Travel Request #" + request.getId() + " Rejected by " + roleLabel;
            for (Long uid : recipients) {
                String msg = uid.equals(emp.getId())
                        ? String.format("Your Travel Request #%d to %s was rejected by %s %s.%s",
                                request.getId(), dest, roleLabel, reviewer.getFullName(), reasonText)
                        : String.format("Travel Request #%d for %s to %s was rejected by %s %s.%s",
                                request.getId(), emp.getFullName(), dest, roleLabel, reviewer.getFullName(), reasonText);
                saveInternal(uid, reviewer.getId(), reviewer.getFullName(), title, msg, request.getId(), "REJECTION");
            }
        }
    }

    private void saveInternal(
            Long recipientUserId,
            Long senderUserId,
            String senderName,
            String title,
            String message,
            Long requestId,
            String type) {
        notificationRepository.save(Notification.builder()
                .recipientUserId(recipientUserId)
                .senderUserId(senderUserId)
                .senderName(senderName != null ? senderName : "System")
                .title(title)
                .message(message)
                .requestId(requestId)
                .type(type)
                .isRead(false)
                .build());
    }

    private NotificationDto toDto(Notification entity) {
        return NotificationDto.builder()
                .id(entity.getId())
                .recipientUserId(entity.getRecipientUserId())
                .senderUserId(entity.getSenderUserId())
                .senderName(entity.getSenderName())
                .title(entity.getTitle())
                .message(entity.getMessage())
                .requestId(entity.getRequestId())
                .type(entity.getType())
                .isRead(entity.getIsRead())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
