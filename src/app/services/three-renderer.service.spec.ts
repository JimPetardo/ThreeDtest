import { TestBed } from '@angular/core/testing';

import { ThreeRendererService } from './three-renderer.service';

describe('ThreeRendererService', () => {
  let service: ThreeRendererService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ThreeRendererService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
