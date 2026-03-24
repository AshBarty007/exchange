FROM eclipse-temurin:11-jre
WORKDIR /app
COPY target/*.jar app.jar

# Extract accounts from JAR for filesystem access
RUN mkdir -p /app/accounts && \
    jar xf app.jar BOOT-INF/classes/accounts/ 2>/dev/null && \
    cp -r BOOT-INF/classes/accounts/* /app/accounts/ 2>/dev/null; \
    rm -rf BOOT-INF; exit 0

ENTRYPOINT ["java", "-jar", "app.jar", "--kx.fisco.test-wallet-dir=/app/accounts"]