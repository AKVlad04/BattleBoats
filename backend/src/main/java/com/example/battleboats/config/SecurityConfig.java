package com.example.battleboats.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(Customizer.withDefaults())
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/ships/**").permitAll()
                        .requestMatchers("/api/setup/**").permitAll()
                        // LINIE NOUĂ: Permite multiplayer-ul
                        .requestMatchers("/api/game/**").permitAll()
                        .requestMatchers("/api/auth/**").permitAll()
                        .requestMatchers("/", "/index.html", "/alege-flota.html", "/game.html", "/battle.html", "/style.css", "/js/**", "/images/**").permitAll()
                        .anyRequest().authenticated()
                );

        return http.build();
    }
}