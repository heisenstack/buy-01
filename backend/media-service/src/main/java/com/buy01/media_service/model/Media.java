package com.buy01.media_service.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "media")
public class Media {

    @Id
    private String id;
    private String originalFilename;
    private String contentType;
    private long size;
    private String sellerEmail;
    private String url;
    private String publicId;
    private Instant uploadedAt;

    public Media(String originalFilename, String contentType, long size, String sellerEmail, String url, String publicId) {
        this.originalFilename = originalFilename;
        this.contentType = contentType;
        this.size = size;
        this.sellerEmail = sellerEmail;
        this.url = url;
        this.publicId = publicId;
        this.uploadedAt = Instant.now();
    }
}
