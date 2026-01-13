package com.example.battleboats.reprository;

import com.example.battleboats.model.UserSkins;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserSkinsRepository extends JpaRepository<UserSkins, Long> {
    Optional<UserSkins> findByUserId(Long userId);
}
