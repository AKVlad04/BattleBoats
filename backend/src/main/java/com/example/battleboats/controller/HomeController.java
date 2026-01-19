package com.example.battleboats.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * MVC entry point for the SPA/static frontend.
 *
 * We forward "/" to index.html which is served from classpath:/static.
 */
@Controller
public class HomeController {

    @GetMapping({"/", "/index"})
    public String index() {
        return "forward:/index.html";
    }
}

