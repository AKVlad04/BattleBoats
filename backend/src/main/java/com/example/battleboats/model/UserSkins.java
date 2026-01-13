package com.example.battleboats.model;

import jakarta.persistence.*;

@Entity
@Table(name = "user_skins")
public class UserSkins {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private Long userId;

    @Column(nullable = false)
    private String username; // numele contului (denormalizat)

    @Column(nullable = false)
    private String ship1Skin;

    @Column(nullable = false)
    private String ship2Skin;

    @Column(nullable = false)
    private String ship3Skin;

    @Column(nullable = false)
    private String ship4Skin;

    public UserSkins() {
        this.ship1Skin = "img/default.png";
        this.ship2Skin = "img/default.png";
        this.ship3Skin = "img/default.png";
        this.ship4Skin = "img/default.png";
    }

    public UserSkins(Long userId, String username) {
        this();
        this.userId = userId;
        this.username = username;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getShip1Skin() { return ship1Skin; }
    public void setShip1Skin(String ship1Skin) { this.ship1Skin = ship1Skin; }

    public String getShip2Skin() { return ship2Skin; }
    public void setShip2Skin(String ship2Skin) { this.ship2Skin = ship2Skin; }

    public String getShip3Skin() { return ship3Skin; }
    public void setShip3Skin(String ship3Skin) { this.ship3Skin = ship3Skin; }

    public String getShip4Skin() { return ship4Skin; }
    public void setShip4Skin(String ship4Skin) { this.ship4Skin = ship4Skin; }
}
