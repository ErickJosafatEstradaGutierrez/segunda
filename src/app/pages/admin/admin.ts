import { Component, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin.html',
  styleUrls: ['./admin.css']
})
export class Admin implements AfterViewInit {
  showModal = false;
  private map: any; // usa tipo any porque importas dinámicamente
  private L: any; // Leaflet reference

  openModal() {
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
  }

  async ngAfterViewInit(): Promise<void> {
    // Importa leaflet dinámicamente solo en cliente
    this.L = await import('leaflet');

    this.initMap();
  }

  private initMap(): void {
    this.map = this.L.map('map').setView([19.4326, -99.1332], 13);

    this.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);

    this.L.marker([19.4326, -99.1332]).addTo(this.map).bindPopup('Erick').openPopup();
    this.L.marker([19.45, -99.14]).addTo(this.map).bindPopup('Otro');
  }
}
