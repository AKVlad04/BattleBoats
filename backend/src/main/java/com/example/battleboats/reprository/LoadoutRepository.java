package com.example.battleboats.reprository;

import com.example.battleboats.model.Loadout;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LoadoutRepository extends JpaRepository<Loadout, Long> {

    // Metoda pentru a găsi flota salvată a utilizatorului 1
    Loadout findByUserId(Long userId);
}