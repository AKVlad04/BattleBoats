-- DEV reset: drops user_skins so Hibernate can recreate it with the new schema
-- Make sure you are connected to the correct DB (battleboats)

DROP TABLE IF EXISTS user_skins;

