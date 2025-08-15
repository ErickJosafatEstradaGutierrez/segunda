import { Component, signal, AfterViewInit, Inject, PLATFORM_ID, OnDestroy } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { io, Socket } from 'socket.io-client';

interface Paquete {
  id: number;
  nombre_repartidor: string | null;
  direccion: string;
  status: 'En tránsito' | 'Entregado' | 'Regresado';
}

interface Repartidor {
  id: number;
  nombre: string;
  status: 'activo' | 'off';
}

@Component({
  selector: 'app-delivery',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  templateUrl: './delivery.html',
  styleUrls: ['./delivery.css']
})
export class Delivery implements AfterViewInit, OnDestroy {
  paquetes = signal<Paquete[]>([]);
  repartidorActual: Repartidor = { id: 2, nombre: 'Repartidor fijo', status: 'off' };

  private map: any;
  private marker: any;
  private watchId: number | null = null;
  private L: any;
  private accuracyCircle: any;
  private socket!: Socket;
  private intervalId: any;

  constructor(private http: HttpClient, @Inject(PLATFORM_ID) private platformId: Object) {}

  async ngAfterViewInit(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    this.L = await import('leaflet');
    this.initMap();
    this.cargarPaquetes();

    // Conectar Socket.IO
    this.socket = io('https://72.60.31.237', {
      path: '/api/socket.io',
      transports: ['websocket']
    });

    // Enviar ubicación cada 10 segundos
    this.intervalId = setInterval(() => this.enviarUbicacion(), 10000);
  }

  private cargarPaquetes(): void {
    this.http.get<Paquete[]>('https://72.60.31.237/api/paquetes')
      .subscribe({
        next: data => this.paquetes.set(data),
        error: err => console.error('Error cargando paquetes:', err)
      });
  }

  toggleWorking(): void {
    const nuevoEstado: 'activo' | 'off' = this.repartidorActual.status === 'activo' ? 'off' : 'activo';

    this.http.patch(`https://72.60.31.237/api/usuarios/${this.repartidorActual.id}/status`, { status: nuevoEstado })
      .subscribe({
        next: () => this.repartidorActual.status = nuevoEstado,
        error: err => console.error('Error actualizando estado del repartidor:', err)
      });
  }

  cambiarEstado(paquete: Paquete, event: Event) {
    const select = event.target as HTMLSelectElement;
    const nuevoEstado = select.value as Paquete['status'];

    // Frontend
    this.paquetes.update(lista => {
      const idx = lista.findIndex(p => p.id === paquete.id);
      if (idx === -1) return lista;
      const copia = [...lista];
      copia[idx] = { ...copia[idx], status: nuevoEstado };
      return copia;
    });

    // Backend
    this.http.patch(`https://72.60.31.237/api/paquetes/${paquete.id}`, { status: nuevoEstado })
      .subscribe({
        next: () => console.log('Estado actualizado correctamente'),
        error: err => console.error('Error actualizando estado:', err)
      });
  }

  private initMap(): void {
    this.map = this.L.map('map').setView([19.4326, -99.1332], 13);
    this.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);

    if (navigator.geolocation) {
      this.watchId = navigator.geolocation.watchPosition(
        pos => this.actualizarUbicacion(pos),
        err => console.warn(err),
        { enableHighAccuracy: true }
      );
    }
  }

  private actualizarUbicacion(pos: GeolocationPosition) {
    const latlng: [number, number] = [pos.coords.latitude, pos.coords.longitude];
    this.map.setView(latlng, 15);

    if (this.marker) this.marker.setLatLng(latlng);
    else this.marker = this.L.marker(latlng).addTo(this.map).bindPopup('Tu ubicación actual').openPopup();

    if (this.accuracyCircle) this.map.removeLayer(this.accuracyCircle);
    this.accuracyCircle = this.L.circle(latlng, {
      radius: pos.coords.accuracy,
      fillColor: '#136AEC',
      fillOpacity: 0.15,
      color: '#136AEC',
      weight: 1
    }).addTo(this.map);
  }

  private enviarUbicacion() {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(pos => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      // Emitir la ubicación via Socket.IO
      this.socket.emit('updateLocation', {
        userId: this.repartidorActual.id,
        lat,
        lng
      });

      console.log(`Ubicación enviada: ${lat}, ${lng}`);
    });
  }

  ngOnDestroy(): void {
    if (this.watchId) navigator.geolocation.clearWatch(this.watchId);
    if (this.map) this.map.remove();
    if (this.intervalId) clearInterval(this.intervalId);
    if (this.socket) this.socket.disconnect();
  }
}