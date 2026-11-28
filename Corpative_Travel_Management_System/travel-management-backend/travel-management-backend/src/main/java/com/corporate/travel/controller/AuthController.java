package com.corporate.travel.controller;

import com.corporate.travel.dto.AuthLoginRequestDto;
import com.corporate.travel.dto.AuthRegisterRequestDto;
import com.corporate.travel.dto.AuthResetPasswordDto;
import com.corporate.travel.dto.AuthResponseDto;
import com.corporate.travel.dto.UserCreateDto;
import com.corporate.travel.dto.UserResponseDto;
import com.corporate.travel.dto.UserUpdateDto;
import com.corporate.travel.entity.User;
import com.corporate.travel.enums.Role;
import com.corporate.travel.exception.ResourceNotFoundException;
import com.corporate.travel.repository.UserRepository;
import com.corporate.travel.security.CustomUserDetailsService;
import com.corporate.travel.security.JwtService;
import com.corporate.travel.security.UserPrincipal;
import com.corporate.travel.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Handles JWT authentication, user registration, password recovery, and active session lookup.
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final CustomUserDetailsService userDetailsService;
    private final UserRepository userRepository;
    private final UserService userService;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthController(
            AuthenticationManager authenticationManager,
            CustomUserDetailsService userDetailsService,
            UserRepository userRepository,
            UserService userService,
            PasswordEncoder passwordEncoder,
            JwtService jwtService) {
        this.authenticationManager = authenticationManager;
        this.userDetailsService = userDetailsService;
        this.userRepository = userRepository;
        this.userService = userService;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponseDto> login(@Valid @RequestBody AuthLoginRequestDto request) {
        String rawPassword = request.getPassword().trim();
        User matchedUser = userDetailsService.resolveUserByIdentifier(request.getIdentifier())
                .orElseThrow(() -> new BadCredentialsException("Invalid email/username or password."));

        upgradePlainTextPasswordIfNeeded(matchedUser, rawPassword);

        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(matchedUser.getEmail(), rawPassword)
        );
        UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();
        return ResponseEntity.ok(buildAuthResponse(principal));
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponseDto> register(@Valid @RequestBody AuthRegisterRequestDto request) {
        String departmentName = request.getDepartmentName() != null && !request.getDepartmentName().trim().isEmpty()
                ? request.getDepartmentName().trim()
                : "Engineering";

        UserCreateDto createDto = UserCreateDto.builder()
                .fullName(request.getFullName().trim())
                .email(request.getEmail().trim().toLowerCase())
                .password(request.getPassword().trim())
                .role(Role.EMPLOYEE)
                .departmentName(departmentName)
                .build();

        UserResponseDto created = userService.createUser(createDto);
        UserPrincipal principal = (UserPrincipal) userDetailsService.loadUserByUsername(created.getEmail());
        return new ResponseEntity<>(buildAuthResponse(principal), HttpStatus.CREATED);
    }

    @PostMapping("/reset-password")
    public ResponseEntity<AuthResponseDto> resetPassword(@Valid @RequestBody AuthResetPasswordDto request) {
        User matchedUser = userDetailsService.resolveUserByIdentifier(request.getEmail())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No corporate account found matching '" + request.getEmail() + "'."));

        matchedUser.setPassword(passwordEncoder.encode(request.getNewPassword().trim()));
        userRepository.save(matchedUser);

        UserPrincipal principal = (UserPrincipal) userDetailsService.loadUserByUsername(matchedUser.getEmail());
        return ResponseEntity.ok(buildAuthResponse(principal));
    }

    @GetMapping("/account-lookup")
    public ResponseEntity<UserResponseDto> lookupAccount(@RequestParam String email) {
        User user = userDetailsService.resolveUserByIdentifier(email)
                .orElseThrow(() -> new ResourceNotFoundException("No corporate account found matching '" + email + "'."));
        return ResponseEntity.ok(userService.getUserById(user.getId()));
    }

    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<UserResponseDto> currentUser(Authentication authentication) {
        UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();
        return ResponseEntity.ok(userService.getUserById(principal.getId()));
    }

    private AuthResponseDto buildAuthResponse(UserPrincipal principal) {
        String token = jwtService.generateToken(principal);
        UserResponseDto userDto = userService.getUserById(principal.getId());
        return AuthResponseDto.builder()
                .token(token)
                .tokenType("Bearer")
                .expiresIn(jwtService.getExpirationMs())
                .user(userDto)
                .build();
    }

    private void upgradePlainTextPasswordIfNeeded(User user, String rawPassword) {
        String stored = user.getPassword();
        if (stored == null || stored.isEmpty() || isBcryptHash(stored)) {
            return;
        }
        // Transparently migrate legacy plaintext rows in PostgreSQL on first successful match.
        if (stored.equals(rawPassword)) {
            user.setPassword(passwordEncoder.encode(rawPassword));
            userRepository.save(user);
        }
    }

    private static boolean isBcryptHash(String value) {
        return value.startsWith("$2a$") || value.startsWith("$2b$") || value.startsWith("$2y$");
    }
}
