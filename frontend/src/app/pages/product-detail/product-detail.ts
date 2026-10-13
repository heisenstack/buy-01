import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
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

const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, MatIconModule],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.css',
})
export class ProductDetail implements OnDestroy, OnInit {
  product = signal<Product | null>(null);
  loading = signal(false);
  isEditing = signal(false);
  menuOpen = signal(false);
  currentImageIndex = 0;
  existingEditImages = signal<ExistingProductImage[]>([]);
  selectedEditImages = signal<SelectedProductImage[]>([]);
  imageSelectionChanged = signal(false);
  isSaving = signal(false);

  editForm = new FormGroup({
    name: new FormControl('', [
      Validators.required,
      Validators.minLength(2),
      Validators.maxLength(50),
    ]),
    description: new FormControl('', [
      Validators.required,
      Validators.maxLength(500),
    ]),
    price: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(0.01),
      Validators.max(1000000),
    ]),
    quantity: new FormControl<number>(1, [
      Validators.required,
      Validators.min(1),
      Validators.max(1000000),
    ]),
  });

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

    const validFiles: File[] = [];
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        this.notifications.error(`"${file.name}" is not an image file (image/*).`);
        continue;
      }

      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        this.notifications.error(`"${file.name}" exceeds 2 MB limit (${(file.size / (1024 * 1024)).toFixed(2)} MB).`);
        continue;
      }

      validFiles.push(file);
    }

    if (validFiles.length > 0) {
      this.selectedEditImages.update((images) => [
        ...images,
        ...validFiles.map((file) => ({ file, previewUrl: URL.createObjectURL(file) })),
      ]);
      this.imageSelectionChanged.set(true);
    }
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
    this.editForm.patchValue({
      name: current.name,
      description: current.description,
      price: current.price,
      quantity: current.quantity ?? 1,
    });
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

    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      const validationErrors: string[] = [];
      const n = this.editForm.controls.name;
      if (n.errors?.['required'] || n.errors?.['minlength'] || n.errors?.['maxlength']) {
        validationErrors.push('Product name must be between 2 and 50 characters.');
      }
      const d = this.editForm.controls.description;
      if (d.errors?.['required'] || d.errors?.['maxlength']) {
        validationErrors.push('Product description is required (up to 500 characters).');
      }
      const p = this.editForm.controls.price;
      if (p.errors?.['required'] || p.errors?.['min'] || p.errors?.['max']) {
        validationErrors.push('Price must be between €0.01 and €1,000,000.');
      }
      const q = this.editForm.controls.quantity;
      if (q.errors?.['required'] || q.errors?.['min'] || q.errors?.['max']) {
        validationErrors.push('Quantity must be between 1 and 1,000,000.');
      }

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
    const formVal = this.editForm.value;
    const update = {
      name: formVal.name!.trim(),
      description: formVal.description!.trim(),
      price: Number(formVal.price),
      quantity: Number(formVal.quantity) || 1,
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
