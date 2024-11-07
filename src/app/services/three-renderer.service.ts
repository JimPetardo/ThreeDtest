import { Injectable } from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

@Injectable({
  providedIn: 'root'
})
export class ThreeRendererService {
  public scene!: THREE.Scene;
  public camera!: THREE.PerspectiveCamera;
  public renderer!: THREE.WebGLRenderer;
  public controls!: OrbitControls;
  private animationId!: number;

  private readonly DEFAULT_CAMERA_POSITION = new THREE.Vector3(16.04, 40.73, -6.56);
  private readonly DEFAULT_CAMERA_TARGET = new THREE.Vector3(-4.66, 31.62, -2.41);

  constructor() { }

  public initialize(container: HTMLElement): void {
    this.initScene(container);
    this.setupLights();
    this.setupGround();
    this.startAnimation();
  }

  private initScene(container: HTMLElement): void {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xa0a0a0);

    const width = container.clientWidth;
    const height = container.clientHeight;

    this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    this.camera.position.copy(this.DEFAULT_CAMERA_POSITION);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(width, height);
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.target.copy(this.DEFAULT_CAMERA_TARGET);
    this.controls.update();
  }

  private setupLights(): void {
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444);
    hemiLight.position.set(0, 20, 0);
    this.scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff);
    dirLight.position.set(3, 10, 10);
    this.scene.add(dirLight);
  }

  private setupGround(): void {
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(200, 200),
      new THREE.MeshPhongMaterial({ color: 0x999999, depthWrite: false })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  public startAnimation(): void {
    this.animate();
  }
  public getDefaultCameraTarget(): THREE.Vector3 {
    return this.DEFAULT_CAMERA_TARGET.clone();
  }
  public getDefaultCameraPosition(): THREE.Vector3 {
    return this.DEFAULT_CAMERA_POSITION.clone();
  }
  public stopAnimation(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }

  public onWindowResize(container: HTMLElement): void {
    const width = container.clientWidth;
    const height = container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    this.stopAnimation();
    if (this.renderer) {
      this.renderer.dispose();
    }
  }
}