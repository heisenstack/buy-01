package com.buy01.product_service.controller;

import com.buy01.product_service.dto.ProductRequest;
import com.buy01.product_service.model.Product;
import com.buy01.product_service.repository.ProductRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/products")
public class ProductController {

    @Autowired
    private ProductRepository productRepository;

    @GetMapping
    public List<Product> all() {
        return productRepository.findAll();
    }
}