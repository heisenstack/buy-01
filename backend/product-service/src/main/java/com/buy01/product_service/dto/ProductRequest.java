package com.buy01.product_service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProductRequest {

    @NotBlank(message = "Product name is required.")
    @Size(min = 2, max = 50, message = "Product name must be between 2 and 50 characters.")
    private String name;

    @NotBlank(message = "Product description is required.")
    @Size(min = 1, max = 500, message = "Product description must be no longer than 500 characters.")
    private String description;

    @NotNull(message = "Price is required.")
    @DecimalMin(value = "0.01", message = "Price must be at least €0.01.")
    @DecimalMax(value = "1000000.00", message = "Price cannot exceed €1,000,000.00.")
    @Digits(integer = 7, fraction = 2, message = "Price can have up to 2 decimal places.")
    private double price;

    @Min(value = 1, message = "Quantity must be at least 1.")
    @Max(value = 1000000, message = "Quantity cannot exceed 1,000,000.")
    private int quantity = 1;

    private List<String> imageIds;
}
