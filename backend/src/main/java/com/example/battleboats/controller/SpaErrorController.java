package com.example.battleboats.controller;

import jakarta.servlet.RequestDispatcher;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.boot.web.servlet.error.ErrorController;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

/**
 * Replaces the Whitelabel Error Page for common "not found" browser navigations.
 *
 * If the browser hits an unknown path (404), we forward to the SPA entry (index.html)
 * so the static frontend can handle routing.
 */
@Controller
public class SpaErrorController implements ErrorController {

    @RequestMapping("/error")
    public String handleError(HttpServletRequest request) {
        Object statusObj = request.getAttribute(RequestDispatcher.ERROR_STATUS_CODE);
        if (statusObj != null) {
            int status = Integer.parseInt(statusObj.toString());
            if (status == HttpStatus.NOT_FOUND.value()) {
                return "forward:/index.html";
            }
        }
        // For other errors, keep default behavior (could be a dedicated error page later)
        return "forward:/index.html";
    }
}

