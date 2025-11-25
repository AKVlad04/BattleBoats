package com.example.battleboats.service;

import com.example.battleboats.model.User;
// ATENȚIE: Importul trebuie să se potrivească cu numele folderului tău (reprository)
import com.example.battleboats.reprository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class UserService {

    @com.example.battleboats.service.Autowired
    // AICI ERA GREȘEALA: Nu scrie calea lungă, lasă doar numele clasei
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    public User registerUser(String username, String password) {
        if (userRepository.findByUsername(username).isPresent()) {
            throw new RuntimeException("Username-ul este deja luat!");
        }

        User newUser = new User();
        newUser.setUsername(username);
        newUser.setPassword(passwordEncoder.encode(password));

        return userRepository.save(newUser);
    }

    public User loginUser(String username, String password) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User negăsit!"));

        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new RuntimeException("Parolă greșită!");
        }
        return user;
    }
}