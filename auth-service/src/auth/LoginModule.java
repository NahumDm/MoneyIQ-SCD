package auth;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

/**
 * Module 4 — Login
 *
 * OOP Principles Applied:
 * - Inheritance: concrete handlers extend abstract LoginHandler base class.
 * - Polymorphism: each handler overrides process() with its own validation logic.
 * - Encapsulation: handler chain wiring and JWT secrets are private to this module.
 * - Single Responsibility: each handler validates exactly one login concern.
 *
 * Design Pattern: Chain of Responsibility (GoF Behavioral)
 *
 * Reason: Login requires sequential checks (user exists, email verified, password valid).
 * Chain of Responsibility decouples each check into an independent handler so new
 * validation steps (e.g. account lockout) can be inserted without rewriting login logic.
 */
@Service
public class LoginModule {

    private final LoginHandler loginChain;
    private final String jwtSecret;
    private final long jwtExpirationMs;

    public LoginModule(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            @Value("${jwt.secret}") String jwtSecret,
            @Value("${jwt.expiration-ms}") long jwtExpirationMs) {
        UserExistenceHandler existence = new UserExistenceHandler(userRepository);
        EmailVerificationHandler verification = new EmailVerificationHandler();
        CredentialValidationHandler credentials = new CredentialValidationHandler(passwordEncoder);

        existence.setNext(verification).setNext(credentials);
        this.loginChain = existence;
        this.jwtSecret = jwtSecret;
        this.jwtExpirationMs = jwtExpirationMs;
    }

    public Map<String, Object> login(String email, String password) {
        LoginRequest request = new LoginRequest(email, password);
        User user = loginChain.handle(request);

        SecretKey key = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
        Date now = new Date();
        String token = Jwts.builder()
                .subject(user.getId())
                .claim("email", user.getEmail())
                .claim("name", user.getName())
                .issuedAt(now)
                .expiration(new Date(now.getTime() + jwtExpirationMs))
                .signWith(key)
                .compact();

        Map<String, Object> response = new HashMap<>();
        response.put("token", token);
        response.put("user", Map.of(
                "id", user.getId(),
                "email", user.getEmail(),
                "name", user.getName()
        ));
        return response;
    }

    public Map<String, Object> validateToken(String token) {
        try {
            SecretKey key = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
            Claims claims = Jwts.parser()
                    .verifyWith(key)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();

            Map<String, Object> user = new HashMap<>();
            user.put("id", claims.getSubject());
            user.put("email", claims.get("email"));
            user.put("name", claims.get("name"));
            return user;
        } catch (JwtException ex) {
            throw new IllegalArgumentException("Invalid or expired token");
        }
    }
}

abstract class LoginHandler {

    private LoginHandler next;

    LoginHandler setNext(LoginHandler next) {
        this.next = next;
        return next;
    }

    User handle(LoginRequest request) {
        User result = process(request);
        if (result != null) {
            return result;
        }
        if (next != null) {
            return next.handle(request);
        }
        throw new IllegalArgumentException("Login failed");
    }

    protected abstract User process(LoginRequest request);
}

class UserExistenceHandler extends LoginHandler {

    private final UserRepository userRepository;

    UserExistenceHandler(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    protected User process(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("Invalid email or password"));
        request.setUser(user);
        return null;
    }
}

class EmailVerificationHandler extends LoginHandler {

    @Override
    protected User process(LoginRequest request) {
        if (!request.getUser().isVerified()) {
            throw new IllegalArgumentException("Email not verified. Please verify your account first.");
        }
        return null;
    }
}

class CredentialValidationHandler extends LoginHandler {

    private final PasswordEncoder passwordEncoder;

    CredentialValidationHandler(PasswordEncoder passwordEncoder) {
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    protected User process(LoginRequest request) {
        User user = request.getUser();
        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new IllegalArgumentException("Invalid email or password");
        }
        return user;
    }
}

class LoginRequest {

    private final String email;
    private final String password;
    private User user;

    LoginRequest(String email, String password) {
        this.email = email.trim().toLowerCase();
        this.password = password;
    }

    String getEmail() { return email; }
    String getPassword() { return password; }
    User getUser() { return user; }
    void setUser(User user) { this.user = user; }
}
