import { Component, OnInit, AfterViewInit, Inject, PLATFORM_ID, OnDestroy } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { io, Socket } from 'socket.io-client';
import '../leaflet-icons';


// Importar Leaflet de forma estática
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface DeliveryUser {
  id: number;
  usuario: string;
  contrasena: string;
  rol: string;
  status: 'activo' | 'inactivo';
  ubicacion: string | null;
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule],
  templateUrl: './admin.html',
  styleUrls: ['./admin.css']
})
export class Admin implements OnInit, AfterViewInit, OnDestroy {
  showModal = false;
  private map: L.Map | undefined;
  deliveries: DeliveryUser[] = [];
  loading = true;

  selectedDelivery: string | null = null;
  paqueteUbicacion: string = '';

  private isBrowser: boolean;
  private socket!: Socket;

  // Mapa de marcadores por ID de delivery
  private markers: Map<number, L.Marker> = new Map();

  constructor(private http: HttpClient, @Inject(PLATFORM_ID) private platformId: Object) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    this.loadDeliveryData();
  }

  ngAfterViewInit(): void {
    if (!this.isBrowser) return;
    this.initMap();
    this.initSocket();
  }

  ngOnDestroy(): void {
    if (this.socket) this.socket.disconnect();
    if (this.map) this.map.remove();
  }

  private initSocket() {
    this.socket = io('https://72.60.31.237', {
      path: '/api/api/socket.io',
      transports: ['websocket']
    });

    // Escuchar cambios de ubicación en tiempo real
    this.socket.on('locationUpdated', (data: { userId: number; lat: number; lng: number }) => {
      const idx = this.deliveries.findIndex(d => d.id === data.userId);
      if (idx !== -1) {
        this.deliveries[idx].ubicacion = `${data.lat},${data.lng}`;
      }
      this.updateMapWithDeliveryData();
    });
  }

  private loadDeliveryData(): void {
    this.http.get<DeliveryUser[]>('https://72.60.31.237/proyecto2/api/api/deliveries').subscribe({
      next: (data) => {
        this.deliveries = data;
        this.loading = false;
        if (this.isBrowser && this.map) this.updateMapWithDeliveryData();
      },
      error: (err) => {
        console.error('Error cargando datos:', err);
        this.deliveries = [
          { id: 2, usuario: "erick", contrasena: "123456", rol: "delivery", status: "activo", ubicacion: "19.4326, -99.1332" },
          { id: 3, usuario: "pablito", contrasena: "123456", rol: "delivery", status: "inactivo", ubicacion: null }
        ];
        this.loading = false;
        if (this.isBrowser && this.map) this.updateMapWithDeliveryData();
      }
    });
  }

  private initMap(): void {
    if (!this.isBrowser) return;
    this.map = L.map('map').setView([19.4326, -99.1332], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);
  }

  private updateMapWithDeliveryData(): void {
    if (!this.isBrowser || !this.map) return;

    this.deliveries.forEach(d => {
      if (!d.ubicacion || d.status !== 'activo') {
        // Eliminar marcador si ya no es activo
        if (this.markers.has(d.id)) {
          this.map!.removeLayer(this.markers.get(d.id)!);
          this.markers.delete(d.id);
        }
        return;
      }

      const [lat, lng] = d.ubicacion.split(',').map(Number);

      if (this.markers.has(d.id)) {
        // Mover marcador existente
        this.markers.get(d.id)!.setLatLng([lat, lng]);
      } else {
        // Crear nuevo marcador
        const marker = L.marker([lat, lng]).addTo(this.map!).bindPopup(d.usuario);
        this.markers.set(d.id, marker);
      }
    });
  }

  getStatusText(status: string): string {
    return status === 'activo' ? 'working' : 'off';
  }

  openModal() {
    this.showModal = true;
    const activo = this.deliveries.find(d => d.status === 'activo');
    this.selectedDelivery = activo ? activo.usuario : null;
    this.paqueteUbicacion = '';
  }

  closeModal() {
    this.showModal = false;
  }

  asignarPaquete(): void {
    if (!this.selectedDelivery || !this.paqueteUbicacion) {
      alert('Selecciona un delivery y especifica la ubicación');
      return;
    }

    this.http.post('https://72.60.31.237/proyecto2/api/api/paquetes', {
      nombre_repartidor: this.selectedDelivery,
      direccion: this.paqueteUbicacion
    })
    .subscribe({
      next: () => {
        alert('Paquete asignado correctamente');
        this.closeModal();
        this.loadDeliveryData();
      },
      error: (err) => {
        console.error('Error asignando paquete:', err);
        alert('No se pudo asignar el paquete');
      }
    });
  }
}
