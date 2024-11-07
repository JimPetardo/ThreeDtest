import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, NgZone, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { LinkDialogComponent } from '../link-dialog/link-dialog.component';

@Component({
    selector: 'app-building-viewer',
    standalone: true,
    imports: [
        CommonModule,
        MatButtonModule,
        MatProgressSpinnerModule,
        LinkDialogComponent
    ],
    templateUrl: './building-viewer.component.html',
    styleUrls: ['./building-viewer.component.css']
})
export class BuildingViewerComponent implements OnInit, AfterViewInit, OnDestroy {
    @ViewChild('rendererContainer') rendererContainer!: ElementRef;

    private readonly LINK_SPHERE_RADIUS: number = 0.3;
    private readonly DEFAULT_CAMERA_POSITION = new THREE.Vector3(16.04, 40.73, -6.56);
    private readonly DEFAULT_CAMERA_TARGET = new THREE.Vector3(-4.66, 31.62, -2.41);

    private scene!: THREE.Scene;
    private camera!: THREE.PerspectiveCamera;
    private renderer!: THREE.WebGLRenderer;
    private controls!: OrbitControls;
    private animationId!: number;

    private buildingGroup = new THREE.Group();
    private markersGroup = new THREE.Group();

    private loader = new GLTFLoader();
    private building!: THREE.Object3D;

    public navigationHistory: string[] = ['building'];
    public currentFloor: THREE.Object3D | null = null;
    public isLinkMode: boolean = false;
    public isRemoveLinkMode: boolean = false;
    public isLoadingFloor: boolean = false;
    public currentObjectName: string = 'building';

    private linksByObject: Map<string, Array<{
        position: THREE.Vector3;
        target: string;
        marker: THREE.Mesh;
    }>> = new Map();

    private isInteractivitySetup: boolean = false;
    constructor(
        public dialog: MatDialog,
        private ngZone: NgZone,
        private snackBar: MatSnackBar
    ) { 
        window.addEventListener('keydown', (event) => {
            if (event.key.toLowerCase() === 'd') {
                this.debugCameraPosition();
            }
        });
    }

    ngOnInit(): void {
        console.log('BuildingViewerComponent ngOnInit');
    }

    ngAfterViewInit(): void {
        console.log('BuildingViewerComponent ngAfterViewInit - rendererContainer:', this.rendererContainer);
        this.initThreeJS();
        this.loadBuilding();
        window.addEventListener('resize', this.onWindowResize);
    }

    ngOnDestroy(): void {
        console.log('BuildingViewerComponent ngOnDestroy');
        cancelAnimationFrame(this.animationId);
        if (this.renderer) {
            this.renderer.dispose();
        }
        window.removeEventListener('resize', this.onWindowResize);
        window.removeEventListener('keydown', this.debugCameraPosition);
    }
    private loadBuilding(): void {
        if (this.buildingGroup.children.length > 0) {
            console.log('Building already loaded, skipping load.');
            return;
        }
    
        const buildingPath = 'assets/models/building4.glb';
        console.log(`Loading building model from: ${buildingPath}`);
    
        this.isLoadingFloor = true;
    
        this.loader.load(
            buildingPath,
            (gltf: GLTF) => {
                this.ngZone.run(() => {
                    console.log('Building model loaded successfully');
                    this.building = gltf.scene;
                    this.buildingGroup.add(this.building);
                    this.building.scale.set(20, 20, 20);
    
                    // Imposta la posizione iniziale della camera
                    this.camera.position.copy(this.DEFAULT_CAMERA_POSITION);
                    this.controls.target.copy(this.DEFAULT_CAMERA_TARGET);
                    this.controls.update();
    
                    // Mostra solo i marker dell'edificio principale
                    this.currentObjectName = 'building';
                    this.showMarkersForCurrentObject();
    
                    // Setup interattività e carica i link salvati
                    if (!this.isInteractivitySetup) {
                        this.setupInteractivity();
                        this.loadLinks();
                    }
    
                    this.isLoadingFloor = false;
                });
            },
            (progress) => {
                const percentComplete = Math.round((progress.loaded / progress.total) * 100);
                console.log(`Loading progress: ${percentComplete}%`);
            },
            (error: unknown) => {
                this.ngZone.run(() => {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    console.error('Error loading building model:', errorMessage);
                    this.snackBar.open(
                        `Errore nel caricamento del modello: ${errorMessage}`, 
                        'Chiudi', 
                        { duration: 5000 }
                    );
                    this.isLoadingFloor = false;
                });
            }
        );
    }
    private setupInteractivity(): void {
        if (this.isInteractivitySetup) {
            console.log('Interactivity already setup, skipping.');
            return;
        }
    
        try {
            // Aggiungi il listener per i click
            if (this.renderer && this.renderer.domElement) {
                this.renderer.domElement.addEventListener('click', this.onMouseClick);
                console.log('Mouse click event listener added successfully');
            } else {
                throw new Error('Renderer not properly initialized');
            }
    
            // Aggiungi il listener per il resize della finestra
            window.addEventListener('resize', this.onWindowResize);
            console.log('Window resize event listener added successfully');
    
            // Aggiungi il listener per il debug della camera (tasto 'D')
            window.addEventListener('keydown', (event) => {
                if (event.key.toLowerCase() === 'd') {
                    this.debugCameraPosition();
                }
            });
    
            this.isInteractivitySetup = true;
            console.log('Interactivity setup completed successfully');
    
        } catch (error) {
            console.error('Error during interactivity setup:', error);
            this.snackBar.open(
                'Errore durante la configurazione dell\'interattività',
                'Chiudi',
                { duration: 5000 }
            );
            this.isInteractivitySetup = false;
        }
    }
    private debugCameraPosition(): void {
        const position = this.camera.position.clone();
        const target = this.controls.target.clone();
        
        console.log('Camera Debug Info:');
        console.log('Position:', {
            x: position.x.toFixed(2),
            y: position.y.toFixed(2),
            z: position.z.toFixed(2)
        });
        console.log('Target:', {
            x: target.x.toFixed(2),
            y: target.y.toFixed(2),
            z: target.z.toFixed(2)
        });
        console.log('Copy-paste ready format:');
        console.log(`private readonly DEFAULT_CAMERA_POSITION = new THREE.Vector3(${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)});`);
        console.log(`private readonly DEFAULT_CAMERA_TARGET = new THREE.Vector3(${target.x.toFixed(2)}, ${target.y.toFixed(2)}, ${target.z.toFixed(2)});`);
    }

    private initThreeJS(): void {
        console.log('Initializing Three.js');
        
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xa0a0a0);
    
        const width = this.rendererContainer.nativeElement.clientWidth;
        const height = this.rendererContainer.nativeElement.clientHeight;
        this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
        this.camera.position.copy(this.DEFAULT_CAMERA_POSITION);
    
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(width, height);
        this.rendererContainer.nativeElement.appendChild(this.renderer.domElement);
    
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.target.copy(this.DEFAULT_CAMERA_TARGET);
        this.controls.update();
    
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444);
        hemiLight.position.set(0, 20, 0);
        this.scene.add(hemiLight);
    
        const dirLight = new THREE.DirectionalLight(0xffffff);
        dirLight.position.set(3, 10, 10);
        this.scene.add(dirLight);
    
        const ground = new THREE.Mesh(
            new THREE.PlaneGeometry(200, 200),
            new THREE.MeshPhongMaterial({ color: 0x999999, depthWrite: false })
        );
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);
    
        this.scene.add(this.buildingGroup);
        this.scene.add(this.markersGroup);
    
        this.animate();
    }
    private animate = (): void => {
        this.animationId = requestAnimationFrame(this.animate);
        this.controls.update();
    
        this.linksByObject.forEach(links => {
            links.forEach(link => {
                link.marker.rotation.y += 0.01;
            });
        });
    
        this.renderer.render(this.scene, this.camera);
    }
    private onMouseClick = (event: MouseEvent): void => {
        console.log('Mouse clicked:', event);
        event.preventDefault();

        const rect = this.renderer.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1
        );

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, this.camera);

        if (this.isLinkMode) {
            let intersects;
            if (this.currentFloor) {
                intersects = raycaster.intersectObject(this.currentFloor, true);
            } else {
                intersects = raycaster.intersectObject(this.buildingGroup, true);
            }

            if (intersects.length > 0) {
                const position = intersects[0].point;
                this.openLinkDialog(position);
            }
        } else if (this.isRemoveLinkMode) {
            const markerIntersects = raycaster.intersectObjects(this.markersGroup.children, true);

            if (markerIntersects.length > 0) {
                const clickedMarker = markerIntersects[0].object;
                const links = this.linksByObject.get(this.currentObjectName);
                if (links) {
                    const linkIndex = links.findIndex(l => l.marker === clickedMarker);
                    if (linkIndex !== -1) {
                        this.removeLink(linkIndex);
                    }
                }
            }
        } else {
            const markerIntersects = raycaster.intersectObjects(this.markersGroup.children, true);

            if (markerIntersects.length > 0) {
                const clickedMarker = markerIntersects[0].object;
                const links = this.linksByObject.get(this.currentObjectName);
                const link = links?.find(l => l.marker === clickedMarker);
                if (link) {
                    this.loadLinkedObject(link.target);
                }
            }
        }
    };

    private openLinkDialog(position: THREE.Vector3): void {
        const dialogRef = this.dialog.open(LinkDialogComponent, {
            width: '300px',
            data: { position }
        });

        dialogRef.afterClosed().subscribe((result: string | undefined) => {
            if (result) {
                this.createLink(position, result);
            }
            this.isLinkMode = false;
            this.renderer.domElement.classList.remove('link-mode');
        });
    }

    private createLink(position: THREE.Vector3, target: string): void {
        const geometry = new THREE.SphereGeometry(this.LINK_SPHERE_RADIUS, 16, 16);
        const material = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.8 });
        const sphere = new THREE.Mesh(geometry, material);
        sphere.position.copy(position);
        sphere.name = `linkMarker_${Date.now()}`;

        this.markersGroup.add(sphere);

        if (!this.linksByObject.has(this.currentObjectName)) {
            this.linksByObject.set(this.currentObjectName, []);
        }

        const links = this.linksByObject.get(this.currentObjectName)!;
        links.push({
            position: position.clone(),
            target: target,
            marker: sphere
        });

        this.saveLinks();
    }
    private loadLinkedObject(target: string): void {
        console.log('Loading linked object:', target);
        this.ngZone.run(() => {
            this.navigationHistory.push(target);

            if (this.currentFloor) {
                console.log('Removing currentFloor from the scene');
                this.scene.remove(this.currentFloor);
                this.currentFloor = null;
            }

            // Nascondi tutti i marker esistenti
            this.hideAllMarkers();

            const targetPath = `assets/models/${target}`;
            console.log(`Loading linked object from: ${targetPath}`);

            this.isLoadingFloor = true;

            this.loader.load(
                targetPath,
                (gltf: GLTF) => {
                    this.ngZone.run(() => {
                        console.log('Linked object loaded successfully');
                        this.currentFloor = gltf.scene;
                        this.scene.add(this.currentFloor!);

                        this.currentObjectName = target;
                        console.log('currentObjectName set to:', this.currentObjectName);

                        // Mostra solo i marker dell'oggetto corrente
                        this.showMarkersForCurrentObject();

                        const box = new THREE.Box3().setFromObject(this.currentFloor);
                        const size = box.getSize(new THREE.Vector3());
                        const center = box.getCenter(new THREE.Vector3());

                        const maxDim = Math.max(size.x, size.y, size.z);
                        const fov = this.camera.fov * (Math.PI / 180);
                        let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
                        cameraZ *= 1.5;

                        this.camera.position.set(center.x, center.y + 5, center.z + cameraZ);
                        this.camera.lookAt(center);
                        this.controls.target.copy(center);
                        this.controls.update();

                        this.isLoadingFloor = false;
                        this.buildingGroup.visible = false;
                    });
                },
                undefined,
                (error: unknown) => {
                    this.ngZone.run(() => {
                        if (error instanceof Error) {
                            console.error(`Errore nel caricamento del modello ${target}:`, error.message);
                            this.snackBar.open(`Errore: ${error.message}`, 'Chiudi', { duration: 5000 });
                        } else {
                            console.error(`Errore sconosciuto nel caricamento del modello ${target}:`, error);
                            this.snackBar.open('Errore sconosciuto nel caricamento del modello.', 'Chiudi', { duration: 5000 });
                        }
                        this.isLoadingFloor = false;
                    });
                }
            );
        });
    }

    private hideAllMarkers(): void {
        this.markersGroup.children.forEach(marker => {
            marker.visible = false;
        });
    }

    private showMarkersForCurrentObject(): void {
        const currentLinks = this.linksByObject.get(this.currentObjectName);
        this.markersGroup.children.forEach(marker => {
            const isMarkerForCurrentObject = currentLinks?.some(link => link.marker === marker);
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
        console.log('Links saved:', linksData);
    }

    private loadLinks(): void {
        const linksData = localStorage.getItem('linksByObject');
        if (linksData) {
            const parsedData = JSON.parse(linksData);
            Object.entries(parsedData).forEach(([objectName, links]) => {
                if (Array.isArray(links)) {
                    this.linksByObject.set(objectName, []); 
                    links.forEach(linkData => {
                        const position = new THREE.Vector3(...linkData.position);
                        const geometry = new THREE.SphereGeometry(this.LINK_SPHERE_RADIUS, 16, 16);
                        const material = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.8 });
                        const sphere = new THREE.Mesh(geometry, material);
                        sphere.position.copy(position);
                        sphere.name = `linkMarker_${Date.now()}`;

                        this.markersGroup.add(sphere);

                        this.linksByObject.get(objectName)!.push({
                            position: position,
                            target: linkData.target,
                            marker: sphere
                        });
                    });
                }
            });
            
            // Mostra solo i marker dell'oggetto corrente
            this.showMarkersForCurrentObject();
        }
    }

    public removeAllLinks(): void {
        // Rimuovi tutti i marker dalla scena
        while (this.markersGroup.children.length > 0) {
            this.markersGroup.remove(this.markersGroup.children[0]);
        }

        // Pulisci la Map dei link
        this.linksByObject.clear();

        // Pulisci il localStorage
        localStorage.removeItem('linksByObject');

        console.log('Rimossi tutti i link da tutti gli oggetti');
    }

    private removeLink(index: number): void {
        if (this.linksByObject.has(this.currentObjectName)) {
            const links = this.linksByObject.get(this.currentObjectName)!;
            if (index >= 0 && index < links.length) {
                const link = links[index];
                this.markersGroup.remove(link.marker);
                links.splice(index, 1);

                if (links.length === 0) {
                    this.linksByObject.delete(this.currentObjectName);
                }

                this.saveLinks();
            }
        }

        this.isRemoveLinkMode = false;
        this.renderer.domElement.classList.remove('remove-link-mode');
    }
    goBack(): void {
        if (this.navigationHistory.length > 1) {
            this.navigationHistory.pop();
            const previousObject = this.navigationHistory[this.navigationHistory.length - 1];
            
            if (previousObject === 'building') {
                this.resetToBuilding();
            } else {
                const tempHistory = [...this.navigationHistory];
                this.loadLinkedObject(previousObject);
                this.navigationHistory = tempHistory;
            }
        }
    }

    resetToBuilding(): void {
        console.log('Resetting to main building view');
        this.ngZone.run(() => {
            if (this.currentFloor) {
                console.log('Removing currentFloor from the scene');
                this.scene.remove(this.currentFloor);
                this.currentFloor = null;
            }

            if (this.buildingGroup.visible === false) {
                this.showBuildingAndMarkers();
            }

            this.camera.position.copy(this.DEFAULT_CAMERA_POSITION);
            this.controls.target.copy(this.DEFAULT_CAMERA_TARGET);
            this.controls.update();

            this.navigationHistory = ['building'];
        });
    }

    private showBuildingAndMarkers(): void {
        console.log('Showing buildingGroup and markersGroup');
        this.buildingGroup.visible = true;
        
        this.currentObjectName = 'building';
        console.log('currentObjectName reset to:', this.currentObjectName);

        this.showMarkersForCurrentObject();
    }
    private onWindowResize = (): void => {
        const width = this.rendererContainer.nativeElement.clientWidth;
        const height = this.rendererContainer.nativeElement.clientHeight;
    
        if (this.camera && this.renderer) {
            // Aggiorna l'aspect ratio della camera
            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
    
            // Aggiorna le dimensioni del renderer
            this.renderer.setSize(width, height);
            this.renderer.setPixelRatio(window.devicePixelRatio);
    
            // Forza un render della scena
            this.renderer.render(this.scene, this.camera);
        } else {
            console.warn('Camera o Renderer non inizializzati durante il ridimensionamento della finestra');
        }
    }
    enableLinkMode(): void {
        this.isLinkMode = true;
        this.isRemoveLinkMode = false;
        this.renderer.domElement.classList.add('link-mode');
        console.log('Modalità Link abilitata. Clicca su una parte dell\'oggetto corrente per creare un link.');
    }

    enableRemoveLinkMode(): void {
        this.isRemoveLinkMode = true;
        this.isLinkMode = false;
        this.renderer.domElement.classList.add('remove-link-mode');
        console.log('Modalità Rimuovi Link abilitata. Clicca su un link per rimuoverlo.');
    }
}