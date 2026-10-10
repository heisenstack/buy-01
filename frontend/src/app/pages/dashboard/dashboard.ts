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
  loadingMore = signal(false);
  currentPage = signal(0);
  hasMore = signal(true);
  private readonly pageSize = 20;

  constructor(
    private productService: ProductService,
    public authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadProducts();
  }

  loadMore(): void {
    if (!this.hasMore() || this.loadingMore()) return;
    this.loadProducts(true);
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
        this.error.set(extractErrorMessage(err, 'Unable to load your products.'));
        this.loading.set(false);
        this.loadingMore.set(false);
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
