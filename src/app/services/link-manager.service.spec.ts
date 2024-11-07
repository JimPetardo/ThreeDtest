import { TestBed } from '@angular/core/testing';

import { LinkManagerService } from './link-manager.service';

describe('LinkManagerService', () => {
  let service: LinkManagerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LinkManagerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
