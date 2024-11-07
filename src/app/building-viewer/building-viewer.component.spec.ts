import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BuildingViewerComponent } from './building-viewer.component';

describe('BuildingViewerComponent', () => {
  let component: BuildingViewerComponent;
  let fixture: ComponentFixture<BuildingViewerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BuildingViewerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BuildingViewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
