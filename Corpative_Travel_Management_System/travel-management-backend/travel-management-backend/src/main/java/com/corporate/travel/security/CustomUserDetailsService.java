package com.corporate.travel.security;

import com.corporate.travel.entity.User;
import com.corporate.travel.repository.UserRepository;
import java.util.List;
import java.util.Optional;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

/**
 * Loads UserPrincipal records for Spring Security authentication by email or
 * unambiguous local username prefix.
 */
@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    public CustomUserDetailsService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String identifier) throws UsernameNotFoundException {
        User user = resolveUserByIdentifier(identifier)
                .orElseThrow(() -> new UsernameNotFoundException("No user found matching '" + identifier + "'"));
        return new UserPrincipal(user);
    }

    public Optional<User> resolveUserByIdentifier(String identifier) {
        if (identifier == null || identifier.trim().isEmpty()) {
            return Optional.empty();
        }
        String clean = identifier.trim().toLowerCase();

        Optional<User> exactEmail = userRepository.findByEmail(clean);
        if (exactEmail.isPresent()) {
            return exactEmail;
        }

        List<User> allUsers = userRepository.findAll();
        return allUsers.stream()
                .filter(u -> u.getEmail() != null && (
                        u.getEmail().toLowerCase().equals(clean) ||
                        u.getEmail().toLowerCase().split("@")[0].equals(clean) ||
                        (u.getFullName() != null && u.getFullName().trim().toLowerCase().equals(clean))
                ))
                .findFirst();
    }
}
