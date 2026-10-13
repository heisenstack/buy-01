import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { AuthService, UserProfile } from '../../services/auth.service';
import { MediaService } from '../../services/media.service';
import { ProductService } from '../../services/product.service';
import { NotificationService } from '../../services/notification.service';
import { extractErrorMessage } from '../../utils/error-message';

const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class Profile implements OnInit {
  profile = signal<UserProfile | null>(null);
  loading = signal(true);
  submitting = signal(false);
  isEditing = signal(false);
  selectedFile: File | null = null;
  selectedAvatarPreview: string | null = null;
  fieldErrors = signal<Record<string, string>>({});

  profileForm = new FormGroup({
    username: new FormControl('', [
      Validators.required,
      Validators.minLength(2),
      Validators.maxLength(15),
      Validators.pattern('^[A-Za-z0-9]+$'),
    ]),
  });

  constructor(
    public authService: AuthService,
    private mediaService: MediaService,
    private productService: ProductService,
    private notifications: NotificationService,
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
        this.profileForm.patchValue({ username: data.username || '' });
        this.selectedAvatarPreview = null;
        this.loading.set(false);
      },
      error: (err) => {
        this.notifications.error(extractErrorMessage(err, 'Failed to load profile.'));
        this.loading.set(false);
      },
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    if (!file) {
      this.selectedFile = null;
      this.selectedAvatarPreview = null;
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.notifications.error('Avatar must be an image file (image/*).');
      input.value = '';
      this.selectedFile = null;
      this.selectedAvatarPreview = null;
      return;
    }

    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      this.notifications.error(`Avatar exceeds 2 MB limit (${(file.size / (1024 * 1024)).toFixed(2)} MB).`);
      input.value = '';
      this.selectedFile = null;
      this.selectedAvatarPreview = null;
      return;
    }

    this.selectedFile = file;
    this.selectedAvatarPreview = URL.createObjectURL(file);
  }

  clearFieldError(field: string): void {
    const current = this.fieldErrors();
    if (!current[field]) return;

    const next = { ...current };
    delete next[field];
    this.fieldErrors.set(next);
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

    this.profileForm.patchValue({ username: current.username || '' });
    this.selectedAvatarPreview = null;
    this.selectedFile = null;
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

    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      const errors: Record<string, string> = {};
      const u = this.profileForm.controls.username;
      if (u.errors?.['required']) errors['username'] = 'Username is required.';
      else if (u.errors?.['minlength']) errors['username'] = 'Username must be at least 2 characters.';
      else if (u.errors?.['maxlength']) errors['username'] = 'Username cannot exceed 15 characters.';
      else if (u.errors?.['pattern']) errors['username'] = 'Username can contain only letters and numbers.';

      this.fieldErrors.set(errors);
      this.notifications.error(Object.values(errors).join(' '));
      return;
    }

    const updatedUsername = this.profileForm.value.username!.trim();
    this.fieldErrors.set({});
    this.submitting.set(true);

    const submitProfileUpdate = (payload: { username?: string; avatarMediaId?: string }) => {
      this.authService.updateProfile(payload).subscribe({
        next: (updated) => {
          this.profile.set(updated);
          this.profileForm.patchValue({ username: updated.username || '' });
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
              },
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
        },
      });
    };

    if (!this.selectedFile) {
      submitProfileUpdate({ username: updatedUsername });
      return;
    }

    this.mediaService.upload(this.selectedFile).subscribe({
      next: (media) => {
        submitProfileUpdate({ username: updatedUsername, avatarMediaId: media.id });
      },
      error: (err) => {
        const message = extractErrorMessage(err, 'Avatar upload failed.');
        this.notifications.error(message);
        this.submitting.set(false);
      },
    });
  }
}
