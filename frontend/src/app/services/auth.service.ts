import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, switchMap } from 'rxjs';

export interface AuthResponse {
  token: string;
}

export interface DecodedUser {
  email: string;
  role: string;
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  role: string;
  avatarUrl: string | null;
}

const TOKEN_KEY = 'token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private baseUrl = 'https://localhost:8443/api/users/auth';

  token = signal<string | null>(null);
  currentUser = signal<DecodedUser | null>(null);
  profile = signal<UserProfile | null>(null);

  constructor(private http: HttpClient) {
    this.restoreSession();
  }

  register(username: string, email: string, password: string, role: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/register`, { username, email, password, role });
  }

  login(email: string, password: string): Observable<UserProfile> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/login`, { email, password }).pipe(
      tap((res) => this.setSession(res.token)),
      switchMap(() => this.getMe()),
      tap((profile) => this.profile.set(profile))
    );
  }

  getMe(): Observable<UserProfile> {
    return this.http.get<UserProfile>('https://localhost:8443/api/users/me');
  }

  updateProfile(profile: { username?: string; email?: string; avatarMediaId?: string }): Observable<UserProfile> {
    return this.http.put<UserProfile>('https://localhost:8443/api/users/me', profile).pipe(
      tap((updatedProfile) => {
        this.profile.set(updatedProfile);

        const currentUser = this.currentUser();
        if (currentUser && updatedProfile.email) {
          this.currentUser.set({ ...currentUser, email: updatedProfile.email });
        }
      })
    );
  }

  updateAvatar(avatarMediaId: string): Observable<UserProfile> {
    return this.updateProfile({ avatarMediaId });
  }

  isAuthenticated(): boolean {
    return !!this.token() || !!this.profile();
  }

  isSeller(): boolean {
    return this.profile()?.role === 'SELLER' || this.currentUser()?.role === 'SELLER';
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    this.token.set(null);
    this.currentUser.set(null);
    this.profile.set(null);
  }

  private restoreSession(): void {
    const savedToken = localStorage.getItem(TOKEN_KEY);
    if (!savedToken) return;

    const decoded = this.decodeToken(savedToken);
    if (!decoded || this.isExpired(savedToken)) {
      this.logout();
      return;
    }

    this.token.set(savedToken);
    this.currentUser.set(decoded);

    this.getMe().subscribe({
      next: (profile) => this.profile.set(profile),
      error: (err) => {
        if (err?.status === 401 || err?.status === 403) {
          this.logout();
        }
      }
    });
  }

  private setSession(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
    this.token.set(token);
    this.currentUser.set(this.decodeToken(token));
  }

  private decodeToken(token: string): DecodedUser | null {
    try {
      const payload = token.split('.')[1];
      const decoded = JSON.parse(atob(payload));
      return { email: decoded.sub, role: decoded.role };
    } catch {
      return null;
    }
  }

  private isExpired(token: string): boolean {
    try {
      const payload = token.split('.')[1];
      const decoded = JSON.parse(atob(payload));
      const expiryMs = decoded.exp * 1000; 
      return Date.now() >= expiryMs;
    } catch {
      return true;
    }
  }
}