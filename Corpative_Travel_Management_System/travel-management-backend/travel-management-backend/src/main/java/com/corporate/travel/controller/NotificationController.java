package com.corporate.travel.controller;

import com.corporate.travel.dto.NotificationDto;
import com.corporate.travel.service.AppNotificationService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final AppNotificationService appNotificationService;

    public NotificationController(AppNotificationService appNotificationService) {
        this.appNotificationService = appNotificationService;
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<NotificationDto>> getUserNotifications(@PathVariable Long userId) {
        return ResponseEntity.ok(appNotificationService.getForUser(userId));
    }

    @PostMapping
    public ResponseEntity<NotificationDto> createNotification(@Valid @RequestBody NotificationDto dto) {
        return new ResponseEntity<>(appNotificationService.createNotification(dto), HttpStatus.CREATED);
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<NotificationDto> updateReadStatus(
            @PathVariable Long id,
            @RequestParam boolean read) {
        return ResponseEntity.ok(appNotificationService.updateReadStatus(id, read));
    }

    @PatchMapping("/user/{userId}/read-all")
    public ResponseEntity<Void> markAllAsRead(@PathVariable Long userId) {
        appNotificationService.markAllAsReadForUser(userId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteNotification(@PathVariable Long id) {
        appNotificationService.deleteNotification(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/user/{userId}")
    public ResponseEntity<Void> clearUserNotifications(@PathVariable Long userId) {
        appNotificationService.clearAllForUser(userId);
        return ResponseEntity.noContent().build();
    }
}
