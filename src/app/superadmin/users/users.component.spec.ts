import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { HttpClientModule } from '@angular/common/http';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { Observable, of } from 'rxjs';
import { BackendService } from '../backend.service';
import { UsersComponent } from './users.component';
import { MainDataService } from '../../maindata.service';
import { UserData } from '../superadmin.interfaces';

class MockBackendService {
  // eslint-disable-next-line class-methods-use-this
  getUsers(): Observable<UserData[]> {
    return of([{
      id: 0,
      name: 'agent 00',
      email: 'agent@doublezero.de',
      isSuperadmin: true,
      selected: true
    }]);
  }
}

describe('UsersComponent', () => {
  let component: UsersComponent;
  let fixture: ComponentFixture<UsersComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [UsersComponent],
      imports: [
        HttpClientModule,
        MatDialogModule,
        MatSnackBarModule,
        MatTableModule,
        MatCheckboxModule,
        MatIconModule
      ],
      providers: [
        {
          provide: BackendService,
          useValue: new MockBackendService()
        },
        MainDataService
      ]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(UsersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
