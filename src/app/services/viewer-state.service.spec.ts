import { TestBed } from '@angular/core/testing';

import { ViewerStateService } from './viewer-state.service';

describe('ViewerStateService', () => {
  let service: ViewerStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ViewerStateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
