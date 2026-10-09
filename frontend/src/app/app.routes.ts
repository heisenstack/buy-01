import { Routes } from '@angular/router';
import { ProductList } from './pages/product-list/product-list';
import { LoginPage } from './pages/login-page/login-page';
import { Dashboard } from './pages/dashboard/dashboard';
import { Profile } from './pages/profile/profile';
import { ProductDetail } from './pages/product-detail/product-detail';
import { sellerGuard } from './guards/seller-guard';
import { loginGuard } from './guards/login-guard';

export const routes: Routes = [
  { path: '', component: ProductList },
  { path: 'login', component: LoginPage, canActivate: [loginGuard] },
  { path: 'dashboard', component: Dashboard, canActivate: [sellerGuard] },
  { path: 'profile', component: Profile, canActivate: [sellerGuard] },
  { path: 'products/:id', component: ProductDetail },
  { path: '**', redirectTo: '' }
];