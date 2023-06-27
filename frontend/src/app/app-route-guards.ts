// eslint-disable-next-line max-classes-per-file
import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot
} from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { MainDataService } from './shared/shared.module';
import { AuthData } from './app.interfaces';
import { BackendService } from './backend.service';

// TODO put classes in separate files and clean up absurd if-ceptions

@Injectable()
export class RouteDispatcherActivateGuard implements CanActivate {
  constructor(
    private router: Router,
    private mainDataService: MainDataService,
    private backendService: BackendService
  ) { }

  canActivate(): Observable<boolean> | Promise<boolean> | boolean {
    const authData = this.mainDataService.getAuthData();
    if (authData) {
      if (authData.claims) {
        if (authData.claims.workspaceAdmin || authData.claims.superAdmin) {
          this.router.navigate(['/r/admin-starter']);
        } else if (authData.flags.indexOf('codeRequired') >= 0) {
          this.router.navigate(['/r/code-input']);
        } else if (authData.claims.testGroupMonitor) {
          this.router.navigate(['/r/monitor-starter']);
        } else if (authData.claims.test) {
          if (
            authData.claims.test.length === 1 &&
            Object.keys(authData.claims).length === 1 &&
            this.router.getCurrentNavigation().previousNavigation === null
          ) {
            this.backendService.startTest(authData.claims.test[0].id).subscribe(testId => {
              this.router.navigate(['/t', testId]);
            });
          } else {
            this.router.navigate(['/r/test-starter'], this.router.getCurrentNavigation().extras);
          }
        } else {
          this.router.navigate(['/r/login', '']);
        }
      } else {
        this.router.navigate(['/r/login', '']);
      }
    } else {
      this.router.navigate(['/r/login', '']);
    }

    return false;
  }
}

@Injectable()
export class DirectLoginActivateGuard implements CanActivate {
  constructor(
    private mds: MainDataService,
    private bs: BackendService,
    private router: Router
  ) {
  }

  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | boolean {
    const name = state.url.substr(1);
    if (name.length > 0 && name.indexOf('/') < 0) {
      return this.bs.login('login', name)
        .pipe(
          map((authDataResponse: AuthData) => {
            this.mds.setAuthData(authDataResponse as AuthData);
            this.router.navigate(['/r']);
            return false;
          })
        );
    }
    return true;
  }
}

@Injectable({
  providedIn: 'root'
})
export class CodeInputComponentActivateGuard implements CanActivate {
  constructor(
    private router: Router,
    private mainDataService: MainDataService
  ) { }

  canActivate(): Observable<boolean> | Promise<boolean> | boolean {
    const authData = this.mainDataService.getAuthData();
    if (authData) {
      if (authData.flags) {
        if (authData.flags.indexOf('codeRequired') >= 0) {
          return true;
        }
        this.router.navigate(['/r']);
        return false;
      }
      this.router.navigate(['/r']);
      return false;
    }
    this.router.navigate(['/r']);
    return false;
  }
}

@Injectable({
  providedIn: 'root'
})
export class AdminComponentActivateGuard implements CanActivate {
  constructor(
    private router: Router,
    private mainDataService: MainDataService
  ) { }

  canActivate(): Observable<boolean> | Promise<boolean> | boolean {
    const authData = this.mainDataService.getAuthData();
    if (authData) {
      if (authData.claims) {
        if (authData.claims.workspaceAdmin) {
          return true;
        }
        this.router.navigate(['/r']);
        return false;
      }
      this.router.navigate(['/r']);
      return false;
    }
    this.router.navigate(['/r']);
    return false;
  }
}

@Injectable({
  providedIn: 'root'
})
export class AdminOrSuperAdminComponentActivateGuard implements CanActivate {
  constructor(
    private router: Router,
    private mainDataService: MainDataService
  ) { }

  canActivate(): Observable<boolean> | Promise<boolean> | boolean {
    const authData = this.mainDataService.getAuthData();
    if (authData) {
      if (authData.claims) {
        if (authData.claims.workspaceAdmin || authData.claims.superAdmin) {
          return true;
        }
        this.router.navigate(['/r']);
        return false;
      }
      this.router.navigate(['/r']);
      return false;
    }
    this.router.navigate(['/r']);
    return false;
  }
}

@Injectable({
  providedIn: 'root'
})
export class SuperAdminComponentActivateGuard implements CanActivate {
  constructor(
    private router: Router,
    private mainDataService: MainDataService
  ) { }

  canActivate(): Observable<boolean> | Promise<boolean> | boolean {
    const authData = this.mainDataService.getAuthData();
    if (authData) {
      if (authData.claims) {
        if (authData.claims.superAdmin) {
          return true;
        }
        this.router.navigate(['/r']);
        return false;
      }
      this.router.navigate(['/r']);
      return false;
    }
    this.router.navigate(['/r']);
    return false;
  }
}

@Injectable({
  providedIn: 'root'
})
export class TestComponentActivateGuard implements CanActivate {
  constructor(
    private router: Router,
    private mainDataService: MainDataService
  ) { }

  canActivate(): Observable<boolean> | Promise<boolean> | boolean {
    const authData = this.mainDataService.getAuthData();
    if (authData) {
      if (authData.claims) {
        if (authData.claims.test) {
          return true;
        }
        this.router.navigate(['/r']);
        return false;
      }
      this.router.navigate(['/r']);
      return false;
    }
    this.router.navigate(['/r']);
    return false;
  }
}

@Injectable({
  providedIn: 'root'
})
export class GroupMonitorActivateGuard implements CanActivate {
  constructor(
    private router: Router,
    private mainDataService: MainDataService
  ) {}

  canActivate(): boolean {
    const authData = this.mainDataService.getAuthData();

    if (authData && authData.claims && authData.claims.testGroupMonitor) {
      return true;
    }
    this.router.navigate(['/r']);
    return false;
  }
}
