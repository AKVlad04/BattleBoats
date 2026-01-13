package com.example.battleboats.controller;

import com.example.battleboats.model.LeaderboardEntry;
import com.example.battleboats.reprository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/leaderboard")
@CrossOrigin(origins = "*")
public class LeaderboardController {

    @Autowired
    private UserRepository userRepository;

    @GetMapping
    public List<LeaderboardEntry> getLeaderboard() {
        return userRepository.findTop10ByOrderByWinsDescGamesPlayedDescUsernameAsc().stream()
                .map(u -> new LeaderboardEntry(u.getUsername(), u.getGamesPlayed(), u.getWins()))
                .toList();
    }
}
