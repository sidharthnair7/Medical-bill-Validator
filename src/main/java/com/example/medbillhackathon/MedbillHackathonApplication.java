package com.example.medbillhackathon;

import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.util.Base64;

@SpringBootApplication
public class MedbillHackathonApplication {

    public static void main(String[] args) {
        SpringApplication.run(MedbillHackathonApplication.class, args);
        String key = Base64.getEncoder().encodeToString(
                Keys.secretKeyFor(SignatureAlgorithm.HS256).getEncoded()
        );
        System.out.println("JWT_SECRET_KEY=" + key);
    }

}
