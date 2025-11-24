package com.example.battleboats;

import com.example.battleboats.model.Ship;
import com.example.battleboats.reprository.ShipRepository; // Importa repository-ul tau
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

@SpringBootApplication
public class BattleboatsApplication {

    public static void main(String[] args) {
        SpringApplication.run(BattleboatsApplication.class, args);
    }

    // Aceasta functie ruleaza automat cand porneste serverul
    @Bean
    public CommandLineRunner demoShips(ShipRepository repository) {
        return (args) -> {
            // Verificam daca avem deja nave, ca sa nu le dublam la fiecare restart
            if (repository.count() == 0) {
                repository.save(new Ship("Patrula Mica", 2, "https://i.imgur.com/example1.png"));
                repository.save(new Ship("Submarin Atomic", 3, "https://i.imgur.com/example2.png"));
                repository.save(new Ship("Distrugator", 3, "https://i.imgur.com/example3.png"));
                repository.save(new Ship("Crucisator", 4, "https://i.imgur.com/example4.png"));
                repository.save(new Ship("Portavion", 5, "https://i.imgur.com/example5.png"));
                repository.save(new Ship("Corveta Rapida", 2, "https://i.imgur.com/example6.png"));
                repository.save(new Ship("Nava Spion", 3, "https://i.imgur.com/example7.png"));
                repository.save(new Ship("Biras", 4, "https://i.imgur.com/example8.png"));
                repository.save(new Ship("Nava Amiral", 5, "https://i.imgur.com/example9.png"));
                repository.save(new Ship("Barca de Asalt", 1, "https://i.imgur.com/example10.png"));

                System.out.println("--- AM INCARCAT CELE 10 NAVE IN BAZA DE DATE ---");
            }
        };
    }
}