package com.example.medbillhackathon.file;

import java.util.UUID;

public record CreateFileRequest(
        String fileName,
        UUID workspaceId
) {}