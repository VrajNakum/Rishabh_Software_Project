package com.corporate.travel.enums;

//Why the Errors Happened
//1. The Immediate Cause: Declared as class instead of enum



public enum RequestStatus {
    DRAFT,
    PENDING_MANAGER,
    PENDING_FINANCE,
    APPROVED,
    REJECTED,
    CANCELLED
}
