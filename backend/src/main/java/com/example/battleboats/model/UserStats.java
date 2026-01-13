package com.example.battleboats.model;

public class UserStats {
    private long gamesPlayed;
    private long wins;
    private long losses;
    private double winRate;

    public UserStats(long gamesPlayed, long wins) {
        this.gamesPlayed = gamesPlayed;
        this.wins = wins;
        this.losses = Math.max(0, gamesPlayed - wins);
        this.winRate = gamesPlayed == 0 ? 0.0 : (wins * 100.0) / gamesPlayed;
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
