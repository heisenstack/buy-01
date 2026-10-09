import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { extractErrorMessage } from '../../utils/error-message';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './auth.html',
  styleUrl: './auth.css'
})
export class Auth {
  mode = signal<'login' | 'register'>('login');
  username = '';
  email = '';
  password = '';
  role = 'CLIENT';
  message = signal<string | null>(null);
  isSubmitting = signal(false);
  fieldErrors = signal<Record<string, string>>({});

  constructor(public authService: AuthService) {}

  toggleMode(): void {
    this.mode.set(this.mode() === 'login' ? 'register' : 'login');
    this.message.set(null);
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
    }

    if (!this.email.trim()) {
      errors['email'] = 'Email is required.';
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
        if (['username', 'email', 'password', 'role'].includes(key) && typeof value === 'string' && value.trim()) {
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
      this.message.set('Please fix the highlighted fields.');
      return;
    }

    this.fieldErrors.set({});
    this.isSubmitting.set(true);
    this.message.set(null);

    if (this.mode() === 'login') {
      this.authService.login(this.email.trim(), this.password).subscribe({
        next: () => {
          this.message.set('Logged in!');
          this.isSubmitting.set(false);
        },
        error: (err) => {
          this.applyServerFieldErrors(err);
          this.message.set(extractErrorMessage(err, 'Login failed. Please check your credentials.'));
          this.isSubmitting.set(false);
        }
      });
    } else {
      this.authService.register(this.username.trim(), this.email.trim(), this.password, this.role).subscribe({
        next: () => {
          this.message.set('Registered! You can now log in.');
          this.mode.set('login');
          this.isSubmitting.set(false);
        },
        error: (err) => {
          this.applyServerFieldErrors(err);
          this.message.set(extractErrorMessage(err, 'Registration failed. Please try again.'));
          this.isSubmitting.set(false);
        }
      });
    }
  }

  logout(): void {
    this.authService.logout();
  }
}