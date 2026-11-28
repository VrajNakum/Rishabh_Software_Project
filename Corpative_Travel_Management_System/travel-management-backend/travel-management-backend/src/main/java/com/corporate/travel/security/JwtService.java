package com.corporate.travel.security;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Issues and verifies HMAC-SHA256 JSON Web Tokens without external JWT library dependencies.
 */
@Service
public class JwtService {

    private static final String HMAC_ALGORITHM = "HmacSHA256";
    private static final String HEADER_JSON = "{\"alg\":\"HS256\",\"typ\":\"JWT\"}";
    private static final Pattern STRING_CLAIM = Pattern.compile("\"([^\"]+)\"\\s*:\\s*\"((?:\\\\.|[^\"])*)\"");
    private static final Pattern NUMBER_CLAIM = Pattern.compile("\"([^\"]+)\"\\s*:\\s*(-?\\d+)");

    private final byte[] signingKey;
    private final long expirationMs;

    public JwtService(
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.expiration-ms:86400000}") long expirationMs) {
        if (secret == null || secret.trim().length() < 32) {
            throw new IllegalStateException("app.jwt.secret (JWT_SECRET) must be at least 32 characters long.");
        }
        this.signingKey = secret.trim().getBytes(StandardCharsets.UTF_8);
        this.expirationMs = expirationMs;
    }

    public long getExpirationMs() {
        return expirationMs;
    }

    public String generateToken(UserPrincipal principal) {
        long nowSeconds = Instant.now().getEpochSecond();
        long expSeconds = nowSeconds + Math.max(1L, expirationMs / 1000L);

        String headerPart = base64UrlEncode(HEADER_JSON.getBytes(StandardCharsets.UTF_8));
        String payloadJson = String.format(
                "{\"sub\":\"%s\",\"userId\":%d,\"role\":\"%s\",\"iat\":%d,\"exp\":%d}",
                escapeJson(principal.getUsername()),
                principal.getId(),
                escapeJson(principal.getRole().name()),
                nowSeconds,
                expSeconds
        );
        String payloadPart = base64UrlEncode(payloadJson.getBytes(StandardCharsets.UTF_8));
        String signingInput = headerPart + "." + payloadPart;
        String signaturePart = base64UrlEncode(sign(signingInput));
        return signingInput + "." + signaturePart;
    }

    public String extractUsername(String token) {
        Map<String, String> claims = parseAndValidateClaims(token);
        return claims != null ? claims.get("sub") : null;
    }

    public boolean isTokenValid(String token, UserPrincipal principal) {
        Map<String, String> claims = parseAndValidateClaims(token);
        if (claims == null) {
            return false;
        }
        String subject = claims.get("sub");
        return subject != null && subject.equalsIgnoreCase(principal.getUsername());
    }

    private Map<String, String> parseAndValidateClaims(String token) {
        if (token == null || token.trim().isEmpty()) {
            return null;
        }
        String[] parts = token.split("\\.");
        if (parts.length != 3) {
            return null;
        }

        String signingInput = parts[0] + "." + parts[1];
        byte[] expectedSig = sign(signingInput);
        byte[] actualSig;
        try {
            actualSig = Base64.getUrlDecoder().decode(parts[2]);
        } catch (IllegalArgumentException ex) {
            return null;
        }

        if (!MessageDigest.isEqual(expectedSig, actualSig)) {
            return null;
        }

        String payloadJson = new String(Base64.getUrlDecoder().decode(parts[1]), StandardCharsets.UTF_8);
        Map<String, String> claims = parseFlatJson(payloadJson);

        String expStr = claims.get("exp");
        if (expStr == null) {
            return null;
        }
        try {
            long expSeconds = Long.parseLong(expStr);
            if (Instant.now().getEpochSecond() >= expSeconds) {
                return null;
            }
        } catch (NumberFormatException ex) {
            return null;
        }

        return claims;
    }

    private byte[] sign(String input) {
        try {
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            mac.init(new SecretKeySpec(signingKey, HMAC_ALGORITHM));
            return mac.doFinal(input.getBytes(StandardCharsets.UTF_8));
        } catch (Exception ex) {
            throw new IllegalStateException("Unable to compute JWT HMAC signature.", ex);
        }
    }

    private static String base64UrlEncode(byte[] bytes) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static String escapeJson(String value) {
        if (value == null) {
            return "";
        }
        return value.replace("\\", "\\\\").replace("\"", "\\\"");
    }

    private static Map<String, String> parseFlatJson(String json) {
        Map<String, String> result = new HashMap<>();
        Matcher stringMatcher = STRING_CLAIM.matcher(json);
        while (stringMatcher.find()) {
            result.put(stringMatcher.group(1), stringMatcher.group(2).replace("\\\"", "\"").replace("\\\\", "\\"));
        }
        Matcher numberMatcher = NUMBER_CLAIM.matcher(json);
        while (numberMatcher.find()) {
            result.putIfAbsent(numberMatcher.group(1), numberMatcher.group(2));
        }
        return result;
    }
}
