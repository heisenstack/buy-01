import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService, UserProfile } from '../../services/auth.service';
import { MediaService } from '../../services/media.service';
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
  message = signal<string | null>(null);
  loading = signal(true);
  submitting = signal(false);
  isEditing = signal(false);
  selectedFile: File | null = null;
  selectedAvatarPreview: string | null = null;
  usernameInput = '';
  emailInput = '';

  constructor(
    private authService: AuthService,
    private mediaService: MediaService
  ) {}

  get currentAvatarUrl(): string | null {
    const avatarUrl = this.profile()?.avatarUrl;
    return avatarUrl ? avatarUrl : null;
  }

  get isMessageError(): boolean {
    const value = (this.message() ?? '').toLowerCase();
    return ['error', 'failed', 'invalid', 'required', 'already', 'upload', 'duplicate'].some(token => value.includes(token));
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
        this.emailInput = data.email || '';
        this.selectedAvatarPreview = null;
        this.loading.set(false);
      },
      error: (err) => {
        this.message.set(extractErrorMessage(err, 'Failed to load profile.'));
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

  startEditing(): void {
    const current = this.profile();
    if (!current) return;

    this.usernameInput = current.username || '';
    this.emailInput = current.email || '';
    this.selectedAvatarPreview = null;
    this.isEditing.set(true);
    this.message.set(null);
  }

  cancelEditing(): void {
    this.isEditing.set(false);
    this.selectedFile = null;
    this.selectedAvatarPreview = null;
    this.message.set(null);
  }

  saveProfile(): void {
    const current = this.profile();
    if (!current) return;

    const username = this.usernameInput.trim();
    const email = this.emailInput.trim();

    if (!username || !email) {
      this.message.set('Username and email are required.');
      return;
    }

    this.submitting.set(true);
    this.message.set('Saving profile...');

    const submitProfileUpdate = (payload: { username?: string; email?: string; avatarMediaId?: string }) => {
      this.authService.updateProfile(payload).subscribe({
        next: (updated) => {
          this.profile.set(updated);
          this.usernameInput = updated.username || '';
          this.emailInput = updated.email || '';
          this.selectedAvatarPreview = null;
          this.selectedFile = null;
          this.isEditing.set(false);
          this.message.set('Profile updated successfully.');
          this.submitting.set(false);
        },
        error: (err) => {
          this.message.set(extractErrorMessage(err, 'Failed to update profile.'));
          this.submitting.set(false);
        }
      });
    };

    if (!this.selectedFile) {
      submitProfileUpdate({ username, email });
      return;
    }

    this.mediaService.upload(this.selectedFile).subscribe({
      next: (media) => {
        submitProfileUpdate({ username, email, avatarMediaId: media.id });
      },
      error: (err) => {
        this.message.set(extractErrorMessage(err, 'Avatar upload failed.'));
        this.submitting.set(false);
      }
    });
  }
}