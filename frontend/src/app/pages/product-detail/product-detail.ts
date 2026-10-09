import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { Product, ProductService } from '../../services/product.service';
import { extractErrorMessage } from '../../utils/error-message';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.css'
})
export class ProductDetail implements OnInit {
  product = signal<Product | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);
  isEditing = signal(false);
  menuOpen = signal(false);
  editName = '';
  editDescription = '';
  editPrice = 0;
  editQuantity = 1;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productService: ProductService,
    public authService: AuthService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadProduct(id);
    }
  }

  isOwner(product: Product | null): boolean {
    if (!product) return false;
    return this.authService.currentUser()?.email === product.sellerEmail;
  }

  loadProduct(id: string): void {
    this.loading.set(true);
    this.error.set(null);

    this.productService.getById(id).subscribe({
      next: (data) => {
        this.product.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(extractErrorMessage(err, 'Unable to load product details.'));
        this.loading.set(false);
      }
    });
  }

  toggleMenu(): void {
    this.menuOpen.set(!this.menuOpen());
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  openEdit(): void {
    const current = this.product();
    if (!current) return;

    this.closeMenu();
    this.editName = current.name;
    this.editDescription = current.description;
    this.editPrice = current.price;
    this.editQuantity = current.quantity ?? 1;
    this.isEditing.set(true);
  }

  saveEdit(): void {
    const current = this.product();
    if (!current) return;

    this.productService.update(current.id, {
      name: this.editName,
      description: this.editDescription,
      price: this.editPrice,
      quantity: this.editQuantity
    }).subscribe({
      next: () => {
        this.isEditing.set(false);
        this.loadProduct(current.id);
      },
      error: (err) => this.error.set(extractErrorMessage(err, 'Update failed.'))
    });
  }

  deleteProduct(): void {
    const current = this.product();
    if (!current) return;
    this.closeMenu();
    if (!confirm(`Delete "${current.name}"?`)) return;

    this.productService.delete(current.id).subscribe({
      next: () => this.router.navigate(['/']),
      error: (err) => this.error.set(extractErrorMessage(err, 'Delete failed.'))
    });
  }
}
