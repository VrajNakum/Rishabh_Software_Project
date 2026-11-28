package com.corporate.travel.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.DriverManager;

@Configuration
@Slf4j
public class DatabaseConfig {

    @Value("${spring.datasource.url:jdbc:postgresql://localhost:5432/travel_management_db}")
    private String pgUrl;

    @Value("${spring.datasource.username:postgres}")
    private String pgUser;

    @Value("${spring.datasource.password:}")
    private String pgPassword;

    @Bean
    @Primary
    public DataSource dataSource() {
        if (pgUrl != null && pgUrl.startsWith("jdbc:h2:")) {
            log.info("Initializing H2 DataSource from configured JDBC URL.");
            HikariConfig h2Config = new HikariConfig();
            h2Config.setJdbcUrl(pgUrl);
            h2Config.setDriverClassName("org.h2.Driver");
            h2Config.setUsername(pgUser != null && !pgUser.isBlank() ? pgUser : "sa");
            h2Config.setPassword(pgPassword != null ? pgPassword : "");
            h2Config.setMaximumPoolSize(10);
            h2Config.setMinimumIdle(2);
            h2Config.setPoolName("HikariPool-H2");
            return new HikariDataSource(h2Config);
        }

        log.info("Checking PostgreSQL connectivity at {}", pgUrl);
        boolean pgAvailable = false;
        try {
            DriverManager.setLoginTimeout(2);
            try (Connection conn = DriverManager.getConnection(pgUrl, pgUser, pgPassword)) {
                if (conn != null && !conn.isClosed()) {
                    pgAvailable = true;
                    log.info("Connected to PostgreSQL database.");
                }
            }
        } catch (Exception e) {
            log.warn("PostgreSQL unreachable ({}). Falling back to embedded H2 in-memory database.", e.getMessage());
        }

        if (pgAvailable) {
            HikariConfig config = new HikariConfig();
            config.setJdbcUrl(pgUrl);
            config.setUsername(pgUser);
            config.setPassword(pgPassword);
            config.setDriverClassName("org.postgresql.Driver");
            config.setMaximumPoolSize(10);
            config.setMinimumIdle(2);
            config.setPoolName("HikariPool-PostgreSQL");
            return new HikariDataSource(config);
        } else {
            HikariConfig h2Config = new HikariConfig();
            h2Config.setJdbcUrl("jdbc:h2:mem:travel_management_db;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE;MODE=PostgreSQL");
            h2Config.setDriverClassName("org.h2.Driver");
            h2Config.setUsername("sa");
            h2Config.setPassword("");
            h2Config.setMaximumPoolSize(10);
            h2Config.setMinimumIdle(2);
            h2Config.setPoolName("HikariPool-H2-Fallback");
            log.info("Embedded H2 in-memory database initialized. Ready for all operations.");
            return new HikariDataSource(h2Config);
        }
    }
}

