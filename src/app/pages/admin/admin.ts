import { Component, OnInit, AfterViewInit, Inject, PLATFORM_ID, OnDestroy } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { io, Socket } from 'socket.io-client';

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
  private map: any;
  private L: any;
  deliveries: DeliveryUser[] = [];
  loading = true;

  selectedDelivery: string | null = null;
  paqueteUbicacion: string = '';

  private isBrowser: boolean;
  private socket!: Socket;

  // Mapa de marcadores por ID de delivery
  private markers: Map<number, any> = new Map();

  constructor(private http: HttpClient, @Inject(PLATFORM_ID) private platformId: Object) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    this.loadDeliveryData();
  }

  async ngAfterViewInit(): Promise<void> {
    if (!this.isBrowser) return;
    this.L = await import('leaflet');
    this.initMap();
    this.initSocket();
  }

  ngOnDestroy(): void {
    if (this.socket) this.socket.disconnect();
  }

  private initSocket() {
    this.socket = io('http://72.60.31.237');

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
    this.http.get<DeliveryUser[]>('http://72.60.31.237:4000/usuarios?rol=delivery').subscribe({
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
    this.map = this.L.map('map').setView([19.4326, -99.1332], 13);
    this.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);
  }

  private updateMapWithDeliveryData(): void {
    if (!this.isBrowser || !this.map) return;

    this.deliveries.forEach(d => {
      if (!d.ubicacion || d.status !== 'activo') {
        // Eliminar marcador si ya no es activo
        if (this.markers.has(d.id)) {
          this.map.removeLayer(this.markers.get(d.id));
          this.markers.delete(d.id);
        }
        return;
      }

      const [lat, lng] = d.ubicacion.split(',').map(Number);

      if (this.markers.has(d.id)) {
        // Mover marcador existente
        this.markers.get(d.id).setLatLng([lat, lng]);
      } else {
        // Crear nuevo marcador
        const marker = this.L.marker([lat, lng]).addTo(this.map).bindPopup(d.usuario);
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

    this.http.post('http://72.60.31.237:4000/paquetes', {
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
