package com.corporate.travel;

import com.corporate.travel.entity.Department;
import com.corporate.travel.entity.User;
import com.corporate.travel.enums.Role;
import com.corporate.travel.repository.DepartmentRepository;
import com.corporate.travel.repository.UserRepository;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@Transactional
class SecurityAuthIntegrationTests {

    private static final Pattern TOKEN_PATTERN = Pattern.compile("\"token\"\\s*:\\s*\"([^\"]+)\"");

    @Autowired
    private WebApplicationContext context;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private DepartmentRepository departmentRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .webAppContextSetup(context)
                .apply(SecurityMockMvcConfigurers.springSecurity())
                .build();
    }

    @Test
    void healthAndAuthEndpointsShouldAllowPublicAccessWhileApiRequiresJwt() throws Exception {
        mockMvc.perform(get("/api/health"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/users"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/travel-requests"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void shouldAuthenticateSeededUserWithJwtAndOmitPasswordFromResponse() throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"identifier\":\"vrajnakum@gmail.com\",\"password\":\"TestSeed@123\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.user.email").value("vrajnakum@gmail.com"))
                .andExpect(jsonPath("$.user.role").value("EMPLOYEE"))
                .andReturn();

        String body = result.getResponse().getContentAsString();
        assertFalse(body.contains("\"password\""), "Password hash must never be exposed in API responses");
        String token = extractToken(body);
        assertNotNull(token);

        mockMvc.perform(get("/api/auth/me")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("vrajnakum@gmail.com"));
    }

    @Test
    void shouldRejectInvalidCredentialsWith401() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"identifier\":\"vrajnakum@gmail.com\",\"password\":\"WrongPassword!\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void shouldUpgradeLegacyPlaintextPasswordToBcryptOnLogin() throws Exception {
        Department eng = departmentRepository.findByName("Engineering").orElseThrow();
        User legacy = userRepository.save(User.builder()
                .fullName("Legacy Plaintext")
                .email("legacy.plain@company.com")
                .password("LegacyPass@1")
                .role(Role.EMPLOYEE)
                .department(eng)
                .build());

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"identifier\":\"legacy.plain@company.com\",\"password\":\"LegacyPass@1\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty());

        User reloaded = userRepository.findById(legacy.getId()).orElseThrow();
        assertTrue(reloaded.getPassword().startsWith("$2"), "Plaintext password should upgrade to BCrypt");
        assertTrue(passwordEncoder.matches("LegacyPass@1", reloaded.getPassword()));
    }

    @Test
    void shouldEnforceRoleBasedAuthorizationAcrossEndpoints() throws Exception {
        String employeeToken = loginAndGetToken("vrajnakum@gmail.com", "TestSeed@123");
        String adminToken = loginAndGetToken("admin@gmail.com", "TestSeed@123");

        User employee = userRepository.findByEmail("vrajnakum@gmail.com").orElseThrow();

        // Employee can read travel requests
        mockMvc.perform(get("/api/travel-requests")
                        .header("Authorization", "Bearer " + employeeToken))
                .andExpect(status().isOk());

        // Employee cannot create users (ADMIN only)
        mockMvc.perform(post("/api/users")
                        .header("Authorization", "Bearer " + employeeToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"fullName\":\"Blocked User\",\"email\":\"blocked@company.com\",\"password\":\"Pass@123\",\"role\":\"EMPLOYEE\",\"departmentName\":\"Engineering\"}"))
                .andExpect(status().isForbidden());

        // Employee cannot escalate own role via PUT /api/users/{id}
        mockMvc.perform(put("/api/users/" + employee.getId())
                        .header("Authorization", "Bearer " + employeeToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"role\":\"ADMIN\"}"))
                .andExpect(status().isForbidden());

        // Admin can create users and password is stored encoded with BCrypt
        mockMvc.perform(post("/api/users")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"fullName\":\"Created Staff\",\"email\":\"created.staff@company.com\",\"password\":\"Staff@123\",\"role\":\"MANAGER\",\"departmentName\":\"Engineering\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.email").value("created.staff@company.com"))
                .andExpect(jsonPath("$.role").value("MANAGER"));

        User created = userRepository.findByEmail("created.staff@company.com").orElseThrow();
        assertTrue(passwordEncoder.matches("Staff@123", created.getPassword()));
    }

    @Test
    void shouldAllowPublicSelfRegistrationAsEmployeeOnly() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"fullName\":\"New Joiner\",\"email\":\"new.joiner@company.com\",\"password\":\"Join@123\",\"departmentName\":\"Sales\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.user.role").value("EMPLOYEE"));
    }

    private String loginAndGetToken(String identifier, String password) throws Exception {
        MvcResult res = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(String.format("{\"identifier\":\"%s\",\"password\":\"%s\"}", identifier, password)))
                .andExpect(status().isOk())
                .andReturn();
        return extractToken(res.getResponse().getContentAsString());
    }

    private String extractToken(String responseJson) {
        Matcher matcher = TOKEN_PATTERN.matcher(responseJson);
        assertTrue(matcher.find(), "Response should contain JWT token: " + responseJson);
        return matcher.group(1);
    }
}
