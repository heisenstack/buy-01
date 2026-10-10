package com.buy01.product_service.controller;

import com.buy01.product_service.dto.ProductRequest;
import com.buy01.product_service.model.Product;
import com.buy01.product_service.repository.ProductRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductRepository productRepository;

    @GetMapping
    public List<Product> all() {
        return productRepository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Product> getOne(@PathVariable String id) {
        return productRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Product> create(@Valid @RequestBody ProductRequest request, Authentication auth, HttpServletRequest httpRequest) {
        String sellerEmail = auth.getName();
        String sellerName = httpRequest.getHeader("X-User-Username");

        List<String> imageUrls = buildImageUrls(request.getImageIds());

        Product product = new Product(request.getName(), request.getDescription(), request.getPrice(),
                request.getQuantity(), sellerEmail, sellerName, imageUrls);
        Product saved = productRepository.save(product);

        return ResponseEntity.ok(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable String id, @Valid @RequestBody ProductRequest request, Authentication auth) {
        var existing = productRepository.findById(id);

        if (existing.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Product product = existing.get();

        if (!product.getSellerEmail().equals(auth.getName())) {
            return ResponseEntity.status(403).body(Map.of("error", "You do not own this product"));
        }

        product.setName(request.getName());
        product.setDescription(request.getDescription());
        product.setPrice(request.getPrice());
        product.setQuantity(request.getQuantity());

        if (request.getImageIds() != null && !request.getImageIds().isEmpty()) {
            product.setImageUrls(buildImageUrls(request.getImageIds()));
        }

        return ResponseEntity.ok(productRepository.save(product));
    }

    private List<String> buildImageUrls(List<String> imageIds) {
        if (imageIds == null)
            return List.of();
        return imageIds.stream()
                .map(id -> "/api/media/media/images/" + id)
                .toList();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable String id, Authentication auth) {
        var existing = productRepository.findById(id);

        if (existing.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        if (!existing.get().getSellerEmail().equals(auth.getName())) {
            return ResponseEntity.status(403).body(Map.of("error", "You do not own this product"));
        }

        productRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}