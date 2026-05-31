import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
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
@SpringBootApplication
@RestController
@RestControllerAdvice
public class Main {

    private final AuthenticationFacadeModule authFacade;

    public Main(AuthenticationFacadeModule authFacade) {
        this.authFacade = authFacade;
    }

    public static void main(String[] args) {
        SpringApplication.run(Main.class, args);
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(Map.of("status", "ok", "service", "auth-service"));
    }

    @PostMapping("/api/auth/register")
    public ResponseEntity<Map<String, Object>> register(@RequestBody Map<String, String> body) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authFacade.register(body));
    }

    @PostMapping("/api/auth/verify")
    public ResponseEntity<Map<String, Object>> verify(@RequestBody Map<String, String> body) {
        return ResponseEntity.ok(authFacade.verifyEmail(body.get("email"), body.get("code")));
    }

    @GetMapping("/api/auth/verify/link")
    public ResponseEntity<Map<String, Object>> verifyLink(@RequestParam("token") String token) {
        return ResponseEntity.ok(authFacade.verifyByLink(token));
    }

    @PostMapping("/api/auth/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody Map<String, String> body) {
        return ResponseEntity.ok(authFacade.login(body.get("email"), body.get("password")));
    }

    @GetMapping("/api/auth/validate")
    public ResponseEntity<Map<String, Object>> validate(
            @RequestHeader("Authorization") String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            throw new IllegalArgumentException("Bearer token required");
        }
        String token = authorization.substring(7);
        return ResponseEntity.ok(authFacade.validateToken(token));
    }

    @ExceptionHandler({IllegalArgumentException.class, IllegalStateException.class})
    public ResponseEntity<Map<String, String>> handleBadRequest(RuntimeException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", ex.getMessage()));
    }
}
