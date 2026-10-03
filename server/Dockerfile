# syntax=docker/dockerfile:1

# ---- Build stage: full JDK + Maven, thrown away after the build ----------------------
FROM eclipse-temurin:21-jdk AS build
WORKDIR /app

# Layer order is deliberate: things that rarely change come first so Docker can reuse
# their cached layers. Editing a Java class invalidates only the layers from "COPY src" down;
# the dependency download below stays cached as long as pom.xml is unchanged.
COPY mvnw pom.xml ./
COPY .mvn .mvn
RUN ./mvnw -B -q dependency:go-offline

COPY src src
# Tests run in CI (they need Docker for Testcontainers, which isn't available here).
RUN ./mvnw -B -q package -DskipTests

# Split the fat jar into layers (dependencies vs. our code) so the runtime image
# gets the same caching benefit.
RUN java -Djarmode=tools -jar target/*.jar extract --layers --launcher --destination extracted

# ---- Runtime stage: JRE only, no compiler, no Maven, no source ------------------------
FROM eclipse-temurin:21-jre
WORKDIR /app

# Don't run as root: if the app is ever compromised, the attacker isn't root in the container.
RUN useradd --system --uid 1001 spring
USER spring

COPY --from=build /app/extracted/dependencies/ ./
COPY --from=build /app/extracted/spring-boot-loader/ ./
COPY --from=build /app/extracted/snapshot-dependencies/ ./
COPY --from=build /app/extracted/application/ ./

EXPOSE 8080
# Size the heap from the container's memory limit, not the host machine's RAM.
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75"
ENTRYPOINT ["java", "org.springframework.boot.loader.launch.JarLauncher"]
