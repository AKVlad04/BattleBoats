package com.example.battleboats.controller;

import com.example.battleboats.model.Ship;
import com.example.battleboats.reprository.ShipRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.List;

@RestController
@RequestMapping("/api/ships")
public class ShipController {

    @Autowired
    private ShipRepository shipRepository;

    @GetMapping
    public List<Ship> getAllShips() {
        // Returneaza lista cu toate cele 10 nave catre frontend
        return shipRepository.findAll();
    }
}