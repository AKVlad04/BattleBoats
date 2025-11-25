package com.example.battleboats.service;

import com.example.battleboats.model.User;
// Asigură-te că numele pachetului 'reprository' e scris la fel ca folderul tău din stânga
import com.example.battleboats.reprository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class UserService {

    @Autowired  // <--- ASTA LIPSEA! Acum Spring va conecta baza de date aici.
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    public User registerUser(String username, String password) {
        // Verificam daca userul exista deja
        if (userRepository.findByUsername(username).isPresent()) {
            throw new RuntimeException("Username-ul este deja luat!");
        }

        User newUser = new User();
        newUser.setUsername(username);
        // Criptam parola inainte de salvare
        newUser.setPassword(passwordEncoder.encode(password));

        return userRepository.save(newUser);
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
}