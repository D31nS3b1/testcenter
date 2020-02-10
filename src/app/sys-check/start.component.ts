import { SyscheckDataService } from './syscheck-data.service';
import { Router, ActivatedRoute } from '@angular/router';
import { BackendService } from './backend.service';
import { Component, OnInit } from '@angular/core';
import {CheckConfig} from "./sys-check.interfaces";



@Component({
  templateUrl: './start.component.html',
  styleUrls: ['./start.component.css']
})

export class StartComponent implements OnInit {
  checkConfigList: CheckConfig[] = [];
  public dataLoading = false;

  constructor(
    private bs: BackendService,
    private ds: SyscheckDataService,
    private route: ActivatedRoute,
    private router: Router) { }

  ngOnInit() {
    this.dataLoading = true;
    this.bs.getCheckConfigs().subscribe(myConfigs => {
      this.checkConfigList = myConfigs;
      this.dataLoading = false;
    });
  }

  // # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #
  buttonStartCheck(c: CheckConfig) {
    this.router.navigate(['../run/' + c.id], {relativeTo: this.route});
  }
  goBack() {
    this.router.navigate(['/']);
  }
}
