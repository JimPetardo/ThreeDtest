import { Injectable } from '@angular/core';
import * as THREE from 'three';
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Observable, from } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class ModelLoaderService {
    private loader = new GLTFLoader();
    private buildingGroup = new THREE.Group();
    private currentFloor: THREE.Object3D | null = null;

    constructor() {}

    public loadBuilding(buildingPath: string): Observable<THREE.Group> {
        return from(new Promise<THREE.Group>((resolve, reject) => {
            if (this.buildingGroup.children.length > 0) {
                resolve(this.buildingGroup);
                return;
            }

            this.loader.load(
                buildingPath,
                (gltf: GLTF) => {
                    const building = gltf.scene;
                    this.buildingGroup.add(building);
                    building.scale.set(20, 20, 20);
                    resolve(this.buildingGroup);
                },
                undefined,
                reject
            );
        }));
    }

    public loadFloor(floorPath: string): Observable<THREE.Object3D> {
        return from(new Promise<THREE.Object3D>((resolve, reject) => {
            this.loader.load(
                floorPath,
                (gltf: GLTF) => {
                    this.currentFloor = gltf.scene;
                    resolve(this.currentFloor);
                },
                undefined,
                reject
            );
        }));
    }

    public getCurrentFloor(): THREE.Object3D | null {
        return this.currentFloor;
    }

    public getBuildingGroup(): THREE.Group {
        return this.buildingGroup;
    }

    public clearCurrentFloor(): void {
        this.currentFloor = null;
    }

    public calculateCameraPosition(object: THREE.Object3D, camera: THREE.PerspectiveCamera): {
        position: THREE.Vector3,
        target: THREE.Vector3
    } {
        const box = new THREE.Box3().setFromObject(object);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());

        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = camera.fov * (Math.PI / 180);
        let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
        cameraZ *= 1.5;

        return {
            position: new THREE.Vector3(center.x, center.y + 5, center.z + cameraZ),
            target: center
        };
    }

    public showBuilding(show: boolean): void {
        this.buildingGroup.visible = show;
    }

    public isBuildingVisible(): boolean {
        return this.buildingGroup.visible;
    }
}