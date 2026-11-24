package com.corporate.travel.service;

import com.corporate.travel.dto.UserCreateDto;
import com.corporate.travel.dto.UserResponseDto;
import com.corporate.travel.dto.UserUpdateDto;
import com.corporate.travel.entity.Department;
import com.corporate.travel.entity.User;
import com.corporate.travel.enums.Role;
import com.corporate.travel.exception.ResourceNotFoundException;
import com.corporate.travel.repository.DepartmentRepository;
import com.corporate.travel.repository.UserRepository;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final DepartmentRepository departmentRepository;

    public UserServiceImpl(UserRepository userRepository, DepartmentRepository departmentRepository) {
        this.userRepository = userRepository;
        this.departmentRepository = departmentRepository;
    }

    @Override
    @Transactional
    public UserResponseDto createUser(UserCreateDto dto) {
        if (userRepository.findByEmail(dto.getEmail().trim().toLowerCase()).isPresent()) {
            throw new IllegalArgumentException("A user with email '" + dto.getEmail() + "' already exists.");
        }

        String deptName = dto.getDepartmentName().trim();
        Department department = departmentRepository.findByName(deptName)
                .orElseGet(() -> departmentRepository.save(Department.builder().name(deptName).build()));

        User manager = null;
        if (dto.getManagerId() != null) {
            manager = userRepository.findById(dto.getManagerId())
                    .orElseThrow(() -> new ResourceNotFoundException("Manager not found with id: " + dto.getManagerId()));
        }

        User finance = null;
        if (dto.getFinanceId() != null) {
            finance = userRepository.findById(dto.getFinanceId())
                    .orElseThrow(() -> new ResourceNotFoundException("Finance officer not found with id: " + dto.getFinanceId()));
        }

        User user = User.builder()
                .fullName(dto.getFullName().trim())
                .email(dto.getEmail().trim().toLowerCase())
                .password(dto.getPassword() != null ? dto.getPassword().trim() : "")
                .role(dto.getRole())
                .department(department)
                .manager(manager)
                .finance(finance)
                .bankName(dto.getBankName())
                .bankBranch(dto.getBankBranch())
                .ifscCode(dto.getIfscCode())
                .ifscName(dto.getIfscName())
                .accountNumber(dto.getAccountNumber())
                .bankProofFileName(dto.getBankProofFileName())
                .bankProofFileUrl(dto.getBankProofFileUrl())
                .build();

        User saved = userRepository.save(user);
        return mapToDto(saved);
    }

    @Override
    @Transactional
    public UserResponseDto updateUser(Long id, UserUpdateDto dto) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));

        if (dto.getFullName() != null && !dto.getFullName().trim().isEmpty()) {
            user.setFullName(dto.getFullName().trim());
        }

        if (dto.getEmail() != null && !dto.getEmail().trim().isEmpty()) {
            String newEmail = dto.getEmail().trim().toLowerCase();
            if (!newEmail.equalsIgnoreCase(user.getEmail())) {
                if (userRepository.findByEmail(newEmail).isPresent()) {
                    throw new IllegalArgumentException("A user with email '" + newEmail + "' already exists.");
                }
                user.setEmail(newEmail);
            }
        }

        if (dto.getPassword() != null && !dto.getPassword().trim().isEmpty()) {
            user.setPassword(dto.getPassword().trim());
        }

        if (dto.getRole() != null) {
            user.setRole(dto.getRole());
        }

        if (dto.getDepartmentName() != null && !dto.getDepartmentName().trim().isEmpty()) {
            String deptName = dto.getDepartmentName().trim();
            Department department = departmentRepository.findByName(deptName)
                    .orElseGet(() -> departmentRepository.save(Department.builder().name(deptName).build()));
            user.setDepartment(department);
        }

        // Manager assignment update
        if (dto.getManagerId() != null) {
            User manager = userRepository.findById(dto.getManagerId())
                    .orElseThrow(() -> new ResourceNotFoundException("Manager not found with id: " + dto.getManagerId()));
            user.setManager(manager);
        } else {
            user.setManager(null);
        }

        // Finance assignment update
        if (dto.getFinanceId() != null) {
            User finance = userRepository.findById(dto.getFinanceId())
                    .orElseThrow(() -> new ResourceNotFoundException("Finance officer not found with id: " + dto.getFinanceId()));
            user.setFinance(finance);
        } else {
            user.setFinance(null);
        }

        // Bank details update
        if (dto.getBankName() != null) {
            user.setBankName(dto.getBankName().trim());
        }
        if (dto.getBankBranch() != null) {
            user.setBankBranch(dto.getBankBranch().trim());
        }
        if (dto.getIfscCode() != null) {
            user.setIfscCode(dto.getIfscCode().trim());
        }
        if (dto.getIfscName() != null) {
            user.setIfscName(dto.getIfscName().trim());
        }
        if (dto.getAccountNumber() != null) {
            user.setAccountNumber(dto.getAccountNumber().trim());
        }
        if (dto.getBankProofFileName() != null) {
            user.setBankProofFileName(dto.getBankProofFileName().trim());
        }
        if (dto.getBankProofFileUrl() != null) {
            user.setBankProofFileUrl(dto.getBankProofFileUrl());
        }

        User saved = userRepository.save(user);
        return mapToDto(saved);
    }

    @Override
    @Transactional
    public void deleteUser(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));
        userRepository.delete(user);
    }

    @Override
    @Transactional(readOnly = true)
    public List<UserResponseDto> getAllUsers() {
        return userRepository.findAll().stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<UserResponseDto> getUsersByRole(Role role) {
        return userRepository.findByRole(role).stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public UserResponseDto getUserById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));
        return mapToDto(user);
    }

    private UserResponseDto mapToDto(User user) {
        return UserResponseDto.builder()
                .id(user.getId())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .password(user.getPassword())
                .role(user.getRole())
                .departmentName(user.getDepartment() != null ? user.getDepartment().getName() : null)
                .departmentId(user.getDepartment() != null ? user.getDepartment().getId() : null)
                .managerId(user.getManager() != null ? user.getManager().getId() : null)
                .managerName(user.getManager() != null ? user.getManager().getFullName() : null)
                .financeId(user.getFinance() != null ? user.getFinance().getId() : null)
                .financeName(user.getFinance() != null ? user.getFinance().getFullName() : (user.getRole() == Role.FINANCE ? "Self (Finance Officer)" : null))
                .bankName(user.getBankName())
                .bankBranch(user.getBankBranch())
                .ifscCode(user.getIfscCode())
                .ifscName(user.getIfscName())
                .accountNumber(user.getAccountNumber())
                .bankProofFileName(user.getBankProofFileName())
                .bankProofFileUrl(user.getBankProofFileUrl())
                .build();
    }
}
