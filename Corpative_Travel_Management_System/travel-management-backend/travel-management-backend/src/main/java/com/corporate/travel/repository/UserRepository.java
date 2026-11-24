package com.corporate.travel.repository;

import com.corporate.travel.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;


import com.corporate.travel.enums.Role;
import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    List<User> findByRole(Role role);
}
