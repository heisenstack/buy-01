import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService, UserProfile } from '../../services/auth.service';
import { MediaService } from '../../services/media.service';
import { ProductService } from '../../services/product.service';
import { NotificationService } from '../../services/notification.service';
import { extractErrorMessage } from '../../utils/error-message';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.html',
  styleUrl: './profile.css'
})
export class Profile implements OnInit {
  profile = signal<UserProfile | null>(null);
  loading = signal(true);
  submitting = signal(false);
  isEditing = signal(false);
  selectedFile: File | null = null;
  selectedAvatarPreview: string | null = null;
  usernameInput = '';
  fieldErrors = signal<Record<string, string>>({});

  constructor(
    private authService: AuthService,
    private mediaService: MediaService,
    private productService: ProductService,
    private notifications: NotificationService
  ) {}

  get currentAvatarUrl(): string | null {
    const avatarUrl = this.profile()?.avatarUrl;
    return avatarUrl ? 'https://localhost:8443' + avatarUrl : null;
  }

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    this.loading.set(true);
    this.authService.getMe().subscribe({
      next: (data) => {
        this.profile.set(data);
        this.usernameInput = data.username || '';
        this.selectedAvatarPreview = null;
        this.loading.set(false);
      },
      error: (err) => {
        this.notifications.error(extractErrorMessage(err, 'Failed to load profile.'));
        this.loading.set(false);
      }
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.selectedFile = file;

    if (!file) {
      this.selectedAvatarPreview = null;
      return;
    }

    this.selectedAvatarPreview = URL.createObjectURL(file);
  }

  clearFieldError(field: string): void {
    const current = this.fieldErrors();
    if (!current[field]) return;

    const next = { ...current };
    delete next[field];
    this.fieldErrors.set(next);
  }

  private validateProfile(): Record<string, string> {
    const errors: Record<string, string> = {};
    const username = this.usernameInput.trim();

    if (!username) {
      errors['username'] = 'Username is required.';
    } else if (username.length < 2) {
      errors['username'] = 'Username must be at least 2 characters.';
    }

    return errors;
  }

  private applyServerFieldErrors(err: any): void {
    const body = err?.error ?? err?.body ?? {};
    const mapped: Record<string, string> = {};

    if (body && typeof body === 'object') {
      Object.entries(body).forEach(([key, value]) => {
        if (key === 'username' && typeof value === 'string' && value.trim()) {
          mapped[key] = value;
        }
      });
    }

    if (Object.keys(mapped).length > 0) {
      this.fieldErrors.set({ ...this.fieldErrors(), ...mapped });
    }
  }

  startEditing(): void {
    const current = this.profile();
    if (!current) return;

    this.usernameInput = current.username || '';
    this.selectedAvatarPreview = null;
    this.fieldErrors.set({});
    this.isEditing.set(true);
  }

  cancelEditing(): void {
    this.isEditing.set(false);
    this.selectedFile = null;
    this.selectedAvatarPreview = null;
    this.fieldErrors.set({});
  }

  saveProfile(): void {
    const current = this.profile();
    if (!current) return;

    const validationErrors = this.validateProfile();
    if (Object.keys(validationErrors).length > 0) {
      this.fieldErrors.set(validationErrors);
      this.notifications.error(Object.values(validationErrors).join(' '));
      return;
    }

    this.fieldErrors.set({});
    this.submitting.set(true);

    const submitProfileUpdate = (payload: { username?: string; avatarMediaId?: string }) => {
      this.authService.updateProfile(payload).subscribe({
        next: (updated) => {
          this.profile.set(updated);
          this.usernameInput = updated.username || '';
          this.selectedAvatarPreview = null;
          this.selectedFile = null;
          this.isEditing.set(false);
          this.fieldErrors.set({});

          if (current.role === 'SELLER' && updated.username !== current.username) {
            this.productService.updateSellerName(updated.username).subscribe({
              next: () => {
                this.notifications.success('Profile updated successfully.');
                this.submitting.set(false);
              },
              error: (err) => {
                const message = `Profile updated, but product seller names could not be updated: ${extractErrorMessage(err, 'Please try again.')}`;
                this.notifications.error(message);
                this.submitting.set(false);
              }
            });
          } else {
            this.notifications.success('Profile updated successfully.');
            this.submitting.set(false);
          }
        },
        error: (err) => {
          this.applyServerFieldErrors(err);
          const message = extractErrorMessage(err, 'Failed to update profile.');
          this.notifications.error(message);
          this.submitting.set(false);
        }
      });
    };

    if (!this.selectedFile) {
      submitProfileUpdate({ username: this.usernameInput.trim() });
      return;
    }

    this.mediaService.upload(this.selectedFile).subscribe({
      next: (media) => {
        submitProfileUpdate({ username: this.usernameInput.trim(), avatarMediaId: media.id });
      },
      error: (err) => {
        const message = extractErrorMessage(err, 'Avatar upload failed.');
        this.notifications.error(message);
        this.submitting.set(false);
      }
    });
  }
}