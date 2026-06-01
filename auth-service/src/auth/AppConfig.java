package auth;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * Spring configuration for cross-cutting auth beans.
 *
 * What: Registers shared infrastructure used by registration and login modules.
 * Why: Password hashing must be configured once and injected (dependency injection).
 * How: Spring creates a single BCryptPasswordEncoder bean for the application context.
 */
@Configuration
public class AppConfig {

    /**
     * What: Provides password hashing for register and login.
     * Why: Passwords must never be stored in plain text.
     * How: BCrypt is injected into RegistrationModule and CredentialValidationHandler.
     */
    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
