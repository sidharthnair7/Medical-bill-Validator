package com.example.medbillhackathon.ai;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;


@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiResponse {


    private String generatedText;
    private List<String> retrievedContextChunks;
    private String promptUsed;
    private boolean aiGenerated;
    private int promptLength;
    private String modelId;
}