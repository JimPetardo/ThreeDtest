import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, NgZone, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import * as THREE from 'three';
import { LinkDialogComponent } from '../link-dialog/link-dialog.component';
import { LinkManagerService } from '../services/link-manager.service';
import { ModelLoaderService } from '../services/model-loader.service';
import { ThreeRendererService } from '../services/three-renderer.service';
import { ViewerStateService } from '../services/viewer-state.service';
import { MatIconModule } from '@angular/material/icon';


@Component({
    selector: 'app-building-viewer',
    standalone: true,
    imports: [
        CommonModule,
        MatIconModule,
        MatButtonModule,
        MatProgressSpinnerModule,
        LinkDialogComponent
    ],
    templateUrl: './building-viewer.component.html',
    styleUrls: ['./building-viewer.component.css']
})
export class BuildingViewerComponent implements OnInit, AfterViewInit, OnDestroy {
    @ViewChild('rendererContainer') rendererContainer!: ElementRef;

    private destroy$ = new Subject<void>();
    public isLinkMode = false;
    public isRemoveLinkMode = false;
    public isLoadingFloor = false;

    constructor(
        private threeRenderer: ThreeRendererService,
        private linkManager: LinkManagerService,
        private modelLoader: ModelLoaderService,
        private viewerState: ViewerStateService,
        private dialog: MatDialog,
        private ngZone: NgZone,
        private snackBar: MatSnackBar
    ) {
        this.setupStateSubscriptions();
    }

    private setupStateSubscriptions(): void {
        this.viewerState.linkMode$.pipe(
            takeUntil(this.destroy$)
        ).subscribe(mode => this.isLinkMode = mode);

        this.viewerState.removeLinkMode$.pipe(
            takeUntil(this.destroy$)
        ).subscribe(mode => this.isRemoveLinkMode = mode);

        this.viewerState.loadingFloor$.pipe(
            takeUntil(this.destroy$)
        ).subscribe(loading => this.isLoadingFloor = loading);
    }

    ngOnInit(): void {
        console.log('BuildingViewerComponent ngOnInit');
    }

    ngAfterViewInit(): void {
        this.threeRenderer.initialize(this.rendererContainer.nativeElement);
        this.threeRenderer.scene.add(this.linkManager.markersGroup);
        this.threeRenderer.scene.add(this.modelLoader.getBuildingGroup());

        this.loadInitialBuilding();
        this.setupInteractivity();

        window.addEventListener('resize', this.onWindowResize);
    }
    get navigationHistoryLength(): number {
        return this.viewerState.getNavigationHistory().length;
    }
    private loadInitialBuilding(): void {
        this.viewerState.setLoadingFloor(true);
        const buildingPath = 'assets/models/building4.glb';

        this.modelLoader.loadBuilding(buildingPath).subscribe({
            next: () => {
                this.linkManager.loadLinks();
                this.linkManager.showMarkersForObject('building');
                this.viewerState.setLoadingFloor(false);
            },
            error: (error) => {
                console.error('Error loading building:', error);
                this.snackBar.open(
                    `Errore nel caricamento del modello: ${error}`,
                    'Chiudi',
                    { duration: 5000 }
                );
                this.viewerState.setLoadingFloor(false);
            }
        });
    }

    private setupInteractivity(): void {
        this.threeRenderer.renderer.domElement.addEventListener('click', this.onMouseClick);
    }

    private onMouseClick = (event: MouseEvent): void => {
        event.preventDefault();

        const rect = this.threeRenderer.renderer.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1
        );

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, this.threeRenderer.camera);

        if (this.isLinkMode) {
            this.handleLinkModeClick(raycaster);
        } else if (this.isRemoveLinkMode) {
            this.handleRemoveLinkModeClick(raycaster);
        } else {
            this.handleNormalClick(raycaster);
        }
    };

    private handleLinkModeClick(raycaster: THREE.Raycaster): void {
        const currentObject = this.modelLoader.getCurrentFloor() || this.modelLoader.getBuildingGroup();
        const intersects = raycaster.intersectObject(currentObject, true);

        if (intersects.length > 0) {
            this.openLinkDialog(intersects[0].point);
        }
    }
    private handleRemoveLinkModeClick(raycaster: THREE.Raycaster): void {
        const markerIntersects = raycaster.intersectObjects(this.linkManager.markersGroup.children, true);

        if (markerIntersects.length > 0) {
            const clickedMarker = markerIntersects[0].object;
            const currentObjectName = this.viewerState.currentObject; // Usando il getter suggerito
            const links = this.linkManager.getLinksForObject(currentObjectName);
            const linkIndex = links.findIndex(l => l.marker === clickedMarker);

            if (linkIndex !== -1) {
                this.linkManager.removeLink(linkIndex, currentObjectName);
            }
        }
    }
    private handleNormalClick(raycaster: THREE.Raycaster): void {
        const markerIntersects = raycaster.intersectObjects(this.linkManager.markersGroup.children, true);

        if (markerIntersects.length > 0) {
            const clickedMarker = markerIntersects[0].object;
            const currentObjectName = this.viewerState.currentObject; // Usando il getter invece di currentObject$
            const links = this.linkManager.getLinksForObject(currentObjectName);
            const link = links.find(l => l.marker === clickedMarker);

            if (link) {
                this.loadLinkedObject(link.target);
            }
        }
    }

    private openLinkDialog(position: THREE.Vector3): void {
        const dialogRef = this.dialog.open(LinkDialogComponent, {
            width: '300px',
            data: { position }
        });

        dialogRef.afterClosed().subscribe((result: string | undefined) => {
            if (result) {
                const currentObjectName = this.viewerState.currentObject; // Assumendo che esista questa proprietà
                this.linkManager.createLink(position, result, currentObjectName);
            }
            this.viewerState.setLinkMode(false);
        });
    }
    private loadLinkedObject(target: string): void {
        this.ngZone.run(() => {
            this.viewerState.addToHistory(target);
            this.viewerState.setLoadingFloor(true);

            const cleanTarget = target.replace('.glb', '');
            const targetPath = `assets/models/${cleanTarget}.glb`;

            // Prima rimuoviamo tutto
            this.cleanupCurrentObjects();

            this.modelLoader.loadFloor(targetPath).subscribe({
                next: (floor) => {
                    // Aggiungi il nuovo piano alla scena
                    this.threeRenderer.scene.add(floor);

                    // Calcola e imposta la nuova posizione della camera
                    const cameraSetup = this.modelLoader.calculateCameraPosition(
                        floor,
                        this.threeRenderer.camera
                    );

                    // Aggiorna la posizione della camera e il punto di mira
                    this.threeRenderer.camera.position.copy(cameraSetup.position);
                    this.threeRenderer.controls.target.copy(cameraSetup.target);
                    this.threeRenderer.controls.update();

                    // Mostra i marker per il nuovo oggetto
                    this.linkManager.showMarkersForObject(target);
                    this.viewerState.setLoadingFloor(false);
                },
                error: (error) => {
                    console.error(`Error loading floor ${target}:`, error);
                    this.snackBar.open(
                        `Errore nel caricamento del piano: ${error}`,
                        'Chiudi',
                        { duration: 5000 }
                    );
                    this.viewerState.setLoadingFloor(false);
                }
            });
        });
    }
    private cleanupCurrentObjects(): void {
        // Rimuovi il piano corrente se esiste
        if (this.modelLoader.getCurrentFloor()) {
            this.threeRenderer.scene.remove(this.modelLoader.getCurrentFloor()!);
            this.modelLoader.clearCurrentFloor();
        }
    
        // Nascondi l'edificio principale
        this.modelLoader.showBuilding(false);
    
        // Rimuoviamo la riga che elimina i marker
        // this.linkManager.removeAllLinks();  <-- Rimuoviamo questa riga
    }

    public goBack(): void {
        const previousObject = this.viewerState.goBack();
        if (previousObject) {
            if (previousObject === 'building') {
                this.resetToBuilding();
            } else {
                this.loadLinkedObject(previousObject);
            }
        }
    }
    public resetToBuilding(): void {
        this.ngZone.run(() => {
            // Pulisci tutto prima
            this.cleanupCurrentObjects();

            // Mostra l'edificio
            this.modelLoader.showBuilding(true);

            // Resetta la camera alla posizione iniziale
            this.threeRenderer.camera.position.copy(this.threeRenderer.getDefaultCameraPosition());
            this.threeRenderer.controls.target.copy(this.threeRenderer.getDefaultCameraTarget());
            this.threeRenderer.controls.update();

            // Aggiorna lo stato e mostra i marker dell'edificio
            this.viewerState.resetToBuilding();
            this.linkManager.showMarkersForObject('building');
        });
    }

    private onWindowResize = (): void => {
        this.threeRenderer.onWindowResize(this.rendererContainer.nativeElement);
    }

    public enableLinkMode(): void {
        this.viewerState.setLinkMode(true);
        this.threeRenderer.renderer.domElement.classList.add('link-mode');
    }

    public enableRemoveLinkMode(): void {
        this.viewerState.setRemoveLinkMode(true);
        this.threeRenderer.renderer.domElement.classList.add('remove-link-mode');
    }

    public removeAllLinks(): void {
        this.linkManager.removeAllLinks();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();

        this.threeRenderer.dispose();
        window.removeEventListener('resize', this.onWindowResize);
        this.threeRenderer.renderer.domElement.removeEventListener('click', this.onMouseClick);
    }
}