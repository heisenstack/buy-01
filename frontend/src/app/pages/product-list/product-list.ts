import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ProductService, Product } from '../../services/product.service';
import { AuthService } from '../../services/auth.service';
import { extractErrorMessage } from '../../utils/error-message';
import { ProductCard } from '../../components/product-card/product-card';
import { CreateProduct } from '../../components/create-product/create-product';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule, ProductCard, CreateProduct],
  templateUrl: './product-list.html',
  styleUrl: './product-list.css'
})
export class ProductList implements OnInit {
  products = signal<Product[]>([]);
  error = signal<string | null>(null);
  loading = signal(false);
  showCreateModal = signal(false);

  constructor(
    private productService: ProductService,
    public authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadProducts();
  }

  isOwner(product: Product): boolean {
    return this.authService.currentUser()?.email === product.sellerEmail;
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
        this.error.set(extractErrorMessage(err, 'Unable to load products right now.'));
        this.loading.set(false);
      }
    });
  }

  openCreateModal(): void {
    this.showCreateModal.set(true);
  }

  closeCreateModal(): void {
    this.showCreateModal.set(false);
  }

  onProductCreated(): void {
    this.closeCreateModal();
    this.loadProducts();
  }

  openProduct(product: Product): void {
    this.router.navigate(['/products', product.id]);
  }

  deleteProduct(product: Product): void {
    if (!this.isOwner(product)) return;
    if (!confirm(`Delete "${product.name}"?`)) return;

    this.productService.delete(product.id).subscribe({
      next: () => this.loadProducts(),
      error: (err) => this.error.set(extractErrorMessage(err, 'Delete failed.'))
    });
  }

  startEdit(product: Product): void {
    this.openProduct(product);
  }
}