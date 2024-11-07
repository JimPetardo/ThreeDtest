import { Injectable } from '@angular/core';
import * as THREE from 'three';

export interface Link {
    position: THREE.Vector3;
    target: string;
    marker: THREE.Mesh;
}

@Injectable({
    providedIn: 'root'
})
export class LinkManagerService {
    private linksByObject: Map<string, Array<Link>> = new Map();
    public markersGroup = new THREE.Group();
    private readonly LINK_SPHERE_RADIUS: number = 0.3;

    constructor() {}

    public createLink(position: THREE.Vector3, target: string, currentObject: string): void {
        const sphere = this.createMarkerSphere(position);
        this.markersGroup.add(sphere);

        if (!this.linksByObject.has(currentObject)) {
            this.linksByObject.set(currentObject, []);
        }

        const links = this.linksByObject.get(currentObject)!;
        links.push({ position: position.clone(), target, marker: sphere });
        
        this.saveLinks();
    }

    private createMarkerSphere(position: THREE.Vector3): THREE.Mesh {
        const geometry = new THREE.SphereGeometry(this.LINK_SPHERE_RADIUS, 16, 16);
        const material = new THREE.MeshBasicMaterial({ 
            color: 0xff0000, 
            transparent: true, 
            opacity: 0.8 
        });
        const sphere = new THREE.Mesh(geometry, material);
        sphere.position.copy(position);
        sphere.name = `linkMarker_${Date.now()}`;
        return sphere;
    }

    public removeLink(index: number, currentObject: string): void {
        if (this.linksByObject.has(currentObject)) {
            const links = this.linksByObject.get(currentObject)!;
            if (index >= 0 && index < links.length) {
                const link = links[index];
                this.markersGroup.remove(link.marker);
                links.splice(index, 1);

                if (links.length === 0) {
                    this.linksByObject.delete(currentObject);
                }

                this.saveLinks();
            }
        }
    }

    public removeAllLinks(): void {
        while (this.markersGroup.children.length > 0) {
            this.markersGroup.remove(this.markersGroup.children[0]);
        }
        this.linksByObject.clear();
        localStorage.removeItem('linksByObject');
    }

    public getLinksForObject(objectName: string): Array<Link> {
        return this.linksByObject.get(objectName) || [];
    }

    public showMarkersForObject(objectName: string): void {
        const currentLinks = this.linksByObject.get(objectName);
        this.markersGroup.children.forEach(marker => {
            const isMarkerForCurrentObject = currentLinks?.some(
                link => link.marker === marker
            );
            marker.visible = !!isMarkerForCurrentObject;
        });
    }

    private saveLinks(): void {
        const linksData: { [key: string]: Array<{ position: number[], target: string }> } = {};

        this.linksByObject.forEach((links, objectName) => {
            linksData[objectName] = links.map(link => ({
                position: link.position.toArray(),
                target: link.target
            }));
        });

        localStorage.setItem('linksByObject', JSON.stringify(linksData));
    }

    public loadLinks(): void {
      const linksData = localStorage.getItem('linksByObject');
      if (linksData) {
          const parsedData = JSON.parse(linksData);
          Object.entries(parsedData).forEach(([objectName, links]) => {
              if (Array.isArray(links)) {
                  this.linksByObject.set(objectName, []); 
                  links.forEach(linkData => {
                      const position = new THREE.Vector3(...(linkData.position as number[]));
                      const sphere = this.createMarkerSphere(position);
                      this.markersGroup.add(sphere);

                      this.linksByObject.get(objectName)!.push({
                          position: position,
                          target: linkData.target,
                          marker: sphere
                      });
                  });
              }
          });
      }
  }

    public updateMarkerAnimations(): void {
        this.linksByObject.forEach(links => {
            links.forEach(link => {
                link.marker.rotation.y += 0.01;
            });
        });
    }
}