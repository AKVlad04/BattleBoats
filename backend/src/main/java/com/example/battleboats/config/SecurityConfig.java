package com.example.battleboats.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
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
        // API + frontend static fără session/cookies.
        // Lăsăm totul permis, dar păstrăm CORS activ ca browserul să accepte request-urile cross-origin când e cazul.
        http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(cors -> {})
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/", "/index.html", "/**/*.html", "/**/*.css", "/**/*.js", "/img/**", "/sounds/**").permitAll()
                        .requestMatchers("/api/**").permitAll()
                        .anyRequest().permitAll()
                );

        return http.build();
    }
}