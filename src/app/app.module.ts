import { AboutComponent } from './about/about.component';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgModule, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

import { MatButtonModule, MatCheckboxModule, MatMenuModule, MatTooltipModule,
  MatToolbarModule, MatIconModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatTabsModule } from '@angular/material';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

import { TestControllerModule } from './test-controller';
import { IqbCommonModule } from './iqb-common';
import { BackendService } from './backend.service';
import { StartComponent } from './start/start.component';
import { LocationStrategy, HashLocationStrategy } from '@angular/common';
import { FlexLayoutModule } from '@angular/flex-layout';
import { ErrormsgComponent } from './errormsg/errormsg.component';

@NgModule({
  declarations: [
    AppComponent,
    StartComponent,
    AboutComponent,
    ErrormsgComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatMenuModule,
    MatToolbarModule,
    MatIconModule,
    MatInputModule,
    MatTooltipModule,
    MatDialogModule,
    MatTabsModule,
    FlexLayoutModule,
    ReactiveFormsModule,
    HttpClientModule,
    TestControllerModule,
    AppRoutingModule,
    IqbCommonModule
  ],
  providers: [
    BackendService,
    {
      provide: LocationStrategy,
      useClass: HashLocationStrategy
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
