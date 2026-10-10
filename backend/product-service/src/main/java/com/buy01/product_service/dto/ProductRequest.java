package com.buy01.product_service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProductRequest {

    @NotBlank(message = "Name is required.")
    private String name;

    @NotBlank(message = "Description is required.")
    private String description;

    @Positive(message = "Price must be greater than 0.")
    private double price;

    @Positive(message = "Quantity must be at least 1.")
    private int quantity = 1;

    private List<String> imageIds;
}
