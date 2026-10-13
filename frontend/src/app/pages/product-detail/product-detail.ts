import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../services/auth.service';
import { MediaResponse, MediaService } from '../../services/media.service';
import { NotificationService } from '../../services/notification.service';
import { Product, ProductService } from '../../services/product.service';
import { extractErrorMessage } from '../../utils/error-message';
import { forkJoin } from 'rxjs';

interface SelectedProductImage {
  file: File;
  previewUrl: string;
}

interface ExistingProductImage {
  id: string;
  url: string;
}

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatIconModule],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.css',
})
export class ProductDetail implements OnDestroy, OnInit {
  product = signal<Product | null>(null);
  loading = signal(false);
  isEditing = signal(false);
  menuOpen = signal(false);
  currentImageIndex = 0;
  editName = '';
  editDescription = '';
  editPrice = 0;
  editQuantity = 1;
  existingEditImages = signal<ExistingProductImage[]>([]);
  selectedEditImages = signal<SelectedProductImage[]>([]);
  imageSelectionChanged = signal(false);
  isSaving = signal(false);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productService: ProductService,
    private mediaService: MediaService,
    public authService: AuthService,
    private notifications: NotificationService,
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

    this.productService.getById(id).subscribe({
      next: (data) => {
        this.product.set(data);
        this.currentImageIndex = 0;
        this.loading.set(false);
      },
      error: (err) => {
        const message = extractErrorMessage(err, 'Unable to load product details.');
        this.notifications.error(message);
        this.loading.set(false);
      },
    });
  }

  toggleMenu(): void {
    this.menuOpen.set(!this.menuOpen());
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  showPreviousImage(imageCount: number): void {
    this.currentImageIndex = (this.currentImageIndex - 1 + imageCount) % imageCount;
  }

  showNextImage(imageCount: number): void {
    this.currentImageIndex = (this.currentImageIndex + 1) % imageCount;
  }

  ngOnDestroy(): void {
    this.clearEditImagePreviews();
  }

  onEditImagesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);

    input.value = '';
    if (files.length === 0) return;

    this.selectedEditImages.update((images) => [
      ...images,
      ...files.map((file) => ({ file, previewUrl: URL.createObjectURL(file) })),
    ]);
    this.imageSelectionChanged.set(true);
  }

  removeExistingEditImage(index: number): void {
    this.existingEditImages.update((images) =>
      images.filter((_, imageIndex) => imageIndex !== index),
    );
    this.imageSelectionChanged.set(true);
  }

  removeEditImage(index: number): void {
    const images = this.selectedEditImages();
    const removed = images[index];
    if (removed) URL.revokeObjectURL(removed.previewUrl);
    this.selectedEditImages.set(images.filter((_, imageIndex) => imageIndex !== index));
    this.imageSelectionChanged.set(true);
  }

  cancelEdit(): void {
    if (this.isSaving()) return;
    this.clearEditImagePreviews();
    this.isEditing.set(false);
  }

  openEdit(): void {
    const current = this.product();
    if (!current) return;

    this.closeMenu();
    this.clearEditImagePreviews();
    this.editName = current.name;
    this.editDescription = current.description;
    this.editPrice = current.price;
    this.editQuantity = current.quantity ?? 1;
    this.existingEditImages.set(
      (current.imageUrls ?? []).map((url) => ({
        id: url.substring(url.lastIndexOf('/') + 1),
        url,
      })),
    );
    this.isEditing.set(true);
  }

  saveEdit(): void {
    const current = this.product();
    if (!current || this.isSaving()) return;

    const name = this.editName.trim();
    const description = this.editDescription.trim();
    const validationErrors: string[] = [];

    if (name.length < 2 || name.length > 50) {
      validationErrors.push('Product name must be between 2 and 50 characters.');
    }
    if (!description) {
      validationErrors.push('Product description is required.');
    } else if (description.length > 500) {
      validationErrors.push('Product description cannot exceed 500 characters.');
    }
    if (!Number.isFinite(this.editPrice) || this.editPrice < 0.01 || this.editPrice > 1_000_000) {
      validationErrors.push('Price must be between €0.01 and €1,000,000.');
    }
    if (
      !Number.isInteger(this.editQuantity) ||
      this.editQuantity < 1 ||
      this.editQuantity > 1_000_000
    ) {
      validationErrors.push('Quantity must be between 1 and 1,000,000.');
    }

    if (validationErrors.length > 0) {
      this.notifications.error(validationErrors.join(' '));
      return;
    }

    this.isSaving.set(true);
    const images = this.selectedEditImages();
    if (images.length > 0) {
      forkJoin(images.map(({ file }) => this.mediaService.upload(file))).subscribe({
        next: (uploadedImages) => this.updateProduct(current.id, uploadedImages),
        error: (err) => {
          this.notifications.error(extractErrorMessage(err, 'Image upload failed.'));
          this.isSaving.set(false);
        },
      });
      return;
    }

    this.updateProduct(current.id);
  }

  private updateProduct(productId: string, uploadedImages?: MediaResponse[]): void {
    const imageIds = [
      ...this.existingEditImages().map(({ id }) => id),
      ...(uploadedImages ?? []).map(({ id }) => id),
    ];
    const update = {
      name: this.editName.trim(),
      description: this.editDescription.trim(),
      price: this.editPrice,
      quantity: this.editQuantity,
      ...(this.imageSelectionChanged() ? { imageIds } : {}),
    };

    this.productService.update(productId, update).subscribe({
      next: () => {
        this.clearEditImagePreviews();
        this.isEditing.set(false);
        this.isSaving.set(false);
        this.notifications.success('Product updated successfully.');
        this.loadProduct(productId);
      },
      error: (err) => {
        this.notifications.error(extractErrorMessage(err, 'Update failed.'));
        this.isSaving.set(false);
      },
    });
  }

  private clearEditImagePreviews(): void {
    this.selectedEditImages().forEach(({ previewUrl }) => URL.revokeObjectURL(previewUrl));
    this.selectedEditImages.set([]);
    this.existingEditImages.set([]);
    this.imageSelectionChanged.set(false);
  }

  deleteProduct(): void {
    const current = this.product();
    if (!current) return;
    this.closeMenu();
    if (!confirm(`Delete "${current.name}"?`)) return;

    this.productService.delete(current.id).subscribe({
      next: () => {
        this.notifications.success('Product deleted successfully.');
        this.router.navigate(['/']);
      },
      error: (err) => {
        const message = extractErrorMessage(err, 'Delete failed.');
        this.notifications.error(message);
      },
    });
  }
}
