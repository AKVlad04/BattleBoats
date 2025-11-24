package com.example.battleboats.reprository; // Atentie la numele pachetului tau

import com.example.battleboats.model.Ship;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ShipRepository extends JpaRepository<Ship, Long> {
    // Nu avem nevoie de metode speciale momentan, findAll() e suficient
}