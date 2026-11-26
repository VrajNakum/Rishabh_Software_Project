package com.corporate.travel.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * DTO for creating and returning user notifications with required field validation.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotificationDto {
    private Long id;

    @NotNull(message = "Recipient User ID is required")
    private Long recipientUserId;

    private Long senderUserId;

    private String senderName;

    @NotBlank(message = "Notification title is required")
    private String title;

    @NotBlank(message = "Notification message is required")
    private String message;

    private Long requestId;

    @NotBlank(message = "Notification type is required")
    private String type;

    @JsonProperty("isRead")
    private Boolean isRead;

    private LocalDateTime createdAt;
}
