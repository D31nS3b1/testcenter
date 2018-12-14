import { TestControllerComponent } from './test-controller';
import { AboutComponent } from './about/about.component';
import { StartComponent } from './start/start.component';
import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';


const routes: Routes = [
  {path: '', component: StartComponent, pathMatch: 'full'},
  {path: 'start', component: StartComponent},
  {path: 'about', component: AboutComponent},
  {path: 'check', loadChildren: './sys-check/sys-check.module#SysCheckModule'},
  {path: 't', component: TestControllerComponent}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
