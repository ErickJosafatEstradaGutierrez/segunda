import { Component, signal, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';

interface Paquete {
  id: number;
  direccion: string;
  status: 'En tránsito' | 'Entregado' | 'Regresado';
}

@Component({
  selector: 'app-delivery',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './delivery.html',
  styleUrls: ['./delivery.css']
})
export class Delivery implements AfterViewInit {
  paquetes = signal<Paquete[]>([
    { id: 1, direccion: 'Av. Reforma 123, CDMX', status: 'En tránsito' },
    { id: 2, direccion: 'Calle Hidalgo 456, Puebla', status: 'Entregado' },
    { id: 3, direccion: 'Blvd. López Mateos 789, GDL', status: 'Regresado' }
  ]);

  private map!: L.Map;
  private marker!: L.Marker;

  cambiarEstado(paquete: Paquete, event: Event) {
    const select = event.target as HTMLSelectElement | null;
    if (!select) return;
    const nuevoEstado = select.value as Paquete['status'];

    this.paquetes.update(lista => {
      const idx = lista.findIndex(p => p.id === paquete.id);
      if (idx === -1) return lista;
      const copia = [...lista];
      copia[idx] = { ...copia[idx], status: nuevoEstado };
      return copia;
    });
  }

  ngAfterViewInit(): void {
    // Inicializa el mapa en un punto por defecto
    this.map = L.map('map').setView([19.4326, -99.1332], 13); // CDMX como default

    // Añade capa de mapas (OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);

    // Intenta obtener la ubicación actual del usuario
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const latlng = [pos.coords.latitude, pos.coords.longitude] as [number, number];
          this.map.setView(latlng, 15);

          // Añade marcador en la ubicación actual
          if (this.marker) {
            this.marker.setLatLng(latlng);
          } else {
            this.marker = L.marker(latlng).addTo(this.map).bindPopup('Tu ubicación actual').openPopup();
          }
        },
        (err) => {
          console.warn(`Error obteniendo ubicación: ${err.message}`);
        }
      );
    } else {
      console.warn('Geolocalización no está disponible en este navegador.');
    }
  }
}
