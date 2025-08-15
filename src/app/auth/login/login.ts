import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule, HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class Login {
  username = '';
  password = '';
  error = '';

  constructor(private router: Router, private http: HttpClient) {}

  login() {
    this.error = '';
    const payload = { usuario: this.username, contrasena: this.password };

    this.http.post<{rol: string; usuario: string; message: string}>(
      'https://72.60.31.237/proyecto2/api/api/login',
      payload,
      { withCredentials: true }
    )
    .subscribe({
      next: (res) => {
        if (res.rol === 'admin') this.router.navigate(['/admin']);
        else if (res.rol === 'delivery') this.router.navigate(['/delivery']);
        else this.error = 'Rol desconocido';
      },
      error: (err) => {
        this.error = err.error?.error || 'Error al iniciar sesión';
        console.error('Error en login:', err);
      }
    });
  }
}