package com.example.medbillhackathon.file;

import java.time.LocalDateTime;
import java.util.UUID;

public record FileDTO(UUID id,
                      String fileName,
                      String content,
                      LocalDateTime createdDate,
                      LocalDateTime modifiedDate) {

}
