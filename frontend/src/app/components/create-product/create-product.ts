import { Component, EventEmitter, Input, OnDestroy, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ProductService } from '../../services/product.service';
import { MediaService } from '../../services/media.service';
import { extractErrorMessage } from '../../utils/error-message';
import { forkJoin } from 'rxjs';

interface SelectedImage {
  file: File;
  previewUrl: string;
}

@Component({
  selector: 'app-create-product',
  standalone: true,
  imports: [FormsModule, CommonModule, MatIconModule],
  templateUrl: './create-product.html',
  styleUrl: './create-product.css'
})
export class CreateProduct implements OnDestroy {
  @Input() mode: 'inline' | 'modal' = 'inline';
  @Output() productCreated = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();

  name = '';
  description = '';
  price = 0;
  quantity = 1;
  selectedImages = signal<SelectedImage[]>([]);
  message = signal<string | null>(null);
  isSubmitting = signal(false);
  fieldErrors = signal<Record<string, string>>({});

  constructor(
    private productService: ProductService,
    private mediaService: MediaService
  ) {}

  ngOnDestroy(): void {
    this.clearImagePreviews();
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    if (files.length > 0) {
      this.selectedImages.update((images) => [
        ...images,
        ...files.map((file) => ({ file, previewUrl: URL.createObjectURL(file) }))
      ]);
      this.clearFieldError('image');
    }
    input.value = '';
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

  submit(): void {
    if (this.isSubmitting()) return;

    const validationErrors = this.validateForm();
    if (Object.keys(validationErrors).length > 0) {
      this.fieldErrors.set(validationErrors);
      this.message.set('Please fix the highlighted fields.');
      return;
    }

    this.fieldErrors.set({});
    this.isSubmitting.set(true);
    this.message.set('Creating product...');

    if (this.selectedImages().length > 0) {
      forkJoin(this.selectedImages().map(({ file }) => this.mediaService.upload(file))).subscribe({
        next: (mediaFiles) => this.createProduct(mediaFiles.map((media) => media.id)),
        error: (err) => {
          this.message.set(extractErrorMessage(err, 'Image upload failed.'));
          this.isSubmitting.set(false);
        }
      });
    } else {
      this.createProduct([]);
    }
  }

  closeForm(): void {
    this.closed.emit();
  }

  private validateForm(): Record<string, string> {
    const errors: Record<string, string> = {};

    if (!this.name.trim()) {
      errors['name'] = 'Name is required.';
    }

    if (!this.description.trim()) {
      errors['description'] = 'Description is required.';
    }

    if (this.price === null || this.price === undefined || Number(this.price) <= 0) {
      errors['price'] = 'Price must be greater than 0.';
    }

    if (this.quantity === null || this.quantity === undefined || Number(this.quantity) <= 0) {
      errors['quantity'] = 'Quantity must be at least 1.';
    }

    return errors;
  }

  private clearFieldError(field: string): void {
    const current = this.fieldErrors();
    if (!current[field]) return;
    const next = { ...current };
    delete next[field];
    this.fieldErrors.set(next);
  }

  private resetForm(): void {
    this.name = '';
    this.description = '';
    this.price = 0;
    this.quantity = 1;
    this.clearImagePreviews();
    this.fieldErrors.set({});
    this.message.set(null);
  }

  private applyServerFieldErrors(err: any): void {
    const body = err?.error ?? err?.body ?? {};
    const mapped: Record<string, string> = {};

    if (body && typeof body === 'object') {
      Object.entries(body).forEach(([key, value]) => {
        if (['name', 'description', 'price', 'quantity'].includes(key) && typeof value === 'string' && value.trim()) {
          mapped[key] = value;
        }
      });
    }

    if (Object.keys(mapped).length > 0) {
      this.fieldErrors.set({ ...this.fieldErrors(), ...mapped });
    }
  }

  private createProduct(imageIds: string[]): void {
    this.productService.create({
      name: this.name,
      description: this.description,
      price: this.price,
      quantity: this.quantity,
      imageIds
    }).subscribe({
      next: () => {
        this.message.set('Product created!');
        this.productCreated.emit();
        if (this.mode === 'modal') {
          this.closed.emit();
        }
        this.resetForm();
        this.isSubmitting.set(false);
      },
      error: (err) => {
        this.applyServerFieldErrors(err);
        this.message.set(extractErrorMessage(err, 'Product creation failed.'));
        this.isSubmitting.set(false);
      }
    });
  }
}