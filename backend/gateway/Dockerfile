FROM eclipse-temurin:25-jdk AS build
WORKDIR /app
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN chmod +x mvnw && ./mvnw dependency:go-offline -B || true
COPY src ./src
RUN if [ ! -f src/main/resources/keystore.p12 ]; then \
      keytool -genkeypair -alias buy01 -keyalg RSA -keysize 2048 -storetype PKCS12 \
        -keystore src/main/resources/keystore.p12 \
        -validity 3650 -storepass buy01secret \
        -dname "CN=buy01, OU=Development, O=Buy01, L=City, ST=State, C=US" \
        -ext "SAN=dns:localhost,dns:gateway,ip:127.0.0.1"; \
    fi
RUN ./mvnw clean package -DskipTests -B

FROM eclipse-temurin:25-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080 8443
ENTRYPOINT ["java", "-jar", "app.jar"]
