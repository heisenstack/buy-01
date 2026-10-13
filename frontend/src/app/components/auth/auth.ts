import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { extractErrorMessage } from '../../utils/error-message';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './auth.html',
  styleUrl: './auth.css',
})
export class Auth {
  mode = signal<'login' | 'register'>('login');
  username = '';
  email = '';
  password = '';
  role = 'CLIENT';
  isSubmitting = signal(false);
  fieldErrors = signal<Record<string, string>>({});

  constructor(
    public authService: AuthService,
    private router: Router,
    private notifications: NotificationService,
  ) {}

  toggleMode(): void {
    this.mode.set(this.mode() === 'login' ? 'register' : 'login');
    this.fieldErrors.set({});
  }

  clearFieldError(field: string): void {
    const current = this.fieldErrors();
    if (!current[field]) return;
    const next = { ...current };
    delete next[field];
    this.fieldErrors.set(next);
  }

  private validateLogin(): Record<string, string> {
    const errors: Record<string, string> = {};

    if (!this.email.trim()) {
      errors['email'] = 'Email is required.';
    } else if (this.email.trim().length > 20) {
      errors['email'] = 'Email cannot exceed 20 characters.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email.trim())) {
      errors['email'] = 'Enter a valid email address.';
    }

    if (!this.password.trim()) {
      errors['password'] = 'Password is required.';
    }

    return errors;
  }

  private validateRegister(): Record<string, string> {
    const errors: Record<string, string> = {};

    if (!this.username.trim()) {
      errors['username'] = 'Username is required.';
    } else if (this.username.trim().length < 2) {
      errors['username'] = 'Username must be at least 2 characters.';
    } else if (this.username.trim().length > 15) {
      errors['username'] = 'Username cannot exceed 15 characters.';
    } else if (!/^[A-Za-z0-9]+$/.test(this.username.trim())) {
      errors['username'] = 'Username can contain only letters and numbers.';
    }

    if (!this.email.trim()) {
      errors['email'] = 'Email is required.';
    } else if (this.email.trim().length > 20) {
      errors['email'] = 'Email cannot exceed 20 characters.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email.trim())) {
      errors['email'] = 'Enter a valid email address.';
    }

    if (!this.password.trim()) {
      errors['password'] = 'Password is required.';
    } else if (this.password.length < 6) {
      errors['password'] = 'Password must be at least 6 characters.';
    }

    return errors;
  }

  private applyServerFieldErrors(err: any): void {
    const body = err?.error ?? err?.body ?? {};
    const mapped: Record<string, string> = {};

    if (body && typeof body === 'object') {
      Object.entries(body).forEach(([key, value]) => {
        if (
          ['username', 'email', 'password', 'role'].includes(key) &&
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

  submit(): void {
    if (this.isSubmitting()) return;

    const errors = this.mode() === 'login' ? this.validateLogin() : this.validateRegister();
    if (Object.keys(errors).length > 0) {
      this.fieldErrors.set(errors);
      this.notifications.error(Object.values(errors).join(' '));
      return;
    }

    this.fieldErrors.set({});
    this.isSubmitting.set(true);

    if (this.mode() === 'login') {
      this.authService.login(this.email.trim(), this.password).subscribe({
        next: () => {
          this.notifications.success('You are now signed in.');
          this.isSubmitting.set(false);
          this.router.navigate(['/']);
        },
        error: (err) => {
          this.applyServerFieldErrors(err);
          const message = extractErrorMessage(err, 'Login failed. Please check your credentials.');
          this.notifications.error(message);
          this.isSubmitting.set(false);
        },
      });
    } else {
      this.authService
        .register(this.username.trim(), this.email.trim(), this.password, this.role)
        .subscribe({
          next: () => {
            this.notifications.success('Account created. You can now sign in.');
            this.mode.set('login');
            this.isSubmitting.set(false);
          },
          error: (err) => {
            this.applyServerFieldErrors(err);
            const message = extractErrorMessage(err, 'Registration failed. Please try again.');
            this.notifications.error(message);
            this.isSubmitting.set(false);
          },
        });
    }
  }

  logout(): void {
    this.authService.logout();
  }
}
