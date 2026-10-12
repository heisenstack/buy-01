package com.buy01.product_service.repository;

import com.buy01.product_service.model.Product;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface ProductRepository extends MongoRepository<Product, String> {
    Page<Product> findBySellerEmail(String sellerEmail, Pageable pageable);

    List<Product> findAllBySellerEmail(String sellerEmail);
}