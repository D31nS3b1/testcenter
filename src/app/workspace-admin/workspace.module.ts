import { FlexLayoutModule } from '@angular/flex-layout';
import { ReactiveFormsModule } from '@angular/forms';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatGridListModule } from '@angular/material/grid-list';

import { IqbComponentsModule } from 'iqb-components';
import { BackendService } from './backend.service';
import { WorkspaceDataService } from './workspacedata.service';
import { WorkspaceRoutingModule } from './workspace-routing.module';
import { WorkspaceComponent } from './workspace.component';
import { FilesComponent } from './files/files.component';
import { ResultsComponent } from './results/results.component';
import { SyscheckComponent } from './syscheck/syscheck.component';
import { IqbFilesModule } from './files/iqb-files';
import { AlertModule } from '../shared/alert/alert.module';

@NgModule({
  imports: [
    CommonModule,
    WorkspaceRoutingModule,
    MatTableModule,
    MatTabsModule,
    MatIconModule,
    MatSelectModule,
    MatCheckboxModule,
    MatSortModule,
    MatCardModule,
    MatExpansionModule,
    ReactiveFormsModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatButtonModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule,
    MatToolbarModule,
    MatSnackBarModule,
    MatGridListModule,
    IqbComponentsModule,
    MatCardModule,
    FlexLayoutModule,
    IqbFilesModule,
    AlertModule
  ],
  exports: [
    WorkspaceComponent
  ],
  declarations: [
    WorkspaceComponent,
    FilesComponent,
    ResultsComponent,
    SyscheckComponent
  ],
  providers: [
    BackendService,
    WorkspaceDataService
  ]
})

export class WorkspaceModule { }
