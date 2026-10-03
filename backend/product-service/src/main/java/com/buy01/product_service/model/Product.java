package com.buy01.product_service.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.List;

@Document(collection = "products")
public class Product {

    @Id
    private String id;
    private String name;
    private String description;
    private double price;
    private String sellerEmail;
    private String sellerName;
    private List<String> imageUrls;

    public Product() {}

    public Product(String name, String description, double price, String sellerEmail, List<String> imageUrls) {
        this(name, description, price, sellerEmail, null, imageUrls);
    }

    public Product(String name, String description, double price, String sellerEmail, String sellerName, List<String> imageUrls) {
        this.name = name;
        this.description = description;
        this.price = price;
        this.sellerEmail = sellerEmail;
        this.sellerName = sellerName;
        this.imageUrls = imageUrls;
    }

    public String getId() { return id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public double getPrice() { return price; }
    public void setPrice(double price) { this.price = price; }
    public String getSellerEmail() { return sellerEmail; }
    public void setSellerEmail(String sellerEmail) { this.sellerEmail = sellerEmail; }
    public String getSellerName() { return sellerName; }
    public void setSellerName(String sellerName) { this.sellerName = sellerName; }
    public List<String> getImageUrls() { return imageUrls; }
    public void setImageUrls(List<String> imageUrls) { this.imageUrls = imageUrls; }
}