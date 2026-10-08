package com.buy01.media_service.repository;

import com.buy01.media_service.model.Media;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface MediaRepository extends MongoRepository<Media, String> {
    List<Media> findBySellerEmail(String sellerEmail);
}