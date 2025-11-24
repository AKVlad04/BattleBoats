package com.example.battleboats.model;

import jakarta.persistence.*;

@Entity
@Table(name = "ships")
public class Ship {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;        // Ex: "Distrugator", "Submarin"
    private int size;           // Câte pătrățele ocupă (ex: 2, 3, 4)
    private String imageUrl;    // Link către poza de pe net

    // --- Constructor gol (obligatoriu pentru Hibernate) ---
    public Ship() {
    }

    // --- Constructor cu date (ca sa le cream usor) ---
    public Ship(String name, int size, String imageUrl) {
        this.name = name;
        this.size = size;
        this.imageUrl = imageUrl;
    }

    // --- Getters (ca sa putem trimite datele la Frontend) ---
    public Long getId() { return id; }
    public String getName() { return name; }
    public int getSize() { return size; }
    public String getImageUrl() { return imageUrl; }
}