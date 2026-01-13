package com.example.battleboats.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.Arrays;
import java.util.List;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Bean
    public CorsFilter corsFilter() {
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        CorsConfiguration config = new CorsConfiguration();

        // Permite cereri de la orice sursa (inclusiv fișierele de pe Desktop)
        config.setAllowedOriginPatterns(List.of("*"));

        // Permite cookie-uri și autentificare
        // Pentru acest proiect folosim auth in localStorage, nu cookies, deci nu avem nevoie de credentials.
        config.setAllowCredentials(false);

        // Permite orice tip de header și metodă (GET, POST, etc.)
        config.setAllowedHeaders(Arrays.asList("Origin", "Content-Type", "Accept", "Authorization"));
        config.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));

        source.registerCorsConfiguration("/**", config);
        return new CorsFilter(source);
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // Serveste imaginile din folderul de la radacina proiectului: <repo>/img
        registry.addResourceHandler("/img/**")
                .addResourceLocations("file:./img/");
    }
}