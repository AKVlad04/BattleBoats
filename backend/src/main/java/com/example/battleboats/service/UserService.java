package com.example.battleboats.service;

import com.example.battleboats.model.User;
import com.example.battleboats.model.UserSkins;
// Asigură-te că numele pachetului 'reprository' e scris la fel ca folderul tău din stânga
import com.example.battleboats.reprository.UserRepository;
import com.example.battleboats.reprository.UserSkinsRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class UserService {

    @Autowired  // <--- ASTA LIPSEA! Acum Spring va conecta baza de date aici.
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private UserSkinsRepository userSkinsRepository;

    public User registerUser(String username, String password) {
        // Verificam daca userul exista deja
        if (userRepository.findByUsername(username).isPresent()) {
            throw new RuntimeException("Username-ul este deja luat!");
        }

        User newUser = new User();
        newUser.setUsername(username);
        // Criptam parola inainte de salvare
        newUser.setPassword(passwordEncoder.encode(password));

        User savedUser = userRepository.save(newUser);

        // Cream automat randul de skin-uri default pentru user
        createDefaultSkinsForUser(savedUser.getId(), savedUser.getUsername());

        return savedUser;
    }

    private void createDefaultSkinsForUser(Long userId, String username) {
        System.out.println("=== CREARE SKIN-URI DEFAULT PENTRU USER ID: " + userId + " ===");
        UserSkins skinsRow = new UserSkins(userId, username);
        UserSkins saved = userSkinsRepository.save(skinsRow);
        System.out.println("Salvat skins row: userId=" + saved.getUserId() + ", username=" + saved.getUsername());
        System.out.println("=== SKIN-URI DEFAULT CREATE CU SUCCES ===");
    }

    public User loginUser(String username, String password) {
        // Cautam userul
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User negăsit!"));

        // Verificam parola
        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new RuntimeException("Parolă greșită!");
        }
        return user;
    }

    public User findByUsername(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User negăsit!"));
    }


    public void recordGamePlayed(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User negăsit!"));
        user.setGamesPlayed(user.getGamesPlayed() + 1);
        userRepository.save(user);
    }

    public void recordWin(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User negăsit!"));
        user.setWins(user.getWins() + 1);
        userRepository.save(user);
    }
}