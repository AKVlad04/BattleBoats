package com.example.battleboats.model; // Asigură-te că numele pachetului e corect

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Entity // Spune Spring-ului că aceasta este o tabelă
@Table(name = "users") // Numele exact al tabelului din MariaDB
@Data // Lombok: generează automat Getters, Setters, toString, etc.
@NoArgsConstructor // Constructor gol obligatoriu pentru JPA
@AllArgsConstructor // Constructor cu toți parametrii
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String username;

    @Column(nullable = false)
    private String password;

    private int wins;
    private int losses;
}