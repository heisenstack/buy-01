import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ProductService } from '../../services/product.service';
import { MediaService } from '../../services/media.service';
import { extractErrorMessage } from '../../utils/error-message';

@Component({
  selector: 'app-create-product',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './create-product.html',
  styleUrl: './create-product.css'
})
export class CreateProduct {
  @Input() mode: 'inline' | 'modal' = 'inline';
  @Output() productCreated = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();

  name = '';
  description = '';
  price = 0;
  quantity = 1;
  selectedFile: File | null = null;
  message = signal<string | null>(null);
  isSubmitting = signal(false);
  fieldErrors = signal<Record<string, string>>({});

  constructor(
    private productService: ProductService,
    private mediaService: MediaService
  ) {}

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile = input.files?.[0] ?? null;
    if (this.selectedFile) {
      this.clearFieldError('image');
    }
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

    if (this.selectedFile) {
      this.mediaService.upload(this.selectedFile).subscribe({
        next: (media) => this.createProduct([media.id]),
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
    this.selectedFile = null;
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