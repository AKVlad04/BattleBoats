package com.example.battleboats.controller;

import com.example.battleboats.model.User;
import com.example.battleboats.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth") // Toate linkurile vor începe cu /api/auth/...
@CrossOrigin(origins = "*") // IMPORTANT: Lasă frontend-ul (HTML) să se conecteze
public class AuthController {

    @Autowired
    private UserService userService;

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, String> payload) {
        try {
            // Extragem datele trimise din HTML (JSON)
            String username = payload.get("username");
            String password = payload.get("password");

            User registeredUser = userService.registerUser(username, password);
            return ResponseEntity.ok("User înregistrat cu succes: " + registeredUser.getId());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> payload) {
        try {
            String username = payload.get("username");
            String password = payload.get("password");

            User user = userService.loginUser(username, password);
            return ResponseEntity.ok("Login reușit! ID: " + user.getId());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/user/{username}")
    public ResponseEntity<?> getUserByUsername(@PathVariable String username) {
        try {
            User user = userService.findByUsername(username);
            return ResponseEntity.ok(user);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}