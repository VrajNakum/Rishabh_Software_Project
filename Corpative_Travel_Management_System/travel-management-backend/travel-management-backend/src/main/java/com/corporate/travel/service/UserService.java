package com.corporate.travel.service;

import com.corporate.travel.dto.UserCreateDto;
import com.corporate.travel.dto.UserResponseDto;
import com.corporate.travel.dto.UserUpdateDto;
import com.corporate.travel.enums.Role;
import java.util.List;

public interface UserService {
    UserResponseDto createUser(UserCreateDto dto);
    List<UserResponseDto> getAllUsers();
    List<UserResponseDto> getUsersByRole(Role role);
    UserResponseDto getUserById(Long id);
    UserResponseDto updateUser(Long id, UserUpdateDto dto);
    void deleteUser(Long id);
}
