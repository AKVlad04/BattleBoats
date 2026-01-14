-- Creates table: user_skins
-- Matches com.example.battleboats.model.UserSkins

CREATE TABLE IF NOT EXISTS user_skins (
    id BIGINT NOT NULL AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    username VARCHAR(255) NOT NULL,
    ship1_skin VARCHAR(255) NOT NULL,
    ship2_skin VARCHAR(255) NOT NULL,
    ship3_skin VARCHAR(255) NOT NULL,
    ship4_skin VARCHAR(255) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_user_skins_user_id (user_id),
    CONSTRAINT fk_user_skins_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

