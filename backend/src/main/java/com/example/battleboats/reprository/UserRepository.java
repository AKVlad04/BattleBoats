package com.example.battleboats.reprository;

import com.example.battleboats.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    // Aici Spring va crea automat codul SQL pentru a găsi un user după nume
    Optional<User> findByUsername(String username);
}