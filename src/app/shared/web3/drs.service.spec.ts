import { TestBed, inject } from '@angular/core/testing';

import { DrsService } from './drs.service';

describe('DrsService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [DrsService]
    });
  });

  it('should be created', inject([DrsService], (service: DrsService) => {
    expect(service).toBeTruthy();
  }));
});
