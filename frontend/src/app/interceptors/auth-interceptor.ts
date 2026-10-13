import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const notifications = inject(NotificationService);
  const token = localStorage.getItem('token');

  if (!token && authService.token()) {
    authService.logout();
  }

  const forwardReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(forwardReq).pipe(
    catchError((error: HttpErrorResponse) => {
      const isAuthUrl = req.url.includes('/api/users/auth/');

      if (error.status === 401 && !isAuthUrl) {
        authService.logout();
        notifications.error('Your session has expired. Please sign in again.');
        router.navigate(['/login']);
      } else if (error.status === 403) {
        notifications.error('Access denied: You do not have permission to perform this action.');
      }

      return throwError(() => error);
    })
  );
};