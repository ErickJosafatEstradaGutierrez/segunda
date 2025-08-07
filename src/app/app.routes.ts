// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { Login } from './auth/login/login';
import { Admin } from './pages/admin/admin';
import { Delivery } from './pages/delivery/delivery';

export const routes: Routes = [
  { path: '', component: Login },
  { path: 'admin', component: Admin },
  { path: 'delivery', component: Delivery },
];
