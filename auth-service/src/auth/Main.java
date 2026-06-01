package auth;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration;
import org.springframework.data.mongodb.repository.config.EnableMongoRepositories;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Main Module — Auth Service entry point
 *
 * OOP Principles Applied:
 * - Encapsulation: HTTP concerns isolated here; business logic delegated to facade.
 * - Composition: holds AuthenticationFacadeModule as injected dependency.
 * - Single Responsibility: translates HTTP requests/responses only.
 *
 * Design Pattern: Adapter (GoF Structural)
 *
 * Reason: REST/HTTP is an external interface incompatible with the facade's domain
 * methods. Main adapts HTTP requests (JSON body, headers, status codes) into
 * facade calls and adapts facade responses back into HTTP responses.
 */
@SpringBootApplication(
    scanBasePackages = "auth",
    exclude = DataSourceAutoConfiguration.class
)
@EnableMongoRepositories(basePackageClasses = UserRepository.class)
@RestController
@RestControllerAdvice
public class Main {

    private final AuthenticationFacadeModule authFacade;

    public Main(AuthenticationFacadeModule authFacade) {
        this.authFacade = authFacade;
    }

    /**
     * What: Bootstraps Spring Boot and embedded Tomcat on port 8081.
     * Why: Standard Java entry point for the auth microservice.
     * How: Loads all @Component beans in package auth and exposes REST routes.
     */
    public static void main(String[] args) {
        SpringApplication.run(Main.class, args);
    }

    /**
     * What: Liveness probe for deployments and manual checks.
     * Why: Operators need to confirm the service is up without hitting MongoDB.
     * How: Returns JSON { status, service } with HTTP 200.
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(Map.of("status", "ok", "service", "auth-service"));
    }

    /**
     * What: HTTP adapter for user registration.
     * Why: External clients speak REST/JSON; facade speaks domain maps.
     * How: Adapts JSON body to Map, calls facade.register(), returns 201 + user summary.
     */
    @PostMapping("/api/auth/register")
    public ResponseEntity<Map<String, Object>> register(@RequestBody Map<String, String> body) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authFacade.register(body));
    }

    /**
     * What: HTTP adapter for OTP email verification.
     * Why: Completes registration when VERIFICATION_STRATEGY=otp.
     * How: Reads email + code from JSON, delegates to facade.verifyEmail().
     */
    @PostMapping("/api/auth/verify")
    public ResponseEntity<Map<String, Object>> verify(@RequestBody Map<String, String> body) {
        return ResponseEntity.ok(authFacade.verifyEmail(body.get("email"), body.get("code")));
    }

    /**
     * What: HTTP adapter for link-based email verification.
     * Why: Alternative Strategy when VERIFICATION_STRATEGY=link.
     * How: Reads token query param, delegates to facade.verifyByLink().
     */
    @GetMapping("/api/auth/verify/link")
    public ResponseEntity<Map<String, Object>> verifyLink(@RequestParam("token") String token) {
        return ResponseEntity.ok(authFacade.verifyByLink(token));
    }

    /**
     * What: HTTP adapter for login and JWT issuance.
     * Why: Clients need a token for protected expense routes on the gateway.
     * How: Adapts email/password JSON to facade.login() which runs the handler chain + JWT.
     */
    @PostMapping("/api/auth/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody Map<String, String> body) {
        return ResponseEntity.ok(authFacade.login(body.get("email"), body.get("password")));
    }

    /**
     * What: HTTP adapter for JWT validation (used by integration layer Proxy).
     * Why: Gateway must confirm token before proxying expense requests.
     * How: Strips Bearer prefix, calls facade.validateToken(), returns user id/email/name.
     */
    @GetMapping("/api/auth/validate")
    public ResponseEntity<Map<String, Object>> validate(
            @RequestHeader("Authorization") String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            throw new IllegalArgumentException("Bearer token required");
        }
        String token = authorization.substring(7);
        return ResponseEntity.ok(authFacade.validateToken(token));
    }

    /**
     * What: Maps domain exceptions to HTTP 400 JSON errors.
     * Why: Clients expect consistent { error: message } instead of stack traces.
     * How: Catches IllegalArgumentException / IllegalStateException from facade pipeline.
     */
    @ExceptionHandler({IllegalArgumentException.class, IllegalStateException.class})
    public ResponseEntity<Map<String, String>> handleBadRequest(RuntimeException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", ex.getMessage()));
    }
}
