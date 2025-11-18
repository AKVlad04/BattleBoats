package com.example.battleboats.service;

import com.example.battleboats.model.User;
import com.example.battleboats.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class UserService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder; // Injectăm unealta de criptare

    public User registerUser(String username, String password) {
        if (userRepository.findByUsername(username).isPresent()) {
            throw new RuntimeException("Username-ul este deja luat!");
        }

        User newUser = new User();
        newUser.setUsername(username);

        // AICI E SCHIMBAREA: Criptăm parola înainte de salvare
        newUser.setPassword(passwordEncoder.encode(password));

        return userRepository.save(newUser);
    }

    public User loginUser(String username, String password) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User negăsit!"));

        // AICI E SCHIMBAREA: Nu comparăm text cu text, ci verificăm hash-ul
        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new RuntimeException("Parolă greșită!");
        }
        return user;
    }
}