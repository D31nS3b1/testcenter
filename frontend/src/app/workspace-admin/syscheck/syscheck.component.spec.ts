import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { HttpClientModule } from '@angular/common/http';
import { MatLegacyDialogModule as MatDialogModule } from '@angular/material/legacy-dialog';
import { MatLegacySnackBarModule as MatSnackBarModule } from '@angular/material/legacy-snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatLegacyTableModule as MatTableModule } from '@angular/material/legacy-table';
import { MatLegacyCheckboxModule as MatCheckboxModule } from '@angular/material/legacy-checkbox';
import { Observable, of } from 'rxjs';
import { SyscheckComponent } from './syscheck.component';
import { BackendService } from '../backend.service';
import { WorkspaceDataService } from '../workspacedata.service';
import { SysCheckStatistics } from '../workspace.interfaces';

class MockBackendService {
  // eslint-disable-next-line class-methods-use-this
  getSysCheckReportList(): Observable<SysCheckStatistics[]> {
    return of([{
      id: 'sys-check-id',
      label: 'a sys check',
      count: 123,
      details: []
    }]);
  }
}

describe('Workspace-Admin: SyscheckComponent', () => {
  let component: SyscheckComponent;
  let fixture: ComponentFixture<SyscheckComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [SyscheckComponent],
      imports: [
        HttpClientModule,
        MatDialogModule,
        MatSnackBarModule,
        MatIconModule,
        MatTableModule,
        MatCheckboxModule
      ],
      providers: [
        {
          provide: BackendService,
          useValue: new MockBackendService()
        },
        WorkspaceDataService
      ]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SyscheckComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
