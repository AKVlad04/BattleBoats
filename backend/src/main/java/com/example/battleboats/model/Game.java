package com.example.battleboats.model;

import com.example.battleboats.controller.ShipController;
import java.util.ArrayList;
import java.util.List;

public class Game {
    private String id;
    private String player1Id;
    private String player2Id;

    // Navele fiecărui jucător
    private List<ShipController.ShipPlacement> player1Ships = new ArrayList<>();
    private List<ShipController.ShipPlacement> player2Ships = new ArrayList<>();

    // Unde a tras fiecare (indecșii celulelor)
    private List<Integer> shotsAtPlayer1 = new ArrayList<>();
    private List<Integer> shotsAtPlayer2 = new ArrayList<>();

    private String currentTurn; // Cine este la rând?
    private String status;      // "WAITING" sau "ACTIVE"

    public Game(String id, String player1Id) {
        this.id = id;
        this.player1Id = player1Id;
        this.status = "WAITING";
        this.currentTurn = player1Id; // Primul jucător începe
    }

    // --- Getters și Setters ---
    public String getId() { return id; }

    public String getPlayer1Id() { return player1Id; }

    public String getPlayer2Id() { return player2Id; }
    public void setPlayer2Id(String player2Id) { this.player2Id = player2Id; }

    public List<ShipController.ShipPlacement> getPlayer1Ships() { return player1Ships; }
    public void setPlayer1Ships(List<ShipController.ShipPlacement> ships) { this.player1Ships = ships; }

    public List<ShipController.ShipPlacement> getPlayer2Ships() { return player2Ships; }
    public void setPlayer2Ships(List<ShipController.ShipPlacement> ships) { this.player2Ships = ships; }

    public List<Integer> getShotsAtPlayer1() { return shotsAtPlayer1; }
    public List<Integer> getShotsAtPlayer2() { return shotsAtPlayer2; }

    public String getCurrentTurn() { return currentTurn; }
    public void setCurrentTurn(String currentTurn) { this.currentTurn = currentTurn; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}