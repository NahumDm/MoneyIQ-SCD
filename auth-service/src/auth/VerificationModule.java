package auth;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

/**
 * Module 3 — Verification
 *
 * OOP Principles Applied:
 * - Abstraction: VerificationStrategy interface hides OTP vs link implementation details.
 * - Polymorphism: OtpVerificationStrategy and LinkVerificationStrategy are interchangeable.
 * - Encapsulation: strategy selection and verification state changes are internal.
 * - Open/Closed: new verification algorithms added by implementing VerificationStrategy.
 *
 * Design Pattern: Strategy (GoF Behavioral)
 *
 * Reason: Email verification supports multiple algorithms (OTP code vs clickable link).
 * Strategy lets the module switch behavior at runtime via configuration without
 * modifying VerificationModule or its callers.
 */
@Service
public class VerificationModule {

    private final VerificationStrategy strategy;
    private final UserRepository userRepository;

    public VerificationModule(
            @Value("${verification.strategy:otp}") String strategyName,
            OtpVerificationStrategy otpStrategy,
            LinkVerificationStrategy linkStrategy,
            UserRepository userRepository) {
        this.strategy = "link".equalsIgnoreCase(strategyName) ? linkStrategy : otpStrategy;
        this.userRepository = userRepository;
    }

    /**
     * What: Dispatches verification delivery (OTP email or magic link) for the given user.
     * Why: Callers should not depend on OTP vs link implementation.
     * How: Delegates to the configured {@link VerificationStrategy#sendVerification(User)}.
     */
    public void sendVerification(User user) {
        strategy.sendVerification(user);
    }

    /**
     * What: Confirms a user's email using the code or token they received (OTP flow).
     * Why: Primary API for form-based verification after registration.
     * How: Loads user by email, runs strategy {@link VerificationStrategy#verify}, then clears verification fields and marks verified.
     */
    public User verifyByEmail(String email, String codeOrToken) {
        User user = userRepository.findByEmail(email.trim().toLowerCase())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (!strategy.verify(user, codeOrToken)) {
            throw new IllegalArgumentException("Invalid or expired verification code");
        }

        return markVerified(user);
    }

    /**
     * What: Confirms a user who clicked a verification link containing the token.
     * Why: Link strategy stores token on the user document and is looked up by token, not email.
     * How: Finds user by verification token, validates via strategy, then persists verified state.
     */
    public User verifyByToken(String token) {
        User user = userRepository.findByVerificationToken(token)
                .orElseThrow(() -> new IllegalArgumentException("Invalid verification token"));

        if (!strategy.verify(user, token)) {
            throw new IllegalArgumentException("Invalid or expired verification token");
        }

        return markVerified(user);
    }

    private User markVerified(User user) {
        user.setVerified(true);
        user.setVerificationOtp(null);
        user.setVerificationToken(null);
        user.setVerificationExpiresAt(null);
        user.setUpdatedAt(Instant.now());
        return userRepository.save(user);
    }
}

/**
 * What: Pluggable algorithm for sending and checking email verification.
 * Why: OTP and magic-link flows differ in storage, expiry, and email content but share the same module API.
 * How: Implementations set fields on {@link User} in {@code sendVerification}; {@code verify} compares input to stored value and expiry.
 */
interface VerificationStrategy {
    void sendVerification(User user);
    boolean verify(User user, String codeOrToken);
}

@Component
class OtpVerificationStrategy implements VerificationStrategy {

    private final JavaMailSender mailSender;
    private final String fromAddress;
    private final SecureRandom random = new SecureRandom();

    OtpVerificationStrategy(
            JavaMailSender mailSender,
            @Value("${spring.mail.username:}") String fromAddress) {
        this.mailSender = mailSender;
        this.fromAddress = fromAddress;
    }

    /**
     * What: Generates a six-digit OTP, stores it with a 15-minute expiry, and emails the user.
     * Why: OTP is a common passwordless verification path when links are undesirable.
     * How: Writes OTP and expiry on user; sends {@link SimpleMailMessage} or logs OTP in dev when mail is unconfigured.
     */
    @Override
    public void sendVerification(User user) {
        String otp = String.format("%06d", random.nextInt(1_000_000));
        user.setVerificationOtp(otp);
        user.setVerificationExpiresAt(Instant.now().plus(15, ChronoUnit.MINUTES));

        if (fromAddress != null && !fromAddress.isBlank()) {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromAddress);
            message.setTo(user.getEmail());
            message.setSubject("Verify your MoneyIQ account");
            message.setText(
                    "Your verification code is: " + otp + "\n\n"
                            + "It expires in 15 minutes.\n\n"
                            + "If you did not create an account, ignore this email.");
            try {
                mailSender.send(message);
                System.out.println("[MAIL] OTP sent to " + user.getEmail());
            } catch (MailException ex) {
                System.err.println("[MAIL] Send failed (" + ex.getMessage() + ")");
                System.out.println("[DEV] Verification OTP for " + user.getEmail() + ": " + otp);
            }
        } else {
            System.out.println("[DEV] Verification OTP for " + user.getEmail() + ": " + otp);
        }
    }

    /**
     * What: Checks whether the submitted code matches the stored OTP and is still valid.
     * Why: Prevents reuse of expired or missing codes without throwing until the module layer decides.
     * How: Returns false if OTP/expiry absent or past expiry; otherwise constant-time equality on OTP string.
     */
    @Override
    public boolean verify(User user, String codeOrToken) {
        if (user.getVerificationOtp() == null || user.getVerificationExpiresAt() == null) {
            return false;
        }
        if (Instant.now().isAfter(user.getVerificationExpiresAt())) {
            return false;
        }
        return user.getVerificationOtp().equals(codeOrToken);
    }
}

@Component
class LinkVerificationStrategy implements VerificationStrategy {

    private final JavaMailSender mailSender;
    private final String fromAddress;
    private final String baseUrl;

    LinkVerificationStrategy(
            JavaMailSender mailSender,
            @Value("${spring.mail.username:}") String fromAddress,
            @Value("${verification.base-url}") String baseUrl) {
        this.mailSender = mailSender;
        this.fromAddress = fromAddress;
        this.baseUrl = baseUrl;
    }

    /**
     * What: Issues a UUID verification token, stores 24-hour expiry, and emails a clickable link.
     * Why: One-click verification in the browser without typing a code.
     * How: Sets token and expiry on user; builds URL from {@code verification.base-url}; sends mail or logs link in dev.
     */
    @Override
    public void sendVerification(User user) {
        String token = UUID.randomUUID().toString();
        user.setVerificationToken(token);
        user.setVerificationExpiresAt(Instant.now().plus(24, ChronoUnit.HOURS));

        String link = baseUrl + "?token=" + token;

        if (fromAddress != null && !fromAddress.isBlank()) {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromAddress);
            message.setTo(user.getEmail());
            message.setSubject("Verify your account");
            message.setText("Click to verify your account:\n" + link);
            try {
                mailSender.send(message);
                System.out.println("[MAIL] Verification link sent to " + user.getEmail());
            } catch (MailException ex) {
                System.err.println("[MAIL] Send failed (" + ex.getMessage() + ")");
                System.out.println("[DEV] Verification link for " + user.getEmail() + ": " + link);
            }
        } else {
            System.out.println("[DEV] Verification link for " + user.getEmail() + ": " + link);
        }
    }

    /**
     * What: Validates the token from the verification link against the user record.
     * Why: Link flow matches on stored UUID token rather than OTP.
     * How: Returns false if token/expiry missing or expired; otherwise compares to {@link User#getVerificationToken()}.
     */
    @Override
    public boolean verify(User user, String codeOrToken) {
        if (user.getVerificationToken() == null || user.getVerificationExpiresAt() == null) {
            return false;
        }
        if (Instant.now().isAfter(user.getVerificationExpiresAt())) {
            return false;
        }
        return user.getVerificationToken().equals(codeOrToken);
    }
}
