package com.example.battleboats;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class BattleboatsApplication {

    public static void main(String[] args) {
        SpringApplication.run(BattleboatsApplication.class, args);
        System.out.println("BattleBoats backend started on http://localhost:8081");
    }
}