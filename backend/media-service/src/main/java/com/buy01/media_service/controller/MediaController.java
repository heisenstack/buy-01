package com.buy01.media_service.controller;

import com.buy01.media_service.model.Media;
import com.buy01.media_service.repository.MediaRepository;
import com.buy01.media_service.service.CloudinaryStorageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.URI;
import java.util.Map;

@RestController
@RequestMapping("/media/images")
public class MediaController {

    private static final long MAX_SIZE_BYTES = 2L * 1024 * 1024; // 2 MB

    @Autowired
    private MediaRepository mediaRepository;

    @Autowired
    private CloudinaryStorageService cloudinaryStorageService;

    @PostMapping
    public ResponseEntity<?> upload(@RequestParam("file") MultipartFile file, Authentication auth) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "File is empty"));
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

        // Sniff first bytes to verify magic number of real image format
        try {
            byte[] header = file.getInputStream().readNBytes(8);
            if (!isRealImage(header)) {
                return ResponseEntity.badRequest().body(Map.of("error", "File content does not match a valid image format"));
            }
        } catch (IOException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Could not read file"));
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
                    publicId
            );

            Media saved = mediaRepository.save(media);

            return ResponseEntity.ok(Map.of(
                    "id", saved.getId(),
                    "url", saved.getUrl(),
                    "filename", saved.getOriginalFilename(),
                    "size", saved.getSize()
            ));
        } catch (IOException e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Failed to upload image to Cloudinary"));
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getImage(@PathVariable String id) {
        var mediaOpt = mediaRepository.findById(id);
        if (mediaOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Media media = mediaOpt.get();
        // Redirect client directly to the hosted Cloudinary URL (302 Found)
        return ResponseEntity.status(302)
                .location(URI.create(media.getUrl()))
                .build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable String id, Authentication auth) {
        var mediaOpt = mediaRepository.findById(id);
        if (mediaOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Media media = mediaOpt.get();
        if (!media.getSellerEmail().equals(auth.getName())) {
            return ResponseEntity.status(403).body(Map.of("error", "You do not own this media"));
        }

        try {
            cloudinaryStorageService.delete(media.getPublicId());
        } catch (IOException ignored) {
            // Log or ignore if already removed from Cloudinary
        }

        mediaRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Checks magic bytes of common image formats:
     * JPEG: FF D8 FF
     * PNG:  89 50 4E 47
     * GIF:  47 49 46 38
     * WEBP: 52 49 46 46 (RIFF)
     * BMP:  42 4D
     */
    private boolean isRealImage(byte[] header) {
        if (header.length < 4) return false;
        // JPEG
        if ((header[0] & 0xFF) == 0xFF && (header[1] & 0xFF) == 0xD8 && (header[2] & 0xFF) == 0xFF)
            return true;
        // PNG
        if ((header[0] & 0xFF) == 0x89 && header[1] == 0x50 && header[2] == 0x4E && header[3] == 0x47)
            return true;
        // GIF
        if (header[0] == 0x47 && header[1] == 0x49 && header[2] == 0x46 && header[3] == 0x38)
            return true;
        // WEBP (RIFF....)
        if (header.length >= 8 && header[0] == 0x52 && header[1] == 0x49 && header[2] == 0x46 && header[3] == 0x46)
            return true;
        // BMP
        if (header[0] == 0x42 && header[1] == 0x4D)
            return true;
        return false;
    }
}