package com.buy01.media_service.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

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

    public Media() {
    }

    public Media(String originalFilename, String contentType, long size, String sellerEmail, String url, String publicId) {
        this.originalFilename = originalFilename;
        this.contentType = contentType;
        this.size = size;
        this.sellerEmail = sellerEmail;
        this.url = url;
        this.publicId = publicId;
        this.uploadedAt = Instant.now();
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getOriginalFilename() {
        return originalFilename;
    }

    public void setOriginalFilename(String originalFilename) {
        this.originalFilename = originalFilename;
    }

    public String getContentType() {
        return contentType;
    }

    public void setContentType(String contentType) {
        this.contentType = contentType;
    }

    public long getSize() {
        return size;
    }

    public void setSize(long size) {
        this.size = size;
    }

    public String getSellerEmail() {
        return sellerEmail;
    }

    public void setSellerEmail(String sellerEmail) {
        this.sellerEmail = sellerEmail;
    }

    public String getUrl() {
        return url;
    }

    public void setUrl(String url) {
        this.url = url;
    }

    public String getPublicId() {
        return publicId;
    }

    public void setPublicId(String publicId) {
        this.publicId = publicId;
    }

    public Instant getUploadedAt() {
        return uploadedAt;
    }

    public void setUploadedAt(Instant uploadedAt) {
        this.uploadedAt = uploadedAt;
    }
}