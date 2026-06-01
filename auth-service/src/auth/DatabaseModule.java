package auth;

import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

/**
 * Module 1 — Database Connection
 *
 * OOP Principles Applied:
 * - Encapsulation: connection URI and client state are private; access via getClient().
 * - Abstraction: callers depend on MongoClient interface, not creation details.
 * - Single Responsibility: owns persistence connectivity and the User entity model.
 *
 * Design Pattern: Singleton (GoF Creational)
 *
 * Reason: MongoDB connections are expensive to create. A single shared client
 * prevents resource waste and connection-pool duplication across the auth service.
 * Double-checked locking guarantees thread-safe lazy initialization at startup.
 */
@Component
public class DatabaseModule {

    private static volatile MongoClient mongoClient;
    private static final Object LOCK = new Object();

    private final String connectionUri;

    /**
     * What: Injects the MongoDB connection URI from Spring configuration.
     * Why: Keeps the URI out of code and allows environment-specific databases without recompilation.
     * How: Spring resolves {@code spring.data.mongodb.uri} and passes it to the singleton holder at startup.
     */
    public DatabaseModule(@Value("${spring.data.mongodb.uri}") String connectionUri) {
        this.connectionUri = connectionUri;
    }

    /**
     * What: Returns the shared {@link MongoClient} used for all database access in the auth service.
     * Why: A single client reuses connection pools and avoids the cost of opening multiple clients per request.
     * How: Double-checked locking lazily creates {@link MongoClients#create(String)} on first call, then reuses the static instance.
     */
    public MongoClient getClient() {
        if (mongoClient == null) {
            synchronized (LOCK) {
                if (mongoClient == null) {
                    mongoClient = MongoClients.create(connectionUri);
                }
            }
        }
        return mongoClient;
    }
}

/**
 * What: MongoDB document model for a registered auth user (credentials, verification state, metadata).
 * Why: Centralizes persistence shape so repositories and modules share one typed entity instead of raw maps.
 * How: Spring Data maps fields to the {@code users} collection; getters/setters support repository save/load cycles.
 */
@Document(collection = "users")
class User {

    @Id
    private String id;
    private String email;
    private String passwordHash;
    private String name;
    private boolean verified;
    private String verificationToken;
    private String verificationOtp;
    private Instant verificationExpiresAt;
    private Map<String, String> metadata = new HashMap<>();
    private Instant createdAt;
    private Instant updatedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public boolean isVerified() { return verified; }
    public void setVerified(boolean verified) { this.verified = verified; }
    public String getVerificationToken() { return verificationToken; }
    public void setVerificationToken(String verificationToken) { this.verificationToken = verificationToken; }
    public String getVerificationOtp() { return verificationOtp; }
    public void setVerificationOtp(String verificationOtp) { this.verificationOtp = verificationOtp; }
    public Instant getVerificationExpiresAt() { return verificationExpiresAt; }
    public void setVerificationExpiresAt(Instant verificationExpiresAt) { this.verificationExpiresAt = verificationExpiresAt; }
    public Map<String, String> getMetadata() { return metadata; }
    public void setMetadata(Map<String, String> metadata) { this.metadata = metadata; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}

/**
 * What: Spring Data repository for {@link User} CRUD and auth-specific lookups.
 * Why: Declarative queries keep persistence out of business modules (registration, verification, login).
 * How: Extends {@link MongoRepository}; derived method names map to MongoDB queries on email and verification token.
 */
interface UserRepository extends MongoRepository<User, String> {
    Optional<User> findByEmail(String email);
    Optional<User> findByVerificationToken(String token);
    boolean existsByEmail(String email);
}
