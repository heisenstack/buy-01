import { Component } from '@angular/core';
import { Auth } from '../../components/auth/auth';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [Auth],
  templateUrl: './login-page.html',
  styleUrl: './login-page.css'
})
export class LoginPage {}