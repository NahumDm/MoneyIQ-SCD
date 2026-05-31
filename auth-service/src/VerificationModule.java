import org.springframework.beans.factory.annotation.Value;
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

    public void sendVerification(User user) {
        strategy.sendVerification(user);
    }

    public User verifyByEmail(String email, String codeOrToken) {
        User user = userRepository.findByEmail(email.trim().toLowerCase())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (!strategy.verify(user, codeOrToken)) {
            throw new IllegalArgumentException("Invalid or expired verification code");
        }

        return markVerified(user);
    }

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

    @Override
    public void sendVerification(User user) {
        String otp = String.format("%06d", random.nextInt(1_000_000));
        user.setVerificationOtp(otp);
        user.setVerificationExpiresAt(Instant.now().plus(15, ChronoUnit.MINUTES));

        if (fromAddress != null && !fromAddress.isBlank()) {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromAddress);
            message.setTo(user.getEmail());
            message.setSubject("Verify your account - OTP");
            message.setText("Your verification OTP is: " + otp + "\nIt expires in 15 minutes.");
            mailSender.send(message);
        } else {
            System.out.println("[DEV] Verification OTP for " + user.getEmail() + ": " + otp);
        }
    }

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
            mailSender.send(message);
        } else {
            System.out.println("[DEV] Verification link for " + user.getEmail() + ": " + link);
        }
    }

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
