package com.example.battleboats.controller;

import com.example.battleboats.model.User;
import com.example.battleboats.model.UserSkins;
import com.example.battleboats.reprository.UserRepository;
import com.example.battleboats.reprository.UserSkinsRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/skins")
@CrossOrigin(origins = "*")
public class SkinsController {

    @Autowired
    private UserSkinsRepository userSkinsRepository;

    @Autowired
    private UserRepository userRepository;

    private static final Logger logger = LoggerFactory.getLogger(SkinsController.class);

    // Endpoint pentru a obține skin-urile unui user
    @GetMapping("/{userId}")
    public ResponseEntity<Map<Integer, String>> getUserSkins(@PathVariable Long userId) {
        String username = userRepository.findById(userId).map(User::getUsername).orElse("unknown");

        UserSkins skinsRow = userSkinsRepository.findByUserId(userId)
                .orElseGet(() -> userSkinsRepository.save(new UserSkins(userId, username)));

        // asiguram username corect (daca s-a schimbat)
        if (skinsRow.getUsername() == null || !skinsRow.getUsername().equals(username)) {
            skinsRow.setUsername(username);
            skinsRow = userSkinsRepository.save(skinsRow);
        }

        Map<Integer, String> skinMap = new HashMap<>();
        skinMap.put(1, skinsRow.getShip1Skin());
        skinMap.put(2, skinsRow.getShip2Skin());
        skinMap.put(3, skinsRow.getShip3Skin());
        skinMap.put(4, skinsRow.getShip4Skin());

        return ResponseEntity.ok(skinMap);
    }

    // Endpoint pentru a actualiza un skin
    @PutMapping("/{userId}/{shipType}")
    public ResponseEntity<String> updateSkin(
            @PathVariable Long userId,
            @PathVariable int shipType,
            @RequestBody Map<String, String> body) {

        String newSkinPath = body.get("skinPath");
        logger.info("Update skin: userId={}, shipType={}, newSkinPath={}", userId, shipType, newSkinPath);

        if (newSkinPath == null || newSkinPath.isBlank()) {
            return ResponseEntity.badRequest().body("skinPath lipseste");
        }

        if (shipType < 1 || shipType > 4) {
            return ResponseEntity.badRequest().body("shipType invalid");
        }

        String username = userRepository.findById(userId).map(User::getUsername).orElse("unknown");

        UserSkins skinsRow = userSkinsRepository.findByUserId(userId)
                .orElseGet(() -> new UserSkins(userId, username));

        skinsRow.setUsername(username);

        switch (shipType) {
            case 1 -> skinsRow.setShip1Skin(newSkinPath);
            case 2 -> skinsRow.setShip2Skin(newSkinPath);
            case 3 -> skinsRow.setShip3Skin(newSkinPath);
            case 4 -> skinsRow.setShip4Skin(newSkinPath);
        }

        userSkinsRepository.save(skinsRow);
        return ResponseEntity.ok("Skin actualizat!");
    }
}
