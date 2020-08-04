import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { EditworkspaceComponent } from './editworkspace.component';
import {ReactiveFormsModule} from '@angular/forms';
import {MAT_DIALOG_DATA, MatDialog, MatDialogModule} from '@angular/material/dialog';
import {MatInputModule} from '@angular/material/input';
import {MatFormFieldModule} from '@angular/material/form-field';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';

describe('EditworkspaceComponent', () => {
  let component: EditworkspaceComponent;
  let fixture: ComponentFixture<EditworkspaceComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ EditworkspaceComponent ],
      imports: [
        MatDialogModule,
        ReactiveFormsModule,
        MatInputModule,
        MatFormFieldModule,
        NoopAnimationsModule
      ],
      providers: [
        MatDialog,
        { provide: MAT_DIALOG_DATA, useValue: 'VERA 2020' }
      ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(EditworkspaceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
