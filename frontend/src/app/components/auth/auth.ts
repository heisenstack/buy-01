import { Component, signal } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { extractErrorMessage } from '../../utils/error-message';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './auth.html',
  styleUrl: './auth.css',
})
export class Auth {
  mode = signal<'login' | 'register'>('login');
  isSubmitting = signal(false);
  fieldErrors = signal<Record<string, string>>({});

  loginForm = new FormGroup({
    email: new FormControl('', [
      Validators.required,
      Validators.email,
    ]),
    password: new FormControl('', [
      Validators.required,
    ]),
  });

  registerForm = new FormGroup({
    username: new FormControl('', [
      Validators.required,
      Validators.minLength(2),
      Validators.maxLength(15),
      Validators.pattern('^[A-Za-z0-9]+$'),
    ]),
    email: new FormControl('', [
      Validators.required,
      Validators.email,
      Validators.maxLength(50),
    ]),
    password: new FormControl('', [
      Validators.required,
      Validators.minLength(6),
    ]),
    role: new FormControl('CLIENT', [
      Validators.required,
    ]),
  });

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

    if (this.mode() === 'login') {
      if (this.loginForm.invalid) {
        this.loginForm.markAllAsTouched();
        const errors: Record<string, string> = {};
        if (this.loginForm.controls.email.errors?.['required']) errors['email'] = 'Email is required.';
        else if (this.loginForm.controls.email.errors?.['email']) errors['email'] = 'Enter a valid email address.';
        if (this.loginForm.controls.password.errors?.['required']) errors['password'] = 'Password is required.';
        this.fieldErrors.set(errors);
        this.notifications.error(Object.values(errors).join(' '));
        return;
      }

      this.fieldErrors.set({});
      this.isSubmitting.set(true);
      const email = this.loginForm.value.email!.trim();
      const password = this.loginForm.value.password!;

      this.authService.login(email, password).subscribe({
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
      if (this.registerForm.invalid) {
        this.registerForm.markAllAsTouched();
        const errors: Record<string, string> = {};
        const u = this.registerForm.controls.username;
        if (u.errors?.['required']) errors['username'] = 'Username is required.';
        else if (u.errors?.['minlength']) errors['username'] = 'Username must be at least 2 characters.';
        else if (u.errors?.['maxlength']) errors['username'] = 'Username cannot exceed 15 characters.';
        else if (u.errors?.['pattern']) errors['username'] = 'Username can contain only letters and numbers.';

        const e = this.registerForm.controls.email;
        if (e.errors?.['required']) errors['email'] = 'Email is required.';
        else if (e.errors?.['email']) errors['email'] = 'Enter a valid email address.';

        const p = this.registerForm.controls.password;
        if (p.errors?.['required']) errors['password'] = 'Password is required.';
        else if (p.errors?.['minlength']) errors['password'] = 'Password must be at least 6 characters.';

        this.fieldErrors.set(errors);
        this.notifications.error(Object.values(errors).join(' '));
        return;
      }

      this.fieldErrors.set({});
      this.isSubmitting.set(true);
      const username = this.registerForm.value.username!.trim();
      const email = this.registerForm.value.email!.trim();
      const password = this.registerForm.value.password!;
      const role = this.registerForm.value.role!;

      this.authService.register(username, email, password, role).subscribe({
        next: () => {
          this.notifications.success('Account created. You can now sign in.');
          this.mode.set('login');
          this.registerForm.reset({ role: 'CLIENT' });
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
