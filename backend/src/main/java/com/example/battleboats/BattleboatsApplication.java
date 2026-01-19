package com.example.battleboats;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class BattleboatsApplication {

    public static void main(String[] args) {
        SpringApplication.run(BattleboatsApplication.class, args);
        System.out.println("BattleBoats backend started. Opt:" +
                "en http://<this-pc-ip>:8081/ (or http://localhost:8081 on this PC)");
    }
}