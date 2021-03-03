import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { ReactiveFormsModule } from '@angular/forms';
import { MatTooltipModule } from '@angular/material/tooltip';
import { IqbComponentsModule } from 'iqb-components';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatStepperModule } from '@angular/material/stepper';
import { TcSpeedChartComponent } from './network-check/tc-speed-chart.component';
import { SaveReportComponent } from './report/save-report/save-report.component';
import { ReportComponent } from './report/report.component';
import { QuestionnaireComponent } from './questionnaire/questionnaire.component';
import { UnitCheckComponent } from './unit-check/unit-check.component';
import { NetworkCheckComponent } from './network-check/network-check.component';
import { WelcomeComponent } from './welcome/welcome.component';
import { SysCheckComponent } from './sys-check.component';
import { SysCheckChildCanActivateGuard, SysCheckRoutingModule } from './sys-check-routing.module';
import { BackendService } from './backend.service';
import { SysCheckDataService } from './sys-check-data.service';

@NgModule({
  imports: [
    CommonModule,
    FlexLayoutModule,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatDialogModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatListModule,
    MatProgressSpinnerModule,
    MatRadioModule,
    MatSelectModule,
    MatSnackBarModule,
    MatStepperModule,
    MatTooltipModule,
    ReactiveFormsModule,
    SysCheckRoutingModule,
    IqbComponentsModule.forChild()
  ],
  declarations: [
    SysCheckComponent,
    WelcomeComponent,
    NetworkCheckComponent,
    UnitCheckComponent,
    QuestionnaireComponent,
    ReportComponent,
    SaveReportComponent,
    TcSpeedChartComponent
  ],
  entryComponents: [
    SaveReportComponent
  ],
  providers: [
    BackendService,
    SysCheckDataService,
    SysCheckChildCanActivateGuard
  ]
})
export class SysCheckModule { }
