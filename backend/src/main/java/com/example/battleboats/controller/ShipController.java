package com.example.battleboats.controller;

import com.example.battleboats.model.Loadout;
import com.example.battleboats.model.Ship;
import com.example.battleboats.reprository.LoadoutRepository;
import com.example.battleboats.reprository.ShipRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api") // Modificat pentru a acoperi si /ships si /setup
public class ShipController {

    @Autowired
    private ShipRepository shipRepository;

    @Autowired
    private LoadoutRepository loadoutRepository;

    // --- ENDPOINT-URI PENTRU NAVIGARE ȘI FLOTĂ (EXISTENTE) ---

    // 1. GET /api/ships: Returnează toate navele
    @GetMapping("/ships")
    public List<Ship> getAllShips() {
        return shipRepository.findAll();
    }

    // 2. POST /api/ships/loadout: Salvează flota aleasă (cele 4 nave)
    @PostMapping("/ships/loadout")
    public String saveLoadout(@RequestBody List<Long> selectedShipIds) {
        if (selectedShipIds.size() != 4) {
            return "ERROR: Trebuie selectate exact 4 nave.";
        }

        String idsAsString = selectedShipIds.stream()
                .map(Object::toString)
                .collect(Collectors.joining(","));

        Loadout loadout = loadoutRepository.findByUserId(1L);
        if (loadout == null) {
            loadout = new Loadout();
        }

        loadout.setShipIds(idsAsString);
        loadoutRepository.save(loadout);

        return "SUCCESS: Flota salvată.";
    }

    // 3. GET /api/ships/loadout: Returnează ID-urile navelor salvate
    @GetMapping("/ships/loadout")
    public List<Long> getSavedLoadout() {
        Loadout loadout = loadoutRepository.findByUserId(1L);
        if (loadout != null) {
            return loadout.getShipIdsList();
        }
        return Collections.emptyList();
    }

    // --- ENDPOINT NOU PENTRU ARENĂ (JOC) ---

    // Clasa ajutătoare pentru a primi datele JSON din game.js
    public static class ShipPlacement {
        public Long shipId;
        public boolean isHorizontal;
        public int startCellIndex;
    }

    // 4. POST /api/setup/place: Primește așezarea finală de pe tablă
    @PostMapping("/setup/place")
    public String saveBattleSetup(@RequestBody List<ShipPlacement> placements) {
        System.out.println("--- AM PRIMIT ARANJAMENTUL DE LUPTĂ ---");

        for (ShipPlacement p : placements) {
            System.out.println("Nava ID: " + p.shipId +
                    " | Start Index: " + p.startCellIndex +
                    " | Orizontal: " + p.isHorizontal);
        }

        // Aici ai putea salva pozițiile în baza de date pentru a începe jocul real.
        // Momentan returnăm succes pentru a valida că frontend-ul merge.
        return "Aranjament primit cu succes!";
    }
}