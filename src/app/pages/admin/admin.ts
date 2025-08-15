import { Component, OnInit, AfterViewInit, Inject, PLATFORM_ID, OnDestroy } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

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
  private map: any; // Leaflet.Map dinámico
  deliveries: DeliveryUser[] = [];
  loading = true;

  selectedDelivery: string | null = null;
  paqueteUbicacion: string = '';

  private isBrowser: boolean;
  private socket: any;
  private L: any; // Leaflet import dinámico
  private markers: Map<number, any> = new Map(); // Leaflet.Marker dinámicos

  constructor(private http: HttpClient, @Inject(PLATFORM_ID) private platformId: Object) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  async ngAfterViewInit(): Promise<void> {
    if (!this.isBrowser) return;

    // Import dinámico de Leaflet solo en navegador
    this.L = (await import('leaflet')).default;

    // Configurar íconos de Leaflet con URLs externas
    delete (this.L.Icon.Default.prototype as any)._getIconUrl;
    this.L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
    });

    this.initMap();
    await this.initSocket();
  }

  ngOnInit(): void {
    this.loadDeliveryData();
  }

  ngOnDestroy(): void {
    if (this.socket) this.socket.disconnect();
    if (this.map) this.map.remove();
  }

  private async initSocket() {
    if (!this.isBrowser) return;

    const { io } = await import('socket.io-client');
    this.socket = io('https://72.60.31.237', {
      path: '/proyecto2/api/api/socket.io',
      transports: ['websocket']
    });

    this.socket.on('locationUpdated', (data: { userId: number; lat: number; lng: number }) => {
      const idx = this.deliveries.findIndex(d => d.id === data.userId);
      if (idx !== -1) this.deliveries[idx].ubicacion = `${data.lat},${data.lng}`;
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
        // Datos de prueba
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
        if (this.markers.has(d.id)) {
          this.map.removeLayer(this.markers.get(d.id));
          this.markers.delete(d.id);
        }
        return;
      }

      const [lat, lng] = d.ubicacion.split(',').map(Number);

      if (this.markers.has(d.id)) {
        this.markers.get(d.id).setLatLng([lat, lng]);
      } else {
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

    this.http.post('https://72.60.31.237/proyecto2/api/api/paquetes', {
      nombre_repartidor: this.selectedDelivery,
      direccion: this.paqueteUbicacion
    }).subscribe({
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
