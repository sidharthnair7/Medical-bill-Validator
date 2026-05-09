package com.example.medbillhackathon.file;



import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class FileService {
    private final FileRepository repository;


    public List<FileDTO> findAll(UUID userId) {
        return repository.findByFileId(userId)
                .stream()
                .map(file -> new FileDTO(
                        file.getId(),
                        file.getFileName(),
                        file.getContent(),
                        file.getCreatedDate(),
                        file.getModifiedDate()
                ))
                .toList();
    }


    public FileDTO findFileByID(UUID id) {
        File file = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("File not found"));
        FileDTO fileDto =new FileDTO(
                file.getId(),
                file.getFileName(),
                file.getContent(),
                file.getCreatedDate(),
                file.getModifiedDate());
        System.out.println("Returning file content: " + fileDto.content());
        return fileDto;
    }

    //CREATE
    public void save(String fileName,UUID id) {
        File file = File.builder()
                .fileName(fileName)
                .id(id)
                .createdDate(LocalDateTime.now())
                .modifiedDate(LocalDateTime.now())
                .build();
        repository.save(file);
    }


    public void deleteFile(UUID fileId) {
        File file = repository.findById(fileId)
                .orElseThrow(() -> new RuntimeException("File not found"));
        repository.delete(file);
    }
}
