package com.buy01.media_service.controller;

import com.buy01.media_service.model.Media;
import com.buy01.media_service.repository.MediaRepository;
import com.buy01.media_service.service.CloudinaryStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.apache.tika.Tika;
import java.io.IOException;
import java.net.URI;
import java.util.Map;

@RestController
@RequestMapping("/media/images")
@RequiredArgsConstructor
public class MediaController {

    private static final long MAX_SIZE_BYTES = 2L * 1024 * 1024; // 2 MB
    private final Tika tika = new Tika();

    private final MediaRepository mediaRepository;
    private final CloudinaryStorageService cloudinaryStorageService;

    @PostMapping
    public ResponseEntity<?> upload(@RequestParam("file") MultipartFile file, Authentication auth) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "File is empty"));
        }

        try {
            String detectedMimeType = tika.detect(file.getInputStream());

            if (detectedMimeType == null || !detectedMimeType.startsWith("image/")) {
                return ResponseEntity.badRequest().body(Map.of("error", "Invalid file content. Real detected type: " + detectedMimeType));
            }
        } catch (IOException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Could not read uploaded file stream"));
        }

        String originalFilename = file.getOriginalFilename();
        
        if (originalFilename == null || originalFilename.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "File name is missing"));
        }

        String lowerFilename = originalFilename.toLowerCase();

        if (!lowerFilename.endsWith(".jpg") && !lowerFilename.endsWith(".jpeg") && !lowerFilename.endsWith(".png")
                && !lowerFilename.endsWith(".gif") && !lowerFilename.endsWith(".webp") && !lowerFilename.endsWith(".bmp")) {
            return ResponseEntity.badRequest().body(Map.of("error", "File extension not supported. Allowed: .jpg, .jpeg, .png, .gif, .webp, .bmp"));
        }

        // Validate MIME type
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            return ResponseEntity.badRequest().body(Map.of("error", "Only image files are allowed (image/*)"));
        }

        // Validate file size (2 MB)
        if (file.getSize() > MAX_SIZE_BYTES) {
            return ResponseEntity.badRequest().body(Map.of("error", "File size must not exceed 2 MB"));
        }

        // Upload to Cloudinary and save metadata
        try {
            Map<String, Object> uploadResult = cloudinaryStorageService.upload(file);
            String secureUrl = (String) uploadResult.get("secure_url");
            String publicId = (String) uploadResult.get("public_id");

            Media media = new Media(
                    file.getOriginalFilename(),
                    contentType,
                    file.getSize(),
                    auth.getName(),
                    secureUrl,
                    publicId);

            Media saved = mediaRepository.save(media);

            return ResponseEntity.ok(Map.of(
                    "id", saved.getId(),
                    "url", saved.getUrl(),
                    "filename", saved.getOriginalFilename(),
                    "size", saved.getSize()));
        } catch (IOException e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Failed to upload image to Cloudinary"));
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getImage(@PathVariable String id) {
        var mediaOpt = mediaRepository.findById(id);
        if (mediaOpt.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("error", "Image not found"));
        }

        Media media = mediaOpt.get();
        // Redirect client to the hosted Cloudinary URL with caching headers (24h)
        return ResponseEntity.status(302)
                .header(HttpHeaders.CACHE_CONTROL, "public, max-age=86400")
                .location(URI.create(media.getUrl()))
                .build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable String id, Authentication auth) {
        var mediaOpt = mediaRepository.findById(id);
        if (mediaOpt.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("error", "Image not found"));
        }

        Media media = mediaOpt.get();
        if (!media.getSellerEmail().equals(auth.getName())) {
            return ResponseEntity.status(403).body(Map.of("error", "You do not own this media"));
        }

        try {
            cloudinaryStorageService.delete(media.getPublicId());
        } catch (IOException ignored) {
        }

        mediaRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}