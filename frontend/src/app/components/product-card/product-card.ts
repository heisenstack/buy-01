import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Product } from '../../services/product.service';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './product-card.html',
  styleUrl: './product-card.css'
})
export class ProductCard {
  @Input() product!: Product;
  @Input() isOwner = false;
  @Input() showOwnerMenu = false;

  @Output() edit = new EventEmitter<Product>();
  @Output() delete = new EventEmitter<Product>();

  menuOpen = false;

  getSellerName(): string {
    return this.product?.sellerName?.trim() || 'Seller';
  }

  getTimestamp(): string {
    if (!this.product?.createdAt) {
      return 'Just now';
    }

    const date = new Date(this.product.createdAt);
    if (Number.isNaN(date.getTime())) {
      return 'Just now';
    }

    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  getQuantityLabel(): string {
    const quantity = this.product?.quantity ?? 1;
    return quantity > 1 ? `${quantity} left` : `${quantity} available`;
  }

  toggleMenu(event: Event): void {
    event.stopPropagation();
    this.menuOpen = !this.menuOpen;
  }

  onEdit(event: Event): void {
    event.stopPropagation();
    this.menuOpen = false;
    this.edit.emit(this.product);
  }

  onDelete(event: Event): void {
    event.stopPropagation();
    this.menuOpen = false;
    this.delete.emit(this.product);
  }
}
