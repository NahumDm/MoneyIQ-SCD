package auth;

import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

/**
 * Module 5 — Authentication Facade
 *
 * OOP Principles Applied:
 * - Abstraction: exposes a simple auth API hiding subsystem complexity.
 * - Encapsulation: internal module references are private final dependencies.
 * - Composition: aggregates RegistrationModule, VerificationModule, LoginModule.
 * - Dependency Inversion: depends on module abstractions wired by Spring container.
 *
 * Design Pattern: Facade (GoF Structural)
 *
 * Reason: Auth involves three subsystems (register, verify, login). Facade gives
 * controllers and external callers one unified interface, reducing coupling and
 * preventing direct dependency on every internal module.
 */
@Service
public class AuthenticationFacadeModule {

    private final RegistrationModule registrationModule;
    private final VerificationModule verificationModule;
    private final LoginModule loginModule;

    public AuthenticationFacadeModule(
            RegistrationModule registrationModule,
            VerificationModule verificationModule,
            LoginModule loginModule) {
        this.registrationModule = registrationModule;
        this.verificationModule = verificationModule;
        this.loginModule = loginModule;
    }

    public Map<String, Object> register(Map<String, String> fields) {
        User user = registrationModule.register(fields);
        Map<String, Object> response = new HashMap<>();
        response.put("id", user.getId());
        response.put("email", user.getEmail());
        response.put("name", user.getName());
        response.put("verified", user.isVerified());
        response.put("message", "Registration successful. Please verify your email.");
        return response;
    }

    public Map<String, Object> verifyEmail(String email, String code) {
        User user = verificationModule.verifyByEmail(email, code);
        Map<String, Object> response = new HashMap<>();
        response.put("id", user.getId());
        response.put("email", user.getEmail());
        response.put("verified", user.isVerified());
        response.put("message", "Email verified successfully.");
        return response;
    }

    public Map<String, Object> verifyByLink(String token) {
        User user = verificationModule.verifyByToken(token);
        Map<String, Object> response = new HashMap<>();
        response.put("id", user.getId());
        response.put("email", user.getEmail());
        response.put("verified", user.isVerified());
        response.put("message", "Email verified successfully via link.");
        return response;
    }

    public Map<String, Object> login(String email, String password) {
        return loginModule.login(email, password);
    }

    public Map<String, Object> validateToken(String token) {
        return loginModule.validateToken(token);
    }
}
