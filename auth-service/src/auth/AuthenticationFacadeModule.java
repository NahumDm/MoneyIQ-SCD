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

    /**
     * What: Registers a new user and returns a client-safe summary (no password hash).
     * Why: Controllers depend on one facade instead of registration + verification modules.
     * How: Delegates to {@link RegistrationModule#register} and maps id, email, name, verified flag, and message.
     */
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

    /**
     * What: Verifies a user's email with an OTP or code submitted with their email address.
     * Why: Unified HTTP response shape for verification endpoints.
     * How: Calls {@link VerificationModule#verifyByEmail} and returns id, email, verified, and success message.
     */
    public Map<String, Object> verifyEmail(String email, String code) {
        User user = verificationModule.verifyByEmail(email, code);
        Map<String, Object> response = new HashMap<>();
        response.put("id", user.getId());
        response.put("email", user.getEmail());
        response.put("verified", user.isVerified());
        response.put("message", "Email verified successfully.");
        return response;
    }

    /**
     * What: Completes verification when the user follows a magic link containing the token.
     * Why: Link strategy uses token lookup rather than email+code pairing.
     * How: Delegates to {@link VerificationModule#verifyByToken} and wraps result in a standard map.
     */
    public Map<String, Object> verifyByLink(String token) {
        User user = verificationModule.verifyByToken(token);
        Map<String, Object> response = new HashMap<>();
        response.put("id", user.getId());
        response.put("email", user.getEmail());
        response.put("verified", user.isVerified());
        response.put("message", "Email verified successfully via link.");
        return response;
    }

    /**
     * What: Authenticates the user and returns JWT plus profile (passthrough to login subsystem).
     * Why: Keeps token issuance behind the same facade as register/verify.
     * How: Forwards to {@link LoginModule#login}.
     */
    public Map<String, Object> login(String email, String password) {
        return loginModule.login(email, password);
    }

    /**
     * What: Validates a bearer token and returns claim-derived user identity.
     * Why: Auth validate endpoint and integration layer need a stable API.
     * How: Forwards to {@link LoginModule#validateToken}.
     */
    public Map<String, Object> validateToken(String token) {
        return loginModule.validateToken(token);
    }
}
