# Etapa 1: Build (Compilare)
# Folosim o imagine care are Maven și Java instalat
FROM maven:3.9.6-eclipse-temurin-21 AS build

# Setam folderul de lucru
WORKDIR /app

# Copiem fisierul pom.xml si descarcam dependintele (pentru cache)
COPY pom.xml .
# Aceasta comanda descarca dependintele fara sa copieze tot codul sursa inca
RUN mvn dependency:go-offline -B

# Copiem codul sursa
COPY src ./src

# Compilam aplicatia si cream jar-ul (sarim testele pentru viteza la build)
RUN mvn clean package -DskipTests

# Etapa 2: Runtime (Rulare)
# Folosim o imagine mai mica, doar cu JRE (Java Runtime Environment)
FROM eclipse-temurin:21-jre

WORKDIR /app

# Copiem jar-ul generat in etapa anterioara (build)
# Folosim wildcard (*.jar) ca sa nu depindem de numele exact BattleBoats-1.0.jar
COPY --from=build /app/target/*.jar app.jar

# Comanda de start
ENTRYPOINT ["java", "-jar", "app.jar"]