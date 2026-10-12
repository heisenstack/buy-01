import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ProductService, Product } from '../../services/product.service';
import { AuthService } from '../../services/auth.service';
import { extractErrorMessage } from '../../utils/error-message';
import { ProductCard } from '../../components/product-card/product-card';
import { CreateProduct } from '../../components/create-product/create-product';
import { NotificationService } from '../../services/notification.service';

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
  loadingMore = signal(false);
  showCreateModal = signal(false);
  currentPage = signal(0);
  hasMore = signal(true);
  private readonly pageSize = 20;

  constructor(
    private productService: ProductService,
    public authService: AuthService,
    private router: Router,
    private notifications: NotificationService
  ) {}

  ngOnInit(): void {
    this.loadProducts();
  }

  loadMore(): void {
    if (!this.hasMore() || this.loadingMore()) return;
    this.loadProducts(true);
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

  loadProducts(append: boolean = false): void {
    if (!append) {
      this.loading.set(true);
      this.products.set([]);
      this.currentPage.set(0);
      this.hasMore.set(true);
    } else {
      this.loadingMore.set(true);
    }

    this.error.set(null);

    this.productService.getPage(this.currentPage(), this.pageSize).subscribe({
      next: (page) => {
        const nextProducts = this.sortNewestFirst(page.content);
        const mergedProducts = append ? [...this.products(), ...nextProducts] : nextProducts;

        this.products.set(this.sortNewestFirst(mergedProducts));
        this.hasMore.set(!page.last);
        this.currentPage.set(page.number + 1);
        this.loading.set(false);
        this.loadingMore.set(false);
      },
      error: (err) => {
        const message = extractErrorMessage(err, 'Unable to load products right now.');
        this.error.set(message);
        this.notifications.error(message);
        this.loading.set(false);
        this.loadingMore.set(false);
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
      next: () => {
        this.notifications.success('Product deleted successfully.');
        this.loadProducts();
      },
      error: (err) => {
        const message = extractErrorMessage(err, 'Delete failed.');
        this.error.set(message);
        this.notifications.error(message);
      }
    });
  }

  startEdit(product: Product): void {
    this.openProduct(product);
  }
}