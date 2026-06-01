package auth;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

/**
 * Module 2 — Registration
 *
 * OOP Principles Applied:
 * - Encapsulation: builder hides step-by-step user assembly from callers.
 * - Abstraction: register() accepts a flexible field map without exposing build steps.
 * - Composition: delegates verification to VerificationModule after object creation.
 * - Single Responsibility: owns user registration workflow only.
 *
 * Design Pattern: Builder (GoF Creational)
 *
 * Reason: User profiles have optional and dynamic fields (name, phone, metadata).
 * Builder avoids telescoping constructors and lets callers add fields incrementally
 * while enforcing required credentials before the User object is constructed.
 */
@Service
public class RegistrationModule {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final VerificationModule verificationModule;

    public RegistrationModule(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            VerificationModule verificationModule) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.verificationModule = verificationModule;
    }

    /**
     * What: Creates a new user from a flexible field map and triggers email verification.
     * Why: HTTP controllers can pass arbitrary registration fields without knowing builder steps or password hashing.
     * How: Validates email uniqueness, maps known keys through {@link UserRegistrationBuilder}, saves twice (before/after verification fields are set).
     */
    public User register(Map<String, String> fields) {
        String email = fields.getOrDefault("email", "").trim().toLowerCase();
        if (email.isBlank()) {
            throw new IllegalArgumentException("Email is required");
        }
        if (userRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("Email already registered");
        }

        UserRegistrationBuilder builder = new UserRegistrationBuilder()
                .withPasswordEncoder(passwordEncoder);

        fields.forEach((key, value) -> {
            switch (key.toLowerCase()) {
                case "email" -> builder.withEmail(value);
                case "password" -> builder.withPassword(value);
                case "name" -> builder.withName(value);
                default -> builder.withField(key, value);
            }
        });

        User user = builder.build();
        user = userRepository.save(user);
        verificationModule.sendVerification(user);
        return userRepository.save(user);
    }
}

/**
 * What: Step-by-step assembler for a {@link User} before first persistence.
 * Why: Registration has required fields (email, password) plus optional metadata without telescoping constructors.
 * How: Fluent {@code with*} methods accumulate state; {@link #build()} validates and produces an unverified user with timestamps.
 */
class UserRegistrationBuilder {

    private String email;
    private String rawPassword;
    private String name;
    private final Map<String, String> metadata = new HashMap<>();
    private PasswordEncoder passwordEncoder;

    /** What: Sets normalized email. Why: Required identity for login and verification. How: Stores trimmed value for {@link #build()}. */
    UserRegistrationBuilder withEmail(String email) {
        this.email = email;
        return this;
    }

    /** What: Sets plaintext password pending hash. Why: Hashing happens at build time via encoder. How: Retains raw password until {@link #build()}. */
    UserRegistrationBuilder withPassword(String rawPassword) {
        this.rawPassword = rawPassword;
        return this;
    }

    /** What: Sets display name. Why: Optional; defaults to local-part of email if omitted at build. How: Stores name for {@link #build()}. */
    UserRegistrationBuilder withName(String name) {
        this.name = name;
        return this;
    }

    /** What: Adds arbitrary metadata key/value. Why: Extensible profile without changing the User schema. How: Puts entry into internal metadata map. */
    UserRegistrationBuilder withField(String key, String value) {
        this.metadata.put(key, value);
        return this;
    }

    /** What: Supplies the encoder used to hash the password. Why: Build must not hard-code crypto. How: Injected by {@link RegistrationModule#register}. */
    UserRegistrationBuilder withPasswordEncoder(PasswordEncoder encoder) {
        this.passwordEncoder = encoder;
        return this;
    }

    /**
     * What: Materializes a new {@link User} with hashed password and default name if needed.
     * Why: Enforces required fields in one place before the entity is saved.
     * How: Throws if email/password/encoder missing; sets verified=false, copies metadata, stamps created/updated times.
     */
    User build() {
        if (email == null || email.isBlank()) {
            throw new IllegalStateException("Email is required");
        }
        if (rawPassword == null || rawPassword.isBlank()) {
            throw new IllegalStateException("Password is required");
        }
        if (passwordEncoder == null) {
            throw new IllegalStateException("PasswordEncoder is required");
        }

        User user = new User();
        user.setEmail(email.trim().toLowerCase());
        user.setPasswordHash(passwordEncoder.encode(rawPassword));
        user.setName(name != null ? name : email.split("@")[0]);
        user.setVerified(false);
        user.setMetadata(new HashMap<>(metadata));
        user.setCreatedAt(Instant.now());
        user.setUpdatedAt(Instant.now());
        return user;
    }
}
