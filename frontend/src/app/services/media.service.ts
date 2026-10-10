import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface MediaResponse {
  id: string;
  filename: string;
  contentType: string;
  size: number;
  ownerEmail: string;
}

@Injectable({ providedIn: 'root' })
export class MediaService {
  private baseUrl = '/api/media/media/images';

  constructor(private http: HttpClient) {}

  upload(file: File): Observable<MediaResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<MediaResponse>(this.baseUrl, formData);
  }
}