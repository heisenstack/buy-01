import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Product {
  id: string;
  name: string;
  sellerName: string;
  description: string;
  price: number;
  quantity?: number;
  sellerEmail: string;
  createdAt?: string;
  imageUrls: string[];
}

export interface PagedProducts {
  content: Product[];
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
  first: boolean;
}

@Injectable({ providedIn: 'root' })
export class ProductService {
  private baseUrl = '/api/products/products';

  constructor(private http: HttpClient) {}

  getPage(page: number = 0, size: number = 20): Observable<PagedProducts> {
    return this.http.get<PagedProducts>(`${this.baseUrl}?page=${page}&size=${size}`);
  }

  getAll(): Observable<Product[]> {
    return this.getPage(0, 20).pipe(map((response) => response.content));
  }

  getById(id: string): Observable<Product> {
    return this.http.get<Product>(`${this.baseUrl}/${id}`);
  }

  create(product: { name: string; description: string; price: number; quantity?: number; imageIds: string[] }): Observable<Product> {
    return this.http.post<Product>(this.baseUrl, product);
  }

  update(id: string, product: { name: string; description: string; price: number; quantity?: number; imageIds?: string[] }): Observable<Product> {
    return this.http.put<Product>(`${this.baseUrl}/${id}`, product);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}