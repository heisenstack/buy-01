package com.buy01.product_service.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "products")
public class Product {

    @Id
    private String id;
    private String name;
    private String description;
    private double price;
    private int quantity;
    private String sellerEmail;
    private String sellerName;
    private List<String> imageUrls;
    private Instant createdAt;

    public Product(String name, String description, double price, int quantity, String sellerEmail, List<String> imageUrls) {
        this(name, description, price, quantity, sellerEmail, null, imageUrls);
    }

    public Product(String name, String description, double price, int quantity, String sellerEmail, String sellerName, List<String> imageUrls) {
        this.name = name;
        this.description = description;
        this.price = price;
        this.quantity = quantity;
        this.sellerEmail = sellerEmail;
        this.sellerName = sellerName;
        this.imageUrls = imageUrls;
        this.createdAt = Instant.now();
    }
}
