package com.example.battleboats.controller;

import com.example.battleboats.model.Game;
import com.example.battleboats.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/game")
public class GameController {

    private static final int GRID_SIZE = 10;

    // Memorie temporară pentru jocuri (cheie = ID joc)
    private static final Map<String, Game> games = new ConcurrentHashMap<>();

    // ID-ul jocului care așteaptă un al doilea jucător
    private static String waitingGameId = null;

    @Autowired
    private UserService userService;

    private Set<Integer> calculateOccupiedCells(List<ShipController.ShipPlacement> ships) {
        Set<Integer> occupied = new HashSet<>();
        if (ships == null) return occupied;

        for (ShipController.ShipPlacement p : ships) {
            if (p == null) continue;

            int length;
            if (p.shipId == null) {
                length = 1;
            } else {
                long sid = p.shipId;
                if (sid >= 1 && sid <= 4) length = 1;
                else if (sid >= 5 && sid <= 7) length = 2;
                else if (sid >= 8 && sid <= 9) length = 3;
                else length = 4;
            }

            int start = p.startCellIndex;

            // Validări simple: start în bounds
            if (start < 0 || start >= GRID_SIZE * GRID_SIZE) continue;

            // Validare: nava orizontală să nu treacă pe rândul următor
            if (p.isHorizontal) {
                int startRow = start / GRID_SIZE;
                int endIndex = start + (length - 1);
                if (endIndex >= GRID_SIZE * GRID_SIZE) continue;
                int endRow = endIndex / GRID_SIZE;
                if (startRow != endRow) continue;
            } else {
                int endIndex = start + (length - 1) * GRID_SIZE;
                if (endIndex >= GRID_SIZE * GRID_SIZE) continue;
            }

            for (int i = 0; i < length; i++) {
                int idx = p.isHorizontal ? start + i : start + (i * GRID_SIZE);
                occupied.add(idx);
            }
        }

        return occupied;
    }

    // 1. Intră în joc (sau creează unul nou dacă nu există)
    @PostMapping("/join")
    public synchronized Map<String, String> joinGame(@RequestParam String userId, @RequestBody List<ShipController.ShipPlacement> ships) {
        Game game;

        // daca avem un waitingGameId dar jocul nu mai e valid (s-a terminat / nu exista), il resetam
        if (waitingGameId != null) {
            Game waitingGame = games.get(waitingGameId);
            if (waitingGame == null || !"WAITING".equals(waitingGame.getStatus()) || waitingGame.getPlayer2Id() != null) {
                waitingGameId = null;
            }
        }

        // Dacă e cineva în așteptare, intră peste el (devii Player 2)
        if (waitingGameId != null) {
            game = games.get(waitingGameId);
            // Evităm să joci singur cu tine însuți
            if (game.getPlayer1Id().equals(userId)) {
                return Map.of("gameId", game.getId(), "role", "PLAYER1");
            }
            game.setPlayer2Id(userId);
            game.setPlayer2Ships(ships);
            game.setPlayer2Occupied(calculateOccupiedCells(ships));
            game.setStatus("ACTIVE");
            waitingGameId = null; // Jocul a început!
        } else {
            // Nu e nimeni, creează joc nou (ești Player 1)
            String newGameId = UUID.randomUUID().toString();
            game = new Game(newGameId, userId);
            game.setPlayer1Ships(ships);
            game.setPlayer1Occupied(calculateOccupiedCells(ships));
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

        if (game == null) return Map.of("error", "Joc inexistent!");
        if (!"ACTIVE".equals(game.getStatus())) return Map.of("error", "Joc inactiv!");
        if (!userId.equals(game.getPlayer1Id()) && !userId.equals(game.getPlayer2Id())) return Map.of("error", "Jucător invalid!");

        // Guard: currentTurn poate fi null in unele cazuri (sau player2 lipseste)
        if (game.getCurrentTurn() == null) {
            // daca exista ambii jucatori, resetam la player1; altfel jocul e invalid
            if (game.getPlayer1Id() != null && game.getPlayer2Id() != null) {
                game.setCurrentTurn(game.getPlayer1Id());
            } else {
                return Map.of("error", "Joc invalid: adversar lipsă sau tură nedefinită.");
            }
        }

        if (!game.getCurrentTurn().equals(userId)) return Map.of("error", "Nu e rândul tău!");
        if (cellIndex < 0 || cellIndex >= GRID_SIZE * GRID_SIZE) return Map.of("error", "Celulă invalidă!");

        boolean shooterIsP1 = userId.equals(game.getPlayer1Id());

        // Listele/Set-urile exista dar le tratam defensiv
        List<Integer> targetShots = shooterIsP1 ? game.getShotsAtPlayer2() : game.getShotsAtPlayer1();
        List<Integer> targetHits = shooterIsP1 ? game.getHitsAtPlayer2() : game.getHitsAtPlayer1();
        Set<Integer> targetOccupied = shooterIsP1 ? game.getPlayer2Occupied() : game.getPlayer1Occupied();

        if (targetShots == null || targetHits == null || targetOccupied == null) {
            return Map.of("error", "Joc invalid: date lipsă pentru adversar.");
        }

        if (targetShots.contains(cellIndex)) return Map.of("error", "Ai mai tras aici!");

        targetShots.add(cellIndex);
        boolean hit = targetOccupied.contains(cellIndex);
        if (hit) {
            targetHits.add(cellIndex);
        } else {
            // miss => schimbam tura (doar daca exista adversar)
            String next = shooterIsP1 ? game.getPlayer2Id() : game.getPlayer1Id();
            if (next != null) {
                game.setCurrentTurn(next);
            }
        }

        // Win condition: toate celulele ocupate ale tintei au fost lovite
        boolean win = false;
        if (!targetOccupied.isEmpty()) {
            Set<Integer> hitSet = new HashSet<>(targetHits);
            win = hitSet.containsAll(targetOccupied);
        }
        if (win) {
            game.setStatus("FINISHED");
            game.setWinnerId(userId);

            // stats o singura data
            if (!game.isScoreAwarded()) {
                try {
                    Long winnerDbId = Long.parseLong(userId);

                    if (game.getPlayer1Id() != null) userService.recordGamePlayed(Long.parseLong(game.getPlayer1Id()));
                    if (game.getPlayer2Id() != null) userService.recordGamePlayed(Long.parseLong(game.getPlayer2Id()));

                    userService.recordWin(winnerDbId);

                    game.setScoreAwarded(true);
                } catch (Exception ignored) {
                }
            }
        }

        Map<String, Object> response = new HashMap<>();
        response.put("status", win ? "GAME_OVER" : "SHOT_FIRED");
        response.put("index", cellIndex);
        response.put("hit", hit);
        response.put("nextTurn", game.getCurrentTurn());
        response.put("gameStatus", game.getStatus());
        response.put("winnerId", game.getWinnerId()); // poate fi null pana la final
        return response;
    }

    @PostMapping("/leave")
    public synchronized Map<String, Object> leave(@RequestParam String gameId, @RequestParam String userId) {
        Game game = games.get(gameId);
        if (game == null) {
            if (Objects.equals(waitingGameId, gameId)) waitingGameId = null;
            return Map.of("ok", true, "message", "Game already removed");
        }

        // daca jocul era in asteptare, eliberam coada
        if (Objects.equals(waitingGameId, gameId)) {
            waitingGameId = null;
        }

        // stergem jocul complet (simplu pentru Play Again)
        games.remove(gameId);

        return Map.of("ok", true, "message", "Game removed", "removedGameId", gameId, "userId", userId);
    }

    @GetMapping("/debug")
    public Map<String, Object> debug() {
        Map<String, Object> out = new HashMap<>();
        out.put("waitingGameId", waitingGameId);
        out.put("gamesCount", games.size());
        if (waitingGameId != null) {
            Game g = games.get(waitingGameId);
            if (g != null) {
                out.put("waitingStatus", g.getStatus());
                out.put("waitingPlayer1", g.getPlayer1Id());
                out.put("waitingPlayer2", g.getPlayer2Id());
            }
        }
        return out;
    }
}