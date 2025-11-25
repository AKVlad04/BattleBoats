package com.example.battleboats.reprository;

import com.example.battleboats.model.Ship;
import org.springframework.data.jpa.repository.JpaRepository;

// ShipRepository extinde JpaRepository, care in Spring Boot 3+
// include automat ListCrudRepository.
// Primul parametru (Ship) este clasa entitate.
// Al doilea parametru (Long) este tipul cheii primare.
public interface ShipRepository extends JpaRepository<Ship, Long> {
    // Nu avem nevoie de metode speciale momentan, JpaRepository ofera CRUD
}