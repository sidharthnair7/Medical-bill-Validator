package com.example.medbillhackathon.ai;

import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Component
public class WatsonX {

    @Value("${watsonx.api.url}")
    private String apiUrl;

    @Value("${watsonx.api.key}")
    private String apiKey;

    @Value("${watsonx.project.id}")
    private String projectId;

    @Getter
    @Value("${watsonx.model.id:ibm/granite-13b-instruct-v2}")
    private String modelId;

    private final RestTemplate restTemplate = new RestTemplate();

    private String cachedToken;
    private long tokenExpiresAt = 0;

    public String generate(String prompt, int maxNewTokens, double temperature) {
        String token = getAccessToken();
        return callGenerationEndpoint(prompt, maxNewTokens, temperature, token);
    }

    public String getAccessToken() {
        long now = System.currentTimeMillis();

        if (cachedToken != null && now < tokenExpiresAt - 300_000) {
            return cachedToken;
        }

        if (apiKey == null || apiKey.isBlank()) {
            throw new RuntimeException("WATSONX_API_KEY is missing or blank");
        }

        log.info("WatsonX API URL loaded: {}", apiUrl);
        log.info("WatsonX Project ID loaded: {}", projectId != null && !projectId.isBlank());
        log.info("WatsonX API key loaded: {}", apiKey != null && !apiKey.isBlank());
        log.info("Fetching new IBM IAM access token");

        String tokenUrl = "https://iam.cloud.ibm.com/identity/token";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
        headers.setAccept(List.of(MediaType.APPLICATION_JSON));

        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("grant_type", "urn:ibm:params:oauth:grant-type:apikey");
        body.add("apikey", apiKey.trim());

        HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(tokenUrl, request, Map.class);

            if (response.getBody() == null || !response.getBody().containsKey("access_token")) {
                throw new RuntimeException("IBM IAM token exchange failed — no access_token returned");
            }

            cachedToken = (String) response.getBody().get("access_token");

            Object expiresIn = response.getBody().get("expires_in");
            long expirySeconds = expiresIn != null
                    ? Long.parseLong(expiresIn.toString())
                    : 3600L;

            tokenExpiresAt = now + (expirySeconds * 1000);

            log.info("IBM IAM token obtained, expires in {}s", expirySeconds);

            return cachedToken;

        } catch (HttpClientErrorException e) {
            log.error("IBM IAM token request failed. Status: {}, Body: {}",
                    e.getStatusCode(),
                    e.getResponseBodyAsString());
            throw e;
        }
    }

    private String callGenerationEndpoint(String prompt, int maxNewTokens, double temperature, String accessToken) {
        if (apiUrl == null || apiUrl.isBlank()) {
            throw new RuntimeException("watsonx.api.url is missing");
        }

        if (projectId == null || projectId.isBlank()) {
            throw new RuntimeException("WATSONX_PROJECT_ID is missing or blank");
        }

        String endpoint = apiUrl + "/ml/v1/text/generation?version=2023-05-29";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setAccept(List.of(MediaType.APPLICATION_JSON));
        headers.setBearerAuth(accessToken);

        Map<String, Object> params = new HashMap<>();
        params.put("max_new_tokens", maxNewTokens);
        params.put("min_new_tokens", 30);
        params.put("temperature", temperature);
        params.put("repetition_penalty", 1.1);
        params.put("stop_sequences", List.of("Human:", "---END---"));

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("model_id", modelId);
        requestBody.put("project_id", projectId);
        requestBody.put("input", prompt);
        requestBody.put("parameters", params);

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);

        log.info("Calling WatsonX endpoint: {}", endpoint);
        log.info("WatsonX model ID: {}", modelId);

        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(endpoint, request, Map.class);

            if (response.getBody() == null) {
                throw new RuntimeException("WatsonX returned an empty response");
            }

            List<Map<String, Object>> results =
                    (List<Map<String, Object>>) response.getBody().get("results");

            if (results == null || results.isEmpty()) {
                throw new RuntimeException("WatsonX response did not contain results");
            }

            String generated = (String) results.get(0).get("generated_text");

            log.info("WatsonX generated {} chars", generated != null ? generated.length() : 0);

            return generated != null ? generated.trim() : "";

        } catch (HttpClientErrorException e) {
            log.error("WatsonX generation request failed. Status: {}, Body: {}",
                    e.getStatusCode(),
                    e.getResponseBodyAsString());
            throw e;
        } catch (Exception e) {
            log.error("Failed to parse WatsonX response", e);
            throw new RuntimeException("Unexpected WatsonX response format: " + e.getMessage());
        }
    }
}