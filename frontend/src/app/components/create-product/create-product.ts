import { Component, EventEmitter, Input, OnDestroy, Output, signal } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ProductService } from '../../services/product.service';
import { MediaService } from '../../services/media.service';
import { NotificationService } from '../../services/notification.service';
import { extractErrorMessage } from '../../utils/error-message';
import { forkJoin } from 'rxjs';

interface SelectedImage {
  file: File;
  previewUrl: string;
}

const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

@Component({
  selector: 'app-create-product',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, MatIconModule],
  templateUrl: './create-product.html',
  styleUrl: './create-product.css',
})
export class CreateProduct implements OnDestroy {
  @Input() mode: 'inline' | 'modal' = 'inline';
  @Output() productCreated = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();

  selectedImages = signal<SelectedImage[]>([]);
  isSubmitting = signal(false);
  fieldErrors = signal<Record<string, string>>({});

  productForm = new FormGroup({
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
    private productService: ProductService,
    private mediaService: MediaService,
    private notifications: NotificationService,
  ) {}

  ngOnDestroy(): void {
    this.clearImagePreviews();
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';

    if (files.length === 0) return;

    const validFiles: File[] = [];

    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        this.notifications.error(`"${file.name}" is not an image. Only image files (image/*) are allowed.`);
        continue;
      }

      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        this.notifications.error(`"${file.name}" exceeds 2 MB size limit (${(file.size / (1024 * 1024)).toFixed(2)} MB).`);
        continue;
      }

      validFiles.push(file);
    }

    if (validFiles.length > 0) {
      this.selectedImages.update((images) => [
        ...images,
        ...validFiles.map((file) => ({ file, previewUrl: URL.createObjectURL(file) })),
      ]);
      this.clearFieldError('image');
    }
  }

  removeImage(index: number): void {
    const images = this.selectedImages();
    const removed = images[index];
    if (removed) URL.revokeObjectURL(removed.previewUrl);
    this.selectedImages.set(images.filter((_, imageIndex) => imageIndex !== index));
  }

  private clearImagePreviews(): void {
    this.selectedImages().forEach(({ previewUrl }) => URL.revokeObjectURL(previewUrl));
    this.selectedImages.set([]);
  }

  clearFieldError(field: string): void {
    const current = this.fieldErrors();
    if (!current[field]) return;
    const next = { ...current };
    delete next[field];
    this.fieldErrors.set(next);
  }

  submit(): void {
    if (this.isSubmitting()) return;

    if (this.productForm.invalid) {
      this.productForm.markAllAsTouched();
      const errors: Record<string, string> = {};
      const n = this.productForm.controls.name;
      if (n.errors?.['required']) errors['name'] = 'Name is required.';
      else if (n.errors?.['minlength'] || n.errors?.['maxlength']) errors['name'] = 'Product name must be between 2 and 50 characters.';

      const d = this.productForm.controls.description;
      if (d.errors?.['required']) errors['description'] = 'Description is required.';
      else if (d.errors?.['maxlength']) errors['description'] = 'Description cannot exceed 500 characters.';

      const p = this.productForm.controls.price;
      if (p.errors?.['required'] || p.errors?.['min'] || p.errors?.['max']) errors['price'] = 'Price must be between €0.01 and €1,000,000.';

      const q = this.productForm.controls.quantity;
      if (q.errors?.['required'] || q.errors?.['min'] || q.errors?.['max']) errors['quantity'] = 'Quantity must be at least 1.';

      this.fieldErrors.set(errors);
      this.notifications.error(Object.values(errors).join(' '));
      return;
    }

    this.fieldErrors.set({});
    this.isSubmitting.set(true);

    if (this.selectedImages().length > 0) {
      forkJoin(this.selectedImages().map(({ file }) => this.mediaService.upload(file))).subscribe({
        next: (mediaFiles) => this.createProduct(mediaFiles.map((media) => media.id)),
        error: (err) => {
          const message = extractErrorMessage(err, 'Image upload failed.');
          this.notifications.error(message);
          this.isSubmitting.set(false);
        },
      });
    } else {
      this.createProduct([]);
    }
  }

  closeForm(): void {
    this.closed.emit();
  }

  private resetForm(): void {
    this.productForm.reset({ quantity: 1 });
    this.clearImagePreviews();
    this.fieldErrors.set({});
  }

  private applyServerFieldErrors(err: any): void {
    const body = err?.error ?? err?.body ?? {};
    const mapped: Record<string, string> = {};

    if (body && typeof body === 'object') {
      Object.entries(body).forEach(([key, value]) => {
        if (
          ['name', 'description', 'price', 'quantity'].includes(key) &&
          typeof value === 'string' &&
          value.trim()
        ) {
          mapped[key] = value;
        }
      });
    }

    if (Object.keys(mapped).length > 0) {
      this.fieldErrors.set({ ...this.fieldErrors(), ...mapped });
    }
  }

  private createProduct(imageIds: string[]): void {
    const { name, description, price, quantity } = this.productForm.value;

    this.productService
      .create({
        name: name!.trim(),
        description: description!.trim(),
        price: Number(price),
        quantity: Number(quantity) || 1,
        imageIds,
      })
      .subscribe({
        next: () => {
          this.notifications.success('Product created successfully.');
          this.productCreated.emit();
          if (this.mode === 'modal') {
            this.closed.emit();
          }
          this.resetForm();
          this.isSubmitting.set(false);
        },
        error: (err) => {
          this.applyServerFieldErrors(err);
          const message = extractErrorMessage(err, 'Product creation failed.');
          this.notifications.error(message);
          this.isSubmitting.set(false);
        },
      });
  }
}
