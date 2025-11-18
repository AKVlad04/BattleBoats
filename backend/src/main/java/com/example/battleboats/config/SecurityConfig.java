package com.example.battleboats.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(); // Acesta este algoritmul de criptare
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable()) // Dezactivăm protecția CSRF pentru simplitate (pentru API-uri)
                .cors(cors -> cors.configure(http)) // Spunem să folosească setările CORS din WebConfig
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/auth/**").permitAll() // Lăsăm liber accesul la Login/Register
                        .anyRequest().authenticated() // Restul paginilor vor necesita logare (pentru viitor)
                );

        return http.build();
    }
}