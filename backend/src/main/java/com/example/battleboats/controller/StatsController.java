package com.example.battleboats.controller;

import com.example.battleboats.model.User;
import com.example.battleboats.model.UserStats;
import com.example.battleboats.reprository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/stats")
@CrossOrigin(origins = "*")
public class StatsController {

    @Autowired
    private UserRepository userRepository;

    @GetMapping("/{userId}")
    public UserStats getStats(@PathVariable Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User negăsit!"));

        // losses pot fi calculate in frontend: gamesPlayed - wins
        return new UserStats(user.getGamesPlayed(), user.getWins());
    }
}
