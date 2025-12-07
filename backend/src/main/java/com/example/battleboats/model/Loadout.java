package com.example.battleboats.model;

import jakarta.persistence.*;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Entity
@Table(name = "loadouts")
public class Loadout {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String shipIds;

    // Simplificăm: salvăm pentru un utilizator implicit (ID 1)
    private Long userId = 1L;

    public Loadout() {}

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getShipIds() { return shipIds; }
    public void setShipIds(String shipIds) { this.shipIds = shipIds; }

    public Long getUserId() { return userId; }
    // Setter-ul nu este necesar dacă userId e fix, dar e bine să îl avem:
    public void setUserId(Long userId) { this.userId = userId; }

    // Metodă utilitară pentru a obține ID-urile ca listă (necesară la incarcare)
    public List<Long> getShipIdsList() {
        if (this.shipIds == null || this.shipIds.isEmpty()) return List.of();
        return Arrays.stream(this.shipIds.split(","))
                .map(Long::parseLong)
                .collect(Collectors.toList());
    }
}