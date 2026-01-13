package com.example.battleboats.model;

public class LeaderboardEntry {
    private String username;
    private long gamesPlayed;
    private long wins;
    private long losses;
    private double winRate;

    public LeaderboardEntry(String username, int gamesPlayed, int wins) {
        this.username = username;
        this.gamesPlayed = gamesPlayed;
        this.wins = wins;
        this.losses = Math.max(0, (long) gamesPlayed - (long) wins);
        this.winRate = gamesPlayed == 0 ? 0.0 : (wins * 100.0) / gamesPlayed;
    }

    public String getUsername() {
        return username;
    }

    public long getGamesPlayed() {
        return gamesPlayed;
    }

    public long getWins() {
        return wins;
    }

    public long getLosses() {
        return losses;
    }

    public double getWinRate() {
        return winRate;
    }
}

