package com.corporate.travel.repository;

import com.corporate.travel.entity.Notification;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByRecipientUserIdOrderByCreatedAtDesc(Long recipientUserId);
    boolean existsByRequestId(Long requestId);
    void deleteByRecipientUserId(Long recipientUserId);
    void deleteByRequestId(Long requestId);
}
