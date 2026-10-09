import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ProductService, Product } from '../../services/product.service';
import { AuthService } from '../../services/auth.service';
import { CreateProduct } from '../../components/create-product/create-product';
import { ProductCard } from '../../components/product-card/product-card';
import { extractErrorMessage } from '../../utils/error-message';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, CreateProduct, ProductCard],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit {
  products = signal<Product[]>([]);
  error = signal<string | null>(null);
  loading = signal(false);

  constructor(
    private productService: ProductService,
    public authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadProducts();
  }

  private sortNewestFirst(items: Product[]): Product[] {
    return [...items].sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });
  }

  loadProducts(): void {
    this.loading.set(true);
    this.error.set(null);

    this.productService.getAll().subscribe({
      next: (data) => {
        this.products.set(this.sortNewestFirst(data));
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(extractErrorMessage(err, 'Unable to load your products.'));
        this.loading.set(false);
      }
    });
  }

  onProductCreated(): void {
    this.loadProducts();
  }

  totalInventory(): number {
    return this.products()
      .filter((product) => this.isOwner(product))
      .reduce((total, product) => total + (product.quantity ?? 1), 0);
  }

  isOwner(product: Product): boolean {
    return this.authService.currentUser()?.email === product.sellerEmail;
  }

  startEdit(product: Product): void {
    this.router.navigate(['/products', product.id]);
  }

  deleteProduct(product: Product): void {
    if (!confirm(`Delete "${product.name}"?`)) return;

    this.productService.delete(product.id).subscribe({
      next: () => this.loadProducts(),
      error: (err) => this.error.set(extractErrorMessage(err, 'Delete failed.'))
    });
  }
}