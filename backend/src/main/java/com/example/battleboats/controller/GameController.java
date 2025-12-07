package com.example.battleboats.controller;

import com.example.battleboats.model.Game;
import org.springframework.web.bind.annotation.*;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/game")
public class GameController {

    // Memorie temporară pentru jocuri (cheie = ID joc)
    private static final Map<String, Game> games = new ConcurrentHashMap<>();

    // ID-ul jocului care așteaptă un al doilea jucător
    private static String waitingGameId = null;

    // 1. Intră în joc (sau creează unul nou dacă nu există)
    @PostMapping("/join")
    public Map<String, String> joinGame(@RequestParam String userId, @RequestBody List<ShipController.ShipPlacement> ships) {
        Game game;

        // Dacă e cineva în așteptare, intră peste el (devii Player 2)
        if (waitingGameId != null) {
            game = games.get(waitingGameId);
            // Evităm să joci singur cu tine însuți
            if (game.getPlayer1Id().equals(userId)) {
                return Map.of("gameId", game.getId(), "role", "PLAYER1");
            }
            game.setPlayer2Id(userId);
            game.setPlayer2Ships(ships);
            game.setStatus("ACTIVE");
            waitingGameId = null; // Jocul a început!
        } else {
            // Nu e nimeni, creează joc nou (ești Player 1)
            String newGameId = UUID.randomUUID().toString();
            game = new Game(newGameId, userId);
            game.setPlayer1Ships(ships);
            games.put(newGameId, game);
            waitingGameId = newGameId;
        }

        return Map.of("gameId", game.getId(), "role", game.getPlayer1Id().equals(userId) ? "PLAYER1" : "PLAYER2");
    }

    // 2. Verifică starea (E rândul meu? A intrat adversarul?)
    @GetMapping("/status")
    public Game getGameStatus(@RequestParam String gameId) {
        return games.get(gameId);
    }

    // 3. Trage într-o celulă
    @PostMapping("/fire")
    public Map<String, Object> fire(@RequestParam String gameId, @RequestParam String userId, @RequestParam int cellIndex) {
        Game game = games.get(gameId);

        if (game == null || !"ACTIVE".equals(game.getStatus())) return Map.of("error", "Joc inactiv!");
        if (!game.getCurrentTurn().equals(userId)) return Map.of("error", "Nu e rândul tău!");

        List<Integer> targetShots;

        // Schimbăm rândul și alegem ținta
        if (userId.equals(game.getPlayer1Id())) {
            targetShots = game.getShotsAtPlayer2();
            game.setCurrentTurn(game.getPlayer2Id());
        } else {
            targetShots = game.getShotsAtPlayer1();
            game.setCurrentTurn(game.getPlayer1Id());
        }

        if (targetShots.contains(cellIndex)) return Map.of("error", "Ai mai tras aici!");

        targetShots.add(cellIndex);
        return Map.of("status", "SHOT_FIRED", "index", cellIndex);
    }
}